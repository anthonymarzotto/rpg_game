import { Ability } from '../types/ability';
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
 * and a human-readable formula breakdown.
 */
export function resolveDamage(
  hitOutcome: HitOutcome,
  ability: Ability,
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  diceRoller: DiceRoller
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
  const rolledDice = diceRoller.rollDice(count, sides);
  const isCrit = hitOutcome === 'CRITICAL_HIT';
  const isGraze = hitOutcome === 'GRAZE';

  // Maximized Crit: max base dice + rolled dice + modifier
  const maximizedVal = count * sides;
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

  // e.g. 1d6(4)+0 - 2 Armor -> 2 or crit: 1d6(max 6+4)+0 - 2 Armor -> 8
  const diceFormula = `${count}d${sides}`;
  const rollDetails = isCrit ? `max ${maximizedVal}+${rolledDice}` : `${rolledDice}`;
  const modSign = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  const damageBreakdown = `${diceFormula}(${rollDetails})${modSign} - ${mitigation} ${mitigationType}${modifierSuffix} -> ${damageDealt}`;

  return { rawDamage, mitigation, damageDealt, damageBreakdown };
}
