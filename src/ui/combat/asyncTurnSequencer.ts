import { CombatState, CombatUnit } from '../../core/combat/types';
import { DiceRoller, SeededDiceRoller } from '../../core/combat/dice';
import {
  AIAction,
  decideNextAction,
  executeAiAction,
  AIActionResult
} from '../../core/ai';
import { endActiveTurn, calculateTurnTransitionTicks } from '../../core/combat/turnClock';
import { canMove, canExecuteAbility } from '../../core/combat/validator';

export type AISpeedMode = 'NORMAL' | 'FAST' | 'INSTANT';

export interface TurnPacingConfig {
  readonly stepDelayMs: number;
  readonly turnTransitionDelayMs: number;
  readonly clockAdvancementTotalMs?: number;
}

export const PACING_PRESETS: Record<AISpeedMode, TurnPacingConfig> = {
  NORMAL: { stepDelayMs: 600, turnTransitionDelayMs: 400, clockAdvancementTotalMs: 1000 },
  FAST: { stepDelayMs: 200, turnTransitionDelayMs: 150, clockAdvancementTotalMs: 300 },
  INSTANT: { stepDelayMs: 0, turnTransitionDelayMs: 0, clockAdvancementTotalMs: 0 }
};

export interface ClockPacingResult {
  readonly totalDurationMs: number;
  readonly stepIntervalMs: number;
}

/**
 * Calculates the visual CTB clock advancement pacing.
 * When ticks > 0:
 * - NORMAL: ~1000ms duration, interval = Math.max(50, Math.floor(1000 / ticks))
 * - FAST: ~300ms duration, interval = Math.max(25, Math.floor(300 / ticks))
 * - INSTANT: 0ms duration, interval = 0
 * When ticks === 0: 0ms duration (immediate transition).
 */
export function calculateClockPacing(
  ticks: number,
  speed: AISpeedMode
): ClockPacingResult {
  if (ticks <= 0 || speed === 'INSTANT') {
    return { totalDurationMs: 0, stepIntervalMs: 0 };
  }

  const totalDurationMs = speed === 'FAST' ? 300 : 1000;
  const minInterval = speed === 'FAST' ? 25 : 50;
  const stepIntervalMs = Math.max(minInterval, Math.floor(totalDurationMs / ticks));

  return { totalDurationMs, stepIntervalMs };
}

export interface CombatExecutionObserver {
  readonly onTurnTransitionStart?: (actor: CombatUnit) => void;
  readonly onClockAdvancing?: (ticks: number, stepIntervalMs: number) => void;
  readonly onActionStart?: (
    actor: CombatUnit,
    action: AIAction,
    description: string
  ) => void;
  readonly onActionResolved?: (
    actor: CombatUnit,
    action: AIAction,
    result: AIActionResult
  ) => void;
  readonly onActionFault?: (
    actor: CombatUnit,
    action: AIAction,
    reason: string
  ) => void;
  readonly onTurnCompleted?: (actor: CombatUnit, unspentAp: number) => void;
}

/**
 * Generates an intuitive, readable description of an AI action for UI feedback.
 */
export function formatActionDescription(
  state: CombatState,
  actor: CombatUnit,
  action: AIAction
): string {
  const actorName = actor.unit.name.split(' ')[0];

  if (action.type === 'MOVE') {
    return `${actorName} moves to (${action.destination.q}, ${action.destination.r})`;
  }

  if (action.type === 'ABILITY') {
    const targetUnitId = action.target.targetUnitId;
    if (targetUnitId) {
      const targetCu = state.units.get(targetUnitId);
      const targetName = targetCu?.unit.name ?? 'target';
      return `${actorName} uses ${action.ability.name} on ${targetName}`;
    }
    if (action.target.coord) {
      return `${actorName} casts ${action.ability.name} at (${action.target.coord.q}, ${action.target.coord.r})`;
    }
    return `${actorName} uses ${action.ability.name}`;
  }

  const unspent = actor.currentAp;
  return `${actorName} banks ${unspent} AP (+${unspent * 20} CTB)`;
}

