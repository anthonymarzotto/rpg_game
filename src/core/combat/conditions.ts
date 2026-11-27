import { Ability, ConditionType, DamageType } from '../types/ability';
import { Faction } from '../types/unit';
import { ActiveCondition, CombatState, CombatUnit, ModifiableCombatStat } from './types';
import { getCombatArc, hexDistance, HexCoord, HexDirection } from '../grid/hex';
import { combatLogger } from './combatLogger';

/**
 * Returns a combat unit's permanent base faction before any temporary CHARMED allegiance flip.
 */
export function getOriginalFaction(cu: CombatUnit): Faction | undefined {
  return cu.originalFaction ?? cu.unit.faction ?? cu.faction;
}

/**
 * Restores a combat unit's faction to its original base faction when CHARMED is no longer active.
 */
export function restoreOriginalFactionIfUncharmed(cu: CombatUnit): void {
  if (!cu.activeConditions?.some((c) => c.type === 'CHARMED')) {
    const orig = cu.originalFaction ?? cu.unit.faction;
    if (orig !== undefined) {
      cu.faction = orig;
    }
  }
}

export type StackingPolicy = 'OVERRIDE_SOURCE' | 'STACK_INTENSITY' | 'REFRESH_DURATION' | 'IGNORE';

export interface TurnStartConditionResult {
  readonly damage?: number;
  readonly damageType?: DamageType;
}

export interface AfterActionResult {
  readonly removeCondition?: boolean;
  readonly applyConditions?: readonly {
    readonly targetUnitId: string;
    readonly conditionType: ConditionType;
    readonly durationTurns: number;
    readonly sourceUnitId?: string;
  }[];
}

export interface DamageConditionContext {
  readonly damageAmount: number;
  readonly damageType: 'PHYSICAL' | 'MAGICAL' | 'TRUE';
  readonly reason?: string;
  readonly sourceUnitId?: string;
}

export interface DamageReactionResult {
  readonly removeCondition?: boolean;
}

export interface ConditionAttackRollModifier {
  readonly advantage?: boolean;
  readonly disadvantage?: boolean;
  readonly attackRollBonus?: number;
  readonly attackRollPenalty?: number;
  readonly description?: string;
}

export type ConditionTickTiming = 'TURN_START' | 'TURN_END' | 'NEVER';

export interface ConditionDefinition {
  readonly type: ConditionType;
  readonly stackingPolicy: StackingPolicy;
  readonly tickTiming?: ConditionTickTiming;
  readonly defaultIntensity?: number;
  readonly maxIntensity?: number;
  /** Declarative stat deltas active while the condition is on a unit */
  readonly statModifiers?: Partial<Record<ModifiableCombatStat, number>>;
  /** Whether this condition is removed by negative-status purification (CLEANSE) */
  readonly purgeableByCleanse?: boolean;
  /** Whether this condition is purged from all living units when its originating sourceUnitId is defeated */
  readonly clearWhenSourceDefeated?: boolean;
  /** Optional cap on how many living units on the arena may simultaneously hold this condition from the same sourceUnitId */
  readonly maxActivePerSource?: number;
  /** Optional list of conditions on a target that block applying this condition to that target */
  readonly blockedByTargetConditions?: readonly ConditionType[];
  /** Optional follow-up condition automatically applied to the bearer when this condition's duration expires naturally */
  readonly onExpireApplyCondition?: {
    readonly type: ConditionType;
    readonly durationTurns: number;
  };
  /** Optional lifecycle hook invoked whenever the condition expires or is purged */
  readonly onRemoved?: (
    condition: ActiveCondition,
    bearer: CombatUnit,
    state?: CombatState
  ) => void;
  readonly onOutgoingAttackRoll?: (
    condition: ActiveCondition,
    actor: CombatUnit,
    target: CombatUnit,
    state?: CombatState
  ) => ConditionAttackRollModifier | undefined;
  readonly onIncomingAttackRoll?: (
    condition: ActiveCondition,
    attacker: CombatUnit,
    target: CombatUnit,
    state?: CombatState
  ) => ConditionAttackRollModifier | undefined;
  readonly onTurnStart?: (
    condition: ActiveCondition,
    unit: CombatUnit,
    state?: CombatState
  ) => TurnStartConditionResult | undefined;
  readonly canBeTargeted?: (
    condition: ActiveCondition,
    actor: CombatUnit,
    target: CombatUnit,
    ability?: Ability
  ) => boolean;
  readonly onAfterAction?: (
    condition: ActiveCondition,
    actor: CombatUnit,
    action: {
      type: 'ATTACK';
      ability: Ability;
      target?: CombatUnit;
      secondaryTargets?: readonly CombatUnit[];
      targetedUnitIds?: readonly string[];
    },
    result?: unknown
  ) => AfterActionResult | undefined;
  readonly onTakeDamage?: (
    condition: ActiveCondition,
    bearer: CombatUnit,
    context: DamageConditionContext,
    state?: CombatState
  ) => DamageReactionResult | undefined;
}

