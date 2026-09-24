import { CombatState, CombatUnit } from '../../core/combat/types';
import { DiceRoller, SeededDiceRoller } from '../../core/combat/dice';
import {
  AIAction,
  decideNextAction,
  executeAiAction,
  AIActionResult
} from '../../core/ai';
import { endActiveTurn } from '../../core/combat/turnClock';

export type AISpeedMode = 'NORMAL' | 'FAST' | 'INSTANT';

export interface TurnPacingConfig {
  readonly stepDelayMs: number;
  readonly turnTransitionDelayMs: number;
}

export const PACING_PRESETS: Record<AISpeedMode, TurnPacingConfig> = {
  NORMAL: { stepDelayMs: 600, turnTransitionDelayMs: 400 },
  FAST: { stepDelayMs: 200, turnTransitionDelayMs: 150 },
  INSTANT: { stepDelayMs: 0, turnTransitionDelayMs: 0 }
};

export interface CombatExecutionObserver {
  readonly onTurnTransitionStart?: (actor: CombatUnit) => void;
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

    observer?.onActionStart?.(actor, action, description);

    const result = executeAiAction(state, actorUnitId, action, diceRoller);
    observer?.onActionResolved?.(actor, action, result);

    if (result.type === 'CONSERVE_AP' || state.outcome !== 'IN_PROGRESS') {
      break;
    }

    if (pacing.stepDelayMs > 0) {
      await delayWithAbort(pacing.stepDelayMs, signal);
      if (signal?.aborted) return;
    }
  }

  // 3. Conclude turn and apply CTB recovery
  const unspent = actor.currentAp;
  endActiveTurn(state);
  observer?.onTurnCompleted?.(actor, unspent);
}
