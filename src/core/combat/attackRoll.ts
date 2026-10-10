import { Ability } from '../types/ability';
import { EffectiveAbility } from '../types/modifier';
import { CombatUnit, HitOutcome } from './types';
import { getEffectiveEvasion, getEffectiveResolve } from './effectiveVitals';
import { DiceRoller, RollAdvantage } from './dice';
import { COMBAT_RESOLUTION_CONFIG } from '../config/balance';

export interface AttackRollOptions {
  readonly advantage?: RollAdvantage;
  readonly rollBonus?: number;
  readonly rollPenalty?: number;
  readonly elevationDelta?: number;
}

export interface ElevationAttackModifierResult {
  readonly rollBonus: number;
  readonly rollPenalty: number;
  readonly grantsAdvantage: boolean;
  readonly grantsDisadvantage: boolean;
  readonly description?: string;
}

/**
 * Calculates vertical attack roll bonuses, penalties, Advantage, or Disadvantage
 * based on the elevation difference (actorElevation - targetElevation).
 * Supports traits and ability properties that suppress upward penalties.
 */
export function calculateElevationAttackModifier(
  actorCu: CombatUnit,
  elevationDelta: number,
  ability: Ability
): ElevationAttackModifierResult {
  const base: ElevationAttackModifierResult = {
    rollBonus: 0,
    rollPenalty: 0,
    grantsAdvantage: false,
    grantsDisadvantage: false
  };

  const ignoresPenalty =
    ability.ignoresElevationPenalty ||
    actorCu.passives?.some((p) => p.ignoresElevationPenalty);

  if (elevationDelta === 1) {
    return { ...base, rollBonus: 2, description: 'High Ground (+2)' };
  }
  if (elevationDelta >= 2) {
    return { ...base, grantsAdvantage: true, description: 'High Ground (Advantage)' };
  }
  if (elevationDelta === -1) {
    return ignoresPenalty
      ? { ...base, description: 'Low Ground Penalty Negated' }
      : { ...base, rollPenalty: 2, description: 'Low Ground (-2)' };
  }
  if (elevationDelta <= -2) {
    return ignoresPenalty
      ? { ...base, description: 'Low Ground Disadvantage Negated' }
      : { ...base, grantsDisadvantage: true, description: 'Low Ground (Disadvantage)' };
  }

  return base;
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
  const damageEffect = ability.effects?.find((e) => e.type === 'DAMAGE');
  const attr = damageEffect?.damageProfile?.modifierAttribute;
  return attr ? actorCu.unit.baseAttributes[attr] : 0;
}

/**
 * Returns the actor attribute modifier applicable to the d20 attack roll (To-Hit).
 */
export function getAttackRollModifier(actorCu: CombatUnit, ability: Ability): number {
  const attr = ability.attackModifierAttribute;
  const baseAttr = attr ? actorCu.unit.baseAttributes[attr] : 0;
  const attackRollBonus = (ability as EffectiveAbility).attackRollBonus ?? 0;
  const activeAttackMod = (actorCu.activeModifiers ?? []).reduce(
    (sum, m) => sum + (m.stat === 'attackRoll' ? m.value : 0),
    0
  );
  return baseAttr + attackRollBonus + activeAttackMod;
}

/**
 * Resolves an attack roll comparing d20 + modifier against the target defense score,
 * supporting first-class Advantage/Disadvantage, elevation modifiers, and custom critical thresholds.
 */
export function resolveAttackRoll(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability: Ability,
  diceRoller: DiceRoller,
  options?: AttackRollOptions
): AttackRollResult {
  const baseModifier = getAttackRollModifier(actorCu, ability);
  let totalBonus = options?.rollBonus ?? 0;
  let totalPenalty = options?.rollPenalty ?? 0;
  let hasAdvantage = options?.advantage === 'ADVANTAGE';
  let hasDisadvantage = options?.advantage === 'DISADVANTAGE';

  if (options?.elevationDelta !== undefined && options.elevationDelta !== 0) {
    const elevMod = calculateElevationAttackModifier(
      actorCu,
      options.elevationDelta,
      ability
    );
    totalBonus += elevMod.rollBonus;
    totalPenalty += elevMod.rollPenalty;
    if (elevMod.grantsAdvantage) hasAdvantage = true;
    if (elevMod.grantsDisadvantage) hasDisadvantage = true;
  }

  const modifier = baseModifier + totalBonus - totalPenalty;
  const targetDefense =
    ability.defenseTarget === 'EVASION'
      ? getEffectiveEvasion(targetCu)
      : getEffectiveResolve(targetCu);

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
  const isCritBoosted = ability.effects?.some((e) => e.type === 'CRIT_BOOST');
  let naturalCritThreshold = isCritBoosted ? 19 : 20;

  // Check health threshold passives (e.g. Deathbound Fury expanding natural crit to 19-20)
  const maxHp = actorCu.unit.effectiveVitals.maxHp;
  if (actorCu.passives && maxHp > 0) {
    for (const passive of actorCu.passives) {
      if (passive.healthThreshold?.critThreshold) {
        const thresholdHp = Math.floor(maxHp * passive.healthThreshold.maxPercent);
        if (actorCu.currentHp <= thresholdHp) {
          if (
            !passive.healthThreshold.damageTypeFilter ||
            passive.healthThreshold.damageTypeFilter === ability.damageType
          ) {
            naturalCritThreshold = Math.min(naturalCritThreshold, passive.healthThreshold.critThreshold);
          }
        }
      }
    }
  }

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