export const CONDITION_REGISTRY: Readonly<Record<ConditionType, ConditionDefinition>> = {
  CHALLENGED: {
    type: 'CHALLENGED',
    stackingPolicy: 'OVERRIDE_SOURCE',
    tickTiming: 'TURN_START',
    purgeableByCleanse: true,
    clearWhenSourceDefeated: true,
    onOutgoingAttackRoll: (condition, _actor, target) => {
      // Disadvantage applies when attacking any target other than the challenger
      if (condition.sourceUnitId && target.unit.id !== condition.sourceUnitId) {
        return {
          disadvantage: true,
          description: 'Challenged (Disadvantage)'
        };
      }
      return undefined;
    },
    onAfterAction: (condition, actor, action) => {
      if (action.type === 'ATTACK' && condition.sourceUnitId) {
        const targetedIds: string[] = [];
        if (action.targetedUnitIds) {
          targetedIds.push(...action.targetedUnitIds);
        } else {
          if (action.target) targetedIds.push(action.target.unit.id);
          if (action.secondaryTargets) {
            targetedIds.push(...action.secondaryTargets.map((t) => t.unit.id));
          }
        }
        const hitChallenger = targetedIds.includes(condition.sourceUnitId);
        if (!hitChallenger) {
          return {
            applyConditions: [
              {
                targetUnitId: actor.unit.id,
                conditionType: 'EXPOSED',
                durationTurns: 1,
                sourceUnitId: condition.sourceUnitId
              }
            ]
          };
        }
      }
      return undefined;
    }
  },
  STEALTH: {
    type: 'STEALTH',
    stackingPolicy: 'REFRESH_DURATION',
    tickTiming: 'NEVER',
    purgeableByCleanse: false,
    onOutgoingAttackRoll: () => ({
      advantage: true,
      description: 'Stealth (Advantage)'
    }),
    canBeTargeted: (_condition, actor, target) => {
      // Enemies cannot target stealthed units directly; allies still can
      const isFriendly = Boolean(actor.faction && target.faction && actor.faction === target.faction);
      return isFriendly;
    },
    onAfterAction: (_condition, _actor, action) => {
      // Attacking from stealth breaks stealth
      if (action.type === 'ATTACK') {
        return { removeCondition: true };
      }
      return undefined;
    },
    onTakeDamage: (_condition, _bearer, context) => {
      // Turn-start Poison DoT damage does NOT break stealth
      if (context.reason === 'POISON' || context.reason === 'poison') {
        return undefined;
      }
      // Direct attack damage, AoE splash, or Burn damage breaks stealth
      return { removeCondition: true };
    }
  },
  POISON: {
    type: 'POISON',
    stackingPolicy: 'STACK_INTENSITY',
    tickTiming: 'TURN_START',
    purgeableByCleanse: true,
    defaultIntensity: 2,
    maxIntensity: 8,
    onTurnStart: (condition) => ({
      damage: condition.damagePerTurn ?? 2,
      damageType: 'PHYSICAL'
    })
  },
  BURN: {
    type: 'BURN',
    stackingPolicy: 'STACK_INTENSITY',
    tickTiming: 'TURN_START',
    purgeableByCleanse: true,
    defaultIntensity: 2,
    maxIntensity: 8,
    onTurnStart: (condition) => ({
      damage: condition.damagePerTurn ?? 2,
      damageType: 'MAGICAL'
    })
  },
  EXPOSED: {
    type: 'EXPOSED',
    stackingPolicy: 'REFRESH_DURATION',
    tickTiming: 'TURN_START',
    purgeableByCleanse: true,
    onIncomingAttackRoll: () => ({
      advantage: true,
      description: 'Exposed (Advantage)'
    })
  },
  TELEMETRY: {
    type: 'TELEMETRY',
    stackingPolicy: 'REFRESH_DURATION',
    tickTiming: 'TURN_START',
    purgeableByCleanse: true
  },
  CHARMED: {
    type: 'CHARMED',
    stackingPolicy: 'OVERRIDE_SOURCE',
    tickTiming: 'TURN_END',
    purgeableByCleanse: false,
    clearWhenSourceDefeated: true,
    onRemoved: (_condition, bearer) => {
      restoreOriginalFactionIfUncharmed(bearer);
    }
  },
  BLINDED: {
    type: 'BLINDED',
    stackingPolicy: 'REFRESH_DURATION',
    tickTiming: 'TURN_END',
    purgeableByCleanse: true,
    onOutgoingAttackRoll: () => ({
      disadvantage: true,
      description: 'Blinded (Disadvantage)'
    })
  },
  HENOSIS: {
    type: 'HENOSIS',
    stackingPolicy: 'OVERRIDE_SOURCE',
    tickTiming: 'TURN_END',
    purgeableByCleanse: false,
    clearWhenSourceDefeated: true,
    maxActivePerSource: 1,
    blockedByTargetConditions: ['MORTAL_EBB'],
    statModifiers: {
      attackRoll: 2,
      armor: 2,
      ward: 2,
      move: 1,
      speed: 1
    },
    onOutgoingAttackRoll: () => ({
      attackRollBonus: 2,
      description: 'Henosis (+2)'
    }),
    onExpireApplyCondition: {
      type: 'MORTAL_EBB',
      durationTurns: 1
    }
  },
  MORTAL_EBB: {
    type: 'MORTAL_EBB',
    stackingPolicy: 'REFRESH_DURATION',
    tickTiming: 'TURN_END',
    purgeableByCleanse: false,
    statModifiers: {
      attackRoll: -1,
      armor: -1,
      ward: -1,
      move: -1,
      speed: -1
    },
    onOutgoingAttackRoll: () => ({
      attackRollPenalty: 1,
      description: 'Mortal Ebb (-1)'
    })
  }
};

