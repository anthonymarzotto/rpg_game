import { Ability, AbilityEffect, DiceProfile } from '../types/ability';
import { CombatUnit, HitOutcome } from './types';
import { getEffectiveArmor, getEffectiveWard } from './effectiveVitals';
import { DiceRoller } from './dice';
import { getAbilityModifier } from './attackRoll';
import { COMBAT_RESOLUTION_CONFIG, DISPLACEMENT_CONFIG } from '../config/balance';

export interface DamageResult {
  readonly rawDamage: number;
  readonly mitigation: number;
  readonly damageDealt: number;
  readonly damageBreakdown: string;
}

/**
 * Calculates raw attack damage, mitigation soak, graze scaling, minimum damage,
 * and a human-readable formula breakdown. Supports optional bonus dice profiles
 * (e.g. conditional Sneak Attack damage) and flat damage bonuses.
 */
export function resolveDamage(
  hitOutcome: HitOutcome,
  ability: Ability,
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  diceRoller: DiceRoller,
  bonusDamage?: DiceProfile,
  damageEffect?: AbilityEffect
): DamageResult {
  const eff = damageEffect ?? ability.effects?.find((e) => e.type === 'DAMAGE');
  const damageProfile = eff?.damageProfile;
  let flatBonus = eff?.flatDamage ?? 0;

  // Check health threshold passives (e.g. Deathbound Fury +2 flat physical damage when <= 50% HP)
  const maxHp = actorCu.unit.effectiveVitals.maxHp;
  if (actorCu.passives && maxHp > 0) {
    for (const passive of actorCu.passives) {
      if (passive.healthThreshold?.flatDamageBonus) {
        const thresholdHp = Math.floor(maxHp * passive.healthThreshold.maxPercent);
        if (actorCu.currentHp <= thresholdHp) {
          if (
            !passive.healthThreshold.damageTypeFilter ||
            passive.healthThreshold.damageTypeFilter === ability.damageType
          ) {
            flatBonus += passive.healthThreshold.flatDamageBonus;
          }
        }
      }
    }
  }

  // Check target armor / force threshold passives (e.g. Highway Toll)
  if (actorCu.passives) {
    const targetArmor = getEffectiveArmor(targetCu);
    const actorForce = actorCu.unit.baseAttributes.force;
    const targetForce = targetCu.unit.baseAttributes.force;

    for (const passive of actorCu.passives) {
      if (passive.targetArmorBonus) {
        if (targetArmor >= passive.targetArmorBonus.minArmor) {
          if (
            !passive.targetArmorBonus.damageTypeFilter ||
            passive.targetArmorBonus.damageTypeFilter === ability.damageType
          ) {
            flatBonus += passive.targetArmorBonus.flatDamageBonus;
          }
        }
      }

      if (passive.targetForceBonus) {
        const meetsCondition = passive.targetForceBonus.requireTargetForceExceedsActor
          ? targetForce > actorForce
          : targetForce >= (passive.targetForceBonus.minForce ?? 1);

        if (meetsCondition) {
          if (
            !passive.targetForceBonus.damageTypeFilter ||
            passive.targetForceBonus.damageTypeFilter === ability.damageType
          ) {
            flatBonus += passive.targetForceBonus.flatDamageBonus;
          }
        }
      }
    }
  }

  if (hitOutcome === 'MISS' || (!damageProfile && flatBonus === 0)) {
    return {
      rawDamage: 0,
      mitigation: 0,
      damageDealt: 0,
      damageBreakdown: hitOutcome === 'MISS' ? '0 (Miss)' : '0'
    };
  }

  const modifier = damageProfile
    ? (damageProfile.modifierAttribute ? (actorCu.unit.baseAttributes[damageProfile.modifierAttribute] ?? 0) : 0)
    : getAbilityModifier(actorCu, ability);
  let rolledDice = 0;
  let maximizedVal = 0;
  let formulaPrefix = '';

  if (damageProfile) {
    const { count, sides } = damageProfile;
    rolledDice = diceRoller.rollDice(count, sides);
    maximizedVal = count * sides;
    formulaPrefix = `${count}d${sides}`;
  }

  if (bonusDamage && bonusDamage.count > 0 && bonusDamage.sides > 0) {
    const bonusRoll = diceRoller.rollDice(bonusDamage.count, bonusDamage.sides);
    rolledDice += bonusRoll;
    maximizedVal += bonusDamage.count * bonusDamage.sides;
    formulaPrefix += `${formulaPrefix ? '+' : ''}${bonusDamage.count}d${bonusDamage.sides}`;
  }

  const isCrit = hitOutcome === 'CRITICAL_HIT';
  const isGraze = hitOutcome === 'GRAZE';

  // Maximized Crit: max base dice + rolled dice + modifier + flatBonus
  const rawDamage = isCrit
    ? maximizedVal + rolledDice + modifier + flatBonus
    : rolledDice + modifier + flatBonus;

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
  const totalMod = modifier + flatBonus;
  const modSign = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
  const damageBreakdown = `${formulaPrefix || '0'}(${rollDetails})${modSign} - ${mitigation} ${mitigationType}${modifierSuffix} -> ${damageDealt}`;

  return { rawDamage, mitigation, damageDealt, damageBreakdown };
}

/**
 * Calculates kinetic collision / wall-slam physical damage.
 * Base wall slam damage + attribute bonus + passive collision bonus - target armor (minimum 1).
 */
export function resolveCollisionDamage(
  actorCu: CombatUnit,
  targetCu: CombatUnit,
  ability?: Ability
): number {
  if (targetCu.passives?.some((p) => p.immuneToCollisionDamage)) {
    return 0;
  }

  const targetArmor = getEffectiveArmor(targetCu);
  const attrKey: 'force' | 'finesse' | 'focus' =
    ability?.attackModifierAttribute ??
    (ability?.archetypeTag === 'MAGE' ? 'focus' : ability?.archetypeTag === 'ROGUE' ? 'finesse' : 'force');
  const attrBonus = actorCu.unit.baseAttributes[attrKey] ?? 0;

  const passiveBonus = (actorCu.passives ?? []).reduce(
    (sum, p) => sum + (p.collisionDamageBonus ?? 0),
    0
  );

  return Math.max(
    1,
    DISPLACEMENT_CONFIG.wallSlamBaseDamage + attrBonus + passiveBonus - targetArmor
  );
}

/**
 * Calculates direct unmitigated fall impact damage.
 * Inspects passive traits or active modifiers for fall damage immunity.
 */
export function resolveFallDamage(
  cu: CombatUnit,
  rawFallDamage: number
): number {
  if (rawFallDamage <= 0) return 0;

  const isImmune = cu.passives?.some((p) => p.immuneToFallDamage);

  if (isImmune) {
    return 0;
  }

  return rawFallDamage;
}