/**
 * Cancellable async delay helper using standard AbortSignal.
 */
export function delayWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || signal?.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onAbort = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve();
    };

    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Headless asynchronous hostile turn sequencer.
 * Steps through AI decision evaluation, action resolution, and turn pacing.
 */
export async function executeHostileTurnAsync(
  state: CombatState,
  actorUnitId: string,
  pacing: TurnPacingConfig = PACING_PRESETS.NORMAL,
  observer?: CombatExecutionObserver,
  signal?: AbortSignal,
  diceRoller: DiceRoller = new SeededDiceRoller()
): Promise<void> {
  if (signal?.aborted) return;

  const actor = state.units.get(actorUnitId);
  if (
    !actor ||
    actor.isDefeated ||
    state.activeUnitId !== actorUnitId ||
    state.outcome !== 'IN_PROGRESS'
  ) {
    return;
  }

  try {
    // 1. Initial turn transition buffer
    observer?.onTurnTransitionStart?.(actor);
    if (pacing.turnTransitionDelayMs > 0) {
      await delayWithAbort(pacing.turnTransitionDelayMs, signal);
      if (signal?.aborted) return;
    }

    // 2. Action loop
    let steps = 0;
    const maxSteps = 10;

    while (
      steps < maxSteps &&
      !signal?.aborted &&
      actor.currentAp > 0 &&
      state.activeUnitId === actorUnitId &&
      state.outcome === 'IN_PROGRESS' &&
      !actor.isDefeated
    ) {
      steps++;

      const action = decideNextAction(state, actorUnitId, { diceRoller });
      const description = formatActionDescription(state, actor, action);

      if (!state.aiDecisionLog) {
        state.aiDecisionLog = [];
      }
      const decisionLog = state.aiDecisionLog;
      const lastTrace = decisionLog[decisionLog.length - 1];
      if (!lastTrace || lastTrace.chosenAction !== action) {
        decisionLog.push({
          turnNumber: state.turnNumber,
          actorUnitId,
          actorName: actor.unit.name,
          profile: 'BRAWLER',
          weights: {
            killBonus: 20,
            expectedDamageWeight: 1.5,
            vulnerabilityWeight: 2,
            flankWeight: 3,
            standoffWeight: 2,
            preferredStandoffRange: 1,
            focusFireWeight: 4,
            apConservationThreshold: 5
          },
          currentAp: actor.currentAp,
          chosenAction: action,
          topCandidates: [{ type: action.type, action, score: action.score, reason: action.reason, rank: 1 }],
          totalCandidatesEvaluated: 1,
          apConservationThreshold: 5,
          timestamp: Date.now()
        });
      }

      // Pre-validate proposed actions against authoritative engine rules
      let validationReason: string | undefined;
      if (action.type === 'MOVE') {
        const validation = canMove(state, actorUnitId, action.destination);
        if (!validation.valid) {
          validationReason = validation.reason ?? 'Invalid move destination';
        }
      } else if (action.type === 'ABILITY') {
        const validation = canExecuteAbility(state, actorUnitId, action.ability, {
          coord: action.target.coord,
          targetUnitId: action.target.targetUnitId
        });
        if (!validation.valid) {
          validationReason = validation.reason ?? 'Invalid ability execution';
        }
      }

      if (validationReason) {
        const actionName =
          action.type === 'MOVE'
            ? `Move to (${action.destination.q}, ${action.destination.r})`
            : action.type === 'ABILITY'
            ? action.ability.name
            : 'Action';

        if (state.aiDecisionLog && state.aiDecisionLog.length > 0) {
          const lastIdx = state.aiDecisionLog.length - 1;
          (state.aiDecisionLog as any[])[lastIdx] = {
            ...state.aiDecisionLog[lastIdx],
            faultReason: validationReason
          };
        }

        console.warn(`[AI Fault] ${actor.unit.name} failed ${actionName}: ${validationReason}`);
        state.combatLog.push({
          turnNumber: state.turnNumber,
          actorUnitId: actor.unit.id,
          actionId: 'ai_fault',
          message: `⚠️ [AI Fault] ${actor.unit.name} could not execute ${actionName}: ${validationReason}. Conserving remaining AP.`,
          metadata: {
            type: 'GENERIC',
            actor: actor.unit.name,
            text: `⚠️ [AI Fault] ${actionName}: ${validationReason}`
          }
        });
        observer?.onActionFault?.(actor, action, validationReason);
        break;
      }

      observer?.onActionStart?.(actor, action, description);


      let result: AIActionResult;
      try {
        result = executeAiAction(state, actorUnitId, action, diceRoller);
      } catch (err: unknown) {
        const errorReason = err instanceof Error ? err.message : String(err);
        if (state.aiDecisionLog && state.aiDecisionLog.length > 0) {
          const lastIdx = state.aiDecisionLog.length - 1;
          (state.aiDecisionLog as any[])[lastIdx] = {
            ...state.aiDecisionLog[lastIdx],
            faultReason: errorReason
          };
        }

        const actionName =
          action.type === 'MOVE'
            ? `Move to (${action.destination.q}, ${action.destination.r})`
            : action.type === 'ABILITY'
            ? action.ability.name
            : 'Action';

        console.warn(`[AI Fault] ${actor.unit.name} threw error on ${actionName}: ${errorReason}`);
        state.combatLog.push({
          turnNumber: state.turnNumber,
          actorUnitId: actor.unit.id,
          actionId: 'ai_fault',
          message: `⚠️ [AI Fault] ${actor.unit.name} error executing ${actionName}: ${errorReason}. Conserving remaining AP.`,
          metadata: {
            type: 'GENERIC',
            actor: actor.unit.name,
            text: `⚠️ [AI Fault] ${actionName}: ${errorReason}`
          }
        });
        observer?.onActionFault?.(actor, action, errorReason);
        break;
      }


      observer?.onActionResolved?.(actor, action, result);

      if (result.type === 'CONSERVE_AP' || state.outcome !== 'IN_PROGRESS') {
        break;
      }

      if (pacing.stepDelayMs > 0) {
        await delayWithAbort(pacing.stepDelayMs, signal);
        if (signal?.aborted) return;
      }
    }
  } catch (unexpectedErr: unknown) {
    console.error(`[AI Turn Sequencer] Unexpected error during turn for ${actor.unit.name}:`, unexpectedErr);
    state.combatLog.push({
      turnNumber: state.turnNumber,
      actorUnitId: actor.unit.id,
      actionId: 'ai_fault',
      message: `⚠️ [AI Fault] Turn halted due to unexpected error: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}. Conserving AP.`,
      metadata: {
        type: 'GENERIC',
        actor: actor.unit.name,
        text: `⚠️ [AI Fault] Unexpected turn error`
      }
    });
  } finally {
    // 3. Conclude turn and apply CTB recovery if turn is still active
    if (
      !signal?.aborted &&
      state.activeUnitId === actorUnitId &&
      state.outcome === 'IN_PROGRESS'
    ) {
      const unspent = actor.currentAp;
      const ticks = calculateTurnTransitionTicks(state, actorUnitId, unspent);
      const speedMode: AISpeedMode =
        pacing.clockAdvancementTotalMs !== undefined
          ? pacing.clockAdvancementTotalMs === 0
            ? 'INSTANT'
            : pacing.clockAdvancementTotalMs <= 300
            ? 'FAST'
            : 'NORMAL'
          : pacing.stepDelayMs === 0
          ? 'INSTANT'
          : pacing.stepDelayMs <= 200
          ? 'FAST'
          : 'NORMAL';

      const clockPacing = calculateClockPacing(ticks, speedMode);
      if (clockPacing.totalDurationMs > 0) {
        observer?.onClockAdvancing?.(ticks, clockPacing.stepIntervalMs);
        await delayWithAbort(clockPacing.totalDurationMs, signal);
      }
      endActiveTurn(state);
      observer?.onTurnCompleted?.(actor, unspent);
    }
  }
}
