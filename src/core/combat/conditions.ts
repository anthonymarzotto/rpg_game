import { ConditionType } from '../types/ability';
import { ActiveCondition, CombatState, CombatUnit } from './types';

export interface ConditionAttackRollModifier {
  readonly advantage?: boolean;
  readonly disadvantage?: boolean;
  readonly attackRollBonus?: number;
  readonly attackRollPenalty?: number;
  readonly description?: string;
}

export interface ConditionDefinition {
  readonly type: ConditionType;
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
}

export const CONDITION_REGISTRY: Readonly<Record<ConditionType, ConditionDefinition>> = {
  CHALLENGED: {
    type: 'CHALLENGED',
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
    onOutgoingAttackRoll: () => ({
      advantage: true,
      description: 'Stealth (Advantage)'
    })
  },
  POISON: {
    type: 'POISON'
  },
  BURN: {
    type: 'BURN'
  }
};

export function getConditionDefinition(type: ConditionType): ConditionDefinition | undefined {
  return CONDITION_REGISTRY[type];
}