/**
 * Computes the aggregate flat modifier for a given combat stat across all active conditions on a unit.
 */
export function getConditionStatModifier(
  conditions: readonly ActiveCondition[] | undefined,
  stat: ModifiableCombatStat
): number {
  return (conditions ?? []).reduce(
    (sum, c) => sum + (CONDITION_REGISTRY[c.type]?.statModifiers?.[stat] ?? 0),
    0
  );
}

/**
 * Generically ticks active conditions on a unit matching the specified timing phase ('TURN_START' or 'TURN_END').
 * When a condition expires (durationTurns <= 0), removes it, invokes its `onRemoved` lifecycle hook,
 * and applies any declarative `onExpireApplyCondition` follow-up condition.
 */
export function tickUnitConditions(
  cu: CombatUnit,
  phase: 'TURN_START' | 'TURN_END',
  state?: CombatState
): void {
  if (!cu.activeConditions || cu.activeConditions.length === 0) return;

  const snapshot = [...cu.activeConditions];
  const remaining: ActiveCondition[] = [];
  const followUps: { readonly type: ConditionType; readonly durationTurns: number; readonly sourceUnitId: string }[] = [];
  const removedDefs: { readonly def: ConditionDefinition; readonly cond: ActiveCondition }[] = [];

  for (const cond of snapshot) {
    const def = getConditionDefinition(cond.type);
    const timing: ConditionTickTiming = def?.tickTiming ?? 'TURN_START';
    if (timing !== phase) {
      remaining.push(cond);
      continue;
    }

    cond.durationTurns -= 1;
    if (cond.durationTurns > 0) {
      remaining.push(cond);
    } else {
      if (def) {
        removedDefs.push({ def, cond });
        if (def.onExpireApplyCondition) {
          followUps.push({
            type: def.onExpireApplyCondition.type,
            durationTurns: def.onExpireApplyCondition.durationTurns,
            sourceUnitId: cond.sourceUnitId
          });
        }
      }
    }
  }

  cu.activeConditions = remaining;

  for (const { def, cond } of removedDefs) {
    def.onRemoved?.(cond, cu, state);
  }

  for (const followUp of followUps) {
    const existing = cu.activeConditions.find((c) => c.type === followUp.type);
    if (existing) {
      existing.durationTurns = Math.max(existing.durationTurns, followUp.durationTurns);
      existing.sourceUnitId = followUp.sourceUnitId;
    } else {
      cu.activeConditions.push({
        type: followUp.type,
        durationTurns: followUp.durationTurns,
        sourceUnitId: followUp.sourceUnitId
      });
    }
  }
}

/**
 * Returns true if targetCu is marked with Quadrant Telemetry (TELEMETRY)
 * and is hostile to attackerCu (when attackerCu is provided).
 */
export function hasTelemetryMark(targetCu: CombatUnit | undefined, attackerCu?: CombatUnit): boolean {
  if (!targetCu || targetCu.isDefeated) return false;
  if (!targetCu.activeConditions?.some((c) => c.type === 'TELEMETRY')) return false;
  if (attackerCu && attackerCu.faction && targetCu.faction && attackerCu.faction === targetCu.faction) {
    return false;
  }
  return true;
}

