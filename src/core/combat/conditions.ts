import { Ability, ConditionType, DamageType } from '../types/ability';
import { ActiveCondition, CombatState, CombatUnit } from './types';

export type StackingPolicy = 'OVERRIDE_SOURCE' | 'STACK_INTENSITY' | 'REFRESH_DURATION' | 'IGNORE';

export interface TurnStartConditionResult {
  readonly damage?: number;
  readonly damageType?: DamageType;
}

export interface AfterActionResult {
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
