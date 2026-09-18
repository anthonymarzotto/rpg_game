import { Ability, DiceProfile } from '../types/ability';
import { CombatUnit, HitOutcome } from './types';
import { getEffectiveArmor, getEffectiveWard } from './effectiveVitals';
import { DiceRoller } from './dice';
import { getAbilityModifier } from './attackRoll';
import { COMBAT_RESOLUTION_CONFIG } from '../config/balance';

export interface DamageResult {
  readonly rawDamage: number;
  readonly mitigation: number;
  readonly damageDealt: number;
  readonly damageBreakdown: string;
}

/**
 * Calculates raw attack damage, mitigation soak, graze scaling, minimum damage,
 * and a human-readable formula breakdown. Supports optional bonus dice profiles
 * (e.g. conditional Sneak Attack damage).
 */
export function resolveDamage(
  hitOutcome: HitOutcome,
  ability: Ability,
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  diceRoller: DiceRoller,
  bonusDamage?: DiceProfile
): DamageResult {
  if (hitOutcome === 'MISS' || !ability.damageProfile) {
    return {
      rawDamage: 0,
      mitigation: 0,
      damageDealt: 0,
      damageBreakdown: hitOutcome === 'MISS' ? '0 (Miss)' : '0'
    };
  }

  const { count, sides } = ability.damageProfile;
  const modifier = getAbilityModifier(actorCu, ability);
  let rolledDice = diceRoller.rollDice(count, sides);
  let maximizedVal = count * sides;
  let formulaPrefix = `${count}d${sides}`;

  if (bonusDamage && bonusDamage.count > 0 && bonusDamage.sides > 0) {
    const bonusRoll = diceRoller.rollDice(bonusDamage.count, bonusDamage.sides);
    rolledDice += bonusRoll;
    maximizedVal += bonusDamage.count * bonusDamage.sides;
    formulaPrefix += `+${bonusDamage.count}d${bonusDamage.sides}`;
  }

  const isCrit = hitOutcome === 'CRITICAL_HIT';
  const isGraze = hitOutcome === 'GRAZE';

  // Maximized Crit: max base dice + rolled dice + modifier
  const rawDamage = isCrit
    ? maximizedVal + rolledDice + modifier
    : rolledDice + modifier;

  const mitigationType = ability.damageType === 'PHYSICAL' ? 'Armor' : 'Ward';
  const mitigation =
    ability.damageType === 'PHYSICAL'
      ? getEffectiveArmor(targetCu)
      : getEffectiveWard(targetCu);

  let subtotal = rawDamage - mitigation;
  let modifierSuffix = '';

  if (isGraze) {
    subtotal = Math.floor(subtotal * COMBAT_RESOLUTION_CONFIG.grazeDamageMultiplier);
    modifierSuffix = ' (x0.5 Graze)';
  }

  let damageDealt = subtotal;
  if (damageDealt < COMBAT_RESOLUTION_CONFIG.minimumDamage) {
    damageDealt = COMBAT_RESOLUTION_CONFIG.minimumDamage;
    modifierSuffix += ' (min 1)';
  }

  // e.g. 1d4+1d6(8)+1 - 2 Armor -> 7
  const rollDetails = isCrit ? `max ${maximizedVal}+${rolledDice}` : `${rolledDice}`;
  const modSign = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  const damageBreakdown = `${formulaPrefix}(${rollDetails})${modSign} - ${mitigation} ${mitigationType}${modifierSuffix} -> ${damageDealt}`;

  return { rawDamage, mitigation, damageDealt, damageBreakdown };
}