export function getConditionDefinition(type: ConditionType): ConditionDefinition | undefined {
  return CONDITION_REGISTRY[type];
}

/**
 * Purges active conditions from all living units when their originating source unit is defeated,
 * for condition definitions configured with `clearWhenSourceDefeated: true`.
 * Invokes `onRemoved` cleanup hooks (without triggering natural-expiration `onExpireApplyCondition`)
 * and records a `CONDITION_BROKEN` combat log entry (`reason: 'source_defeated'`).
 */
export function purgeConditionsFromDefeatedSource(
  state: CombatState,
  defeatedUnitId: string
): void {
  const sourceUnit = state.units.get(defeatedUnitId);
  const sourceName = sourceUnit?.unit.name ?? defeatedUnitId;

  for (const cu of state.units.values()) {
    if (cu.isDefeated || !cu.activeConditions || cu.activeConditions.length === 0) {
      continue;
    }

    const removed: { readonly def: ConditionDefinition; readonly cond: ActiveCondition }[] = [];
    const remaining: ActiveCondition[] = [];

    for (const cond of cu.activeConditions) {
      const def = getConditionDefinition(cond.type);
      if (def?.clearWhenSourceDefeated && cond.sourceUnitId === defeatedUnitId) {
        removed.push({ def, cond });
      } else {
        remaining.push(cond);
      }
    }

    if (removed.length === 0) continue;

    cu.activeConditions = remaining;
    for (const { def, cond } of removed) {
      def.onRemoved?.(cond, cu, state);
      combatLogger.logConditionBroken(state, {
        cu,
        condition: cond.type,
        reason: 'source_defeated',
        actionId: 'condition_removed',
        text: `${sourceName} yielded — ${cond.type} cleared from ${cu.unit.name}!`,
        message: `${sourceName} yielded — ${cond.type} cleared from ${cu.unit.name}!`
      });
    }
  }
}

/**
 * Evaluates whether any opposing stealthed units at distance 1 from detectorCoord
 * fall within the detector's 3-hex FRONT combat arc (relative directions 0, 1, 5).
 * When detected, purges STEALTH, preserves the detected unit's facing, and appends a combat log entry.
 * Returns an array of detected unit IDs.
 */
export function evaluateFrontArcDetection(
  state: CombatState,
  detectorUnitId: string,
  detectorCoord: HexCoord,
  detectorFacing: HexDirection,
  context?: 'TURN_START' | 'MOVE'
): string[] {
  const detectorCu = state.units.get(detectorUnitId);
  if (!detectorCu || detectorCu.isDefeated) return [];
  // Blinded units cannot spot adjacent stealthed units in their front arc
  if (detectorCu.activeConditions?.some((c) => c.type === 'BLINDED')) {
    return [];
  }

  const detectedUnitIds: string[] = [];

  for (const [targetId, targetCu] of state.units) {
    if (targetId === detectorUnitId || targetCu.isDefeated) continue;
    // Must be an opposing faction
    if (!targetCu.faction || !detectorCu.faction || targetCu.faction === detectorCu.faction) {
      continue;
    }
    // Must have active STEALTH
    if (!targetCu.activeConditions.some((c) => c.type === 'STEALTH')) {
      continue;
    }
    const targetCoord = state.arena.getUnitPosition(targetId);
    if (!targetCoord) continue;

    const dist = hexDistance(detectorCoord, targetCoord);
    if (dist === 1) {
      const arc = getCombatArc(detectorFacing, detectorCoord, targetCoord);
      if (arc === 'FRONT') {
        // Remove STEALTH
        targetCu.activeConditions = targetCu.activeConditions.filter((c) => c.type !== 'STEALTH');
        detectedUnitIds.push(targetId);

        const prefix = context === 'TURN_START' ? '⚠️ [Turn Start] ' : '⚠️ Spotted! ';
        state.combatLog.push({
          turnNumber: state.turnNumber,
          actorUnitId: detectorUnitId,
          actionId: context === 'TURN_START' ? 'stealth_spotted_turn_start' : 'stealth_spotted',
          message: `${prefix}${detectorCu.unit.name} spotted ${targetCu.unit.name} in their direct field of view! Stealth broken!`,
          metadata: {
            type: 'DETECTION',
            actor: detectorCu.unit.name,
            target: targetCu.unit.name,
            targetUnitId: targetId,
            isTurnStart: context === 'TURN_START'
          }
        });
      }
    }
  }

  return detectedUnitIds;
}
