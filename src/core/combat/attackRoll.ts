import { Ability } from '../types/ability';
import { CombatUnit, HitOutcome } from './types';
import { getEffectiveEvasion, getEffectiveResolve } from './effectiveVitals';
import { DiceRoller, RollAdvantage } from './dice';
import { COMBAT_RESOLUTION_CONFIG } from '../config/balance';

export interface AttackRollOptions {
  readonly advantage?: RollAdvantage;
}

export interface AttackRollResult {
  readonly hitOutcome: HitOutcome;
  readonly d20: number;
  readonly modifier: number;
  readonly totalScore: number;
  readonly targetDefense: number;
}

/**
 * Returns the actor attribute modifier applicable to the ability damage profile.
 */
export function getAbilityModifier(actorCu: CombatUnit, ability: Ability): number {
  const attr = ability.damageProfile?.modifierAttribute;
  return attr ? actorCu.unit.baseAttributes[attr] : 0;
}

/**
 * Returns the actor attribute modifier applicable to the d20 attack roll (To-Hit).
 */
export function getAttackRollModifier(actorCu: CombatUnit, ability: Ability): number {
  const attr = ability.attackModifierAttribute;
  return attr ? actorCu.unit.baseAttributes[attr] : 0;
}

/**
 * Resolves an attack roll comparing d20 + modifier against the target defense score,
 * supporting first-class Advantage/Disadvantage and custom critical thresholds.
 */
export function resolveAttackRoll(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  diceRoller: DiceRoller,
  options?: AttackRollOptions
): AttackRollResult {
  const modifier = getAttackRollModifier(actorCu, ability);
  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);

  let hasAdvantage = options?.advantage === 'ADVANTAGE';
  let hasDisadvantage = options?.advantage === 'DISADVANTAGE';

  // Attacking from STEALTH grants Advantage
  if (actorCu.activeConditions?.some((c) => c.type === 'STEALTH')) {
    hasAdvantage = true;
  }

  // CHALLENGED imposes Disadvantage when attacking anyone other than the challenger
  if (
    actorCu.activeConditions?.some(
      (c) => c.type === 'CHALLENGED' && c.sourceUnitId !== targetCu.unit.id
    )
  ) {
    hasDisadvantage = true;
  }

  const finalAdvantage: RollAdvantage =
    hasAdvantage === hasDisadvantage ? 'NORMAL' : hasAdvantage ? 'ADVANTAGE' : 'DISADVANTAGE';

  const d20 = diceRoller.rollD20(finalAdvantage);
  const totalScore = d20 + modifier;

  const critMargin = COMBAT_RESOLUTION_CONFIG.critThresholdMargin;
  const isCritBoosted = ability.effect?.type === 'CRIT_BOOST';
  const naturalCritThreshold = isCritBoosted ? 19 : 20;

  let hitOutcome: HitOutcome = 'MISS';
  if (d20 >= naturalCritThreshold || totalScore >= targetDefense + critMargin) {
    hitOutcome = 'CRITICAL_HIT';
  } else if (d20 === 1 || totalScore < targetDefense - COMBAT_RESOLUTION_CONFIG.grazeMargin) {
    hitOutcome = 'MISS';
  } else if (totalScore >= targetDefense) {
    hitOutcome = 'SOLID_HIT';
  } else {
    hitOutcome = 'GRAZE';
  }

  return { hitOutcome, d20, modifier, totalScore, targetDefense };
}
