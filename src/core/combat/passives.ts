import { PassiveTrait } from '../types/passive';
import { ModifiableCombatStat, CombatUnit } from './types';

/**
 * Result of evaluating passive roll modifiers before an attack roll.
 */
export interface PassiveRollEvaluation {
  readonly grantsAdvantage: boolean;
}

/**
 * Computes the aggregate flat modifier for a given combat stat across all equipped passives.
 */
export function getPassiveStatModifier(
  passives: readonly PassiveTrait[] | undefined,
  stat: ModifiableCombatStat
): number {
  return (passives ?? []).reduce((sum, p) => sum + (p.statModifiers?.[stat] ?? 0), 0);
}

/**
 * Evaluates active passive roll modifiers prior to an attack roll.
 * Applies conditions (e.g. Momentum distance check) and consumes trigger charges where configured.
 */
export function evaluateRollPassives(actorCu: CombatUnit): PassiveRollEvaluation {
  let grantsAdvantage = false;

  for (const passive of actorCu.passives ?? []) {
    const rm = passive.rollModifier;
    if (!rm) continue;

    let conditionMet = false;
    if (rm.condition.type === 'MOVED_MIN_DISTANCE') {
      conditionMet = (actorCu.hexesMovedThisTurn ?? 0) >= rm.condition.minHexes;
    }

    if (conditionMet) {
      if (rm.effect.grantsAdvantage) {
        grantsAdvantage = true;
      }
      if (rm.effect.consumeOnTrigger) {
        if (rm.condition.type === 'MOVED_MIN_DISTANCE') {
          actorCu.hexesMovedThisTurn = 0;
        }
      }
    }
  }

  return { grantsAdvantage };
}

/**
 * Turn lifecycle hook invoked when a unit becomes active.
 * Resets turn-scoped passive states and counters.
 */
export function onTurnStartPassives(cu: CombatUnit): void {
  cu.hexesMovedThisTurn = 0;
  cu.abilitiesUsedThisTurn = undefined;
}
