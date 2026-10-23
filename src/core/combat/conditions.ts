import { Ability, ConditionType, DamageType } from '../types/ability';
import { ActiveCondition, CombatState, CombatUnit } from './types';
import { getCombatArc, hexDistance, HexCoord, HexDirection } from '../grid/hex';

export type StackingPolicy = 'OVERRIDE_SOURCE' | 'STACK_INTENSITY' | 'REFRESH_DURATION' | 'IGNORE';

export interface TurnStartConditionResult {
  readonly damage?: number;
  readonly damageType?: DamageType;
}

export interface AfterActionResult {
  readonly removeCondition?: boolean;
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

export interface ConditionDefinition {
  readonly type: ConditionType;
  readonly stackingPolicy: StackingPolicy;
  readonly defaultIntensity?: number;
  readonly maxIntensity?: number;
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
    action: { type: 'ATTACK'; ability: Ability; target: CombatUnit },
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
    onOutgoingAttackRoll: (condition, _actor, target) => {
      // Disadvantage applies when attacking any target other than the challenger
      if (condition.sourceUnitId && target.unit.id !== condition.sourceUnitId) {
        return {
          disadvantage: true,
          description: 'Challenged (Disadvantage)'
        };
      }
      return undefined;
    }
  },
  STEALTH: {
    type: 'STEALTH',
    stackingPolicy: 'REFRESH_DURATION',
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
    defaultIntensity: 2,
    maxIntensity: 8,
    onTurnStart: (condition) => ({
      damage: condition.damagePerTurn ?? 2,
      damageType: 'MAGICAL'
    })
  }
};

export function getConditionDefinition(type: ConditionType): ConditionDefinition | undefined {
  return CONDITION_REGISTRY[type];
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
