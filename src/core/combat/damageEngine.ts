import { Ability, AbilityEffect, DiceProfile } from '../types/ability';
import { CombatUnit, HitOutcome, DamageDieRoll, DamageBreakdownComponent } from './types';
import { getEffectiveArmor, getEffectiveWard } from './effectiveVitals';
import { DiceRoller } from './dice';
import { getAbilityModifier } from './attackRoll';
import { COMBAT_RESOLUTION_CONFIG, DISPLACEMENT_CONFIG } from '../config/balance';

export interface DamageResult {
  readonly rawDamage: number;
  readonly mitigation: number;
  readonly mitigationType?: 'Armor' | 'Ward';
  readonly critMaxBonus?: number;
  readonly damageDealt: number;
  readonly damageBreakdown: string;
  readonly damageDice?: readonly DamageDieRoll[];
  readonly damageModifier?: number;
  readonly damageBreakdownComponents?: readonly DamageBreakdownComponent[];
}

export interface DamageOptions {
  readonly hasRangedCover?: boolean;
  readonly elevationDelta?: number;
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
  damageEffect?: AbilityEffect,
  options?: DamageOptions
): DamageResult {
  const eff = damageEffect ?? ability.effects?.find((e) => e.type === 'DAMAGE');
  const damageProfile = eff?.damageProfile;
  const baseFlatBonus = eff?.flatDamage ?? 0;
  let flatBonus = baseFlatBonus;
  const passiveComponents: DamageBreakdownComponent[] = [];

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
            passiveComponents.push({
              label: passive.name,
              value: passive.healthThreshold.flatDamageBonus,
              source: 'PASSIVE'
            });
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
            passiveComponents.push({
              label: passive.name,
              value: passive.targetArmorBonus.flatDamageBonus,
              source: 'PASSIVE'
            });
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
            passiveComponents.push({
              label: passive.name,
              value: passive.targetForceBonus.flatDamageBonus,
              source: 'PASSIVE'
            });
          }
        }
      }

      if (passive.lowerElevationDamageBonus && options?.elevationDelta !== undefined && options.elevationDelta >= 1) {
        flatBonus += passive.lowerElevationDamageBonus;
        passiveComponents.push({
          label: passive.name,
          value: passive.lowerElevationDamageBonus,
          source: 'PASSIVE'
        });
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

  const attrKey = damageProfile
    ? damageProfile.modifierAttribute
    : (ability.attackModifierAttribute ??
        (ability.archetypeTag === 'MAGE'
          ? 'focus'
          : ability.archetypeTag === 'ROGUE'
          ? 'finesse'
          : 'force'));

  const modifier = damageProfile
    ? (damageProfile.modifierAttribute ? (actorCu.unit.baseAttributes[damageProfile.modifierAttribute] ?? 0) : 0)
    : getAbilityModifier(actorCu, ability);
  let rolledDice = 0;
  let maximizedVal = 0;
  let formulaPrefix = '';

  const components: DamageBreakdownComponent[] = [];
  const damageDiceRolls: DamageDieRoll[] = [];
  if (damageProfile) {
    const { count, sides } = damageProfile;
    let baseDiceSum = 0;
    if (diceRoller.rollIndividualDice) {
      const rolls = diceRoller.rollIndividualDice(count, sides);
      baseDiceSum = rolls.reduce((sum, val) => sum + val, 0);
      for (const r of rolls) {
        damageDiceRolls.push({ sides, roll: r });
      }
    } else {
      baseDiceSum = diceRoller.rollDice(count, sides);
      damageDiceRolls.push({ sides, roll: baseDiceSum });
    }
    rolledDice += baseDiceSum;
    maximizedVal = count * sides;
    formulaPrefix = `${count}d${sides}`;
    components.push({
      label: `Base Dice (${count}d${sides})`,
      value: baseDiceSum,
      source: 'DICE'
    });
  }

  if (bonusDamage && bonusDamage.count > 0 && bonusDamage.sides > 0) {
    let bonusDiceSum = 0;
    if (diceRoller.rollIndividualDice) {
      const bonusRolls = diceRoller.rollIndividualDice(bonusDamage.count, bonusDamage.sides);
      bonusDiceSum = bonusRolls.reduce((sum, val) => sum + val, 0);
      for (const r of bonusRolls) {
        damageDiceRolls.push({ sides: bonusDamage.sides, roll: r });
      }
    } else {
      bonusDiceSum = diceRoller.rollDice(bonusDamage.count, bonusDamage.sides);
      damageDiceRolls.push({ sides: bonusDamage.sides, roll: bonusDiceSum });
    }
    rolledDice += bonusDiceSum;
    maximizedVal += bonusDamage.count * bonusDamage.sides;
    formulaPrefix += `${formulaPrefix ? '+' : ''}${bonusDamage.count}d${bonusDamage.sides}`;
    components.push({
      label: `Bonus Dice (${bonusDamage.count}d${bonusDamage.sides})`,
      value: bonusDiceSum,
      source: 'BONUS_DICE'
    });
  }

  const isCrit = hitOutcome === 'CRITICAL_HIT';
  const isGraze = hitOutcome === 'GRAZE';

  if (isCrit && maximizedVal > 0) {
    components.push({
      label: `Critical Max (${formulaPrefix})`,
      value: maximizedVal,
      source: 'CRIT_MAX'
    });
  }

  if (attrKey && modifier !== 0) {
    const attrLabel =
      attrKey === 'force' ? 'Force Bonus' : attrKey === 'finesse' ? 'Finesse Bonus' : 'Focus Bonus';
    components.push({
      label: attrLabel,
      value: modifier,
      source: 'ATTRIBUTE'
    });
  }

  if (baseFlatBonus !== 0) {
    components.push({
      label: 'Ability / Shard Bonus',
      value: baseFlatBonus,
      source: 'ABILITY_FLAT'
    });
  }

  components.push(...passiveComponents.filter((c) => c.value !== 0));

  // Maximized Crit: max base dice + rolled dice + modifier + flatBonus
  const rawDamage = isCrit
    ? maximizedVal + rolledDice + modifier + flatBonus
    : rolledDice + modifier + flatBonus;

  const mitigationType: 'Armor' | 'Ward' = ability.damageType === 'PHYSICAL' ? 'Armor' : 'Ward';
  const mitigation =
    ability.damageType === 'PHYSICAL'
      ? getEffectiveArmor(targetCu)
      : getEffectiveWard(targetCu);

  if (mitigation !== 0) {
    components.push({
      label: `Target ${mitigationType}`,
      value: -mitigation,
      source: 'MITIGATION'
    });
  }

  let subtotal = rawDamage - mitigation;
  let modifierSuffix = '';

  if (isGraze) {
    const beforeGraze = subtotal;
    subtotal = Math.floor(subtotal * COMBAT_RESOLUTION_CONFIG.grazeDamageMultiplier);
    modifierSuffix = ' (x0.5 Graze)';
    components.push({
      label: 'Graze Penalty',
      value: subtotal - beforeGraze,
      displayValue: 'x0.5',
      source: 'MULTIPLIER'
    });
  }

  if (options?.hasRangedCover) {
    const beforeCover = subtotal;
    subtotal = Math.floor(subtotal * 0.5);
    modifierSuffix += ' (x0.5 Bastion Cover)';
    components.push({
      label: 'Bastion Ranged Cover',
      value: subtotal - beforeCover,
      displayValue: 'x0.5',
      source: 'MULTIPLIER'
    });
  }

  let damageDealt = subtotal;
  if (damageDealt < COMBAT_RESOLUTION_CONFIG.minimumDamage) {
    const beforeFloor = damageDealt;
    damageDealt = COMBAT_RESOLUTION_CONFIG.minimumDamage;
    modifierSuffix += ' (min 1)';
    components.push({
      label: 'Minimum Damage Floor',
      value: damageDealt - beforeFloor,
      displayValue: `Min ${damageDealt}`,
      source: 'MIN_FLOOR'
    });
  }

  // e.g. Normal: 1d6(4)+1 - 2 Armor -> 3 | Crit: 1d4+1d4 [Crit: 8 max + 6 roll] + 3 - 0 Armor -> 17
  const totalMod = modifier + flatBonus;
  const modSign = totalMod >= 0 ? `+${totalMod}` : `${totalMod}`;
  const critModSign = totalMod >= 0 ? `+ ${totalMod}` : `- ${Math.abs(totalMod)}`;

  const damageBreakdown = isCrit
    ? `${formulaPrefix || '0'} [Crit: ${maximizedVal} max + ${rolledDice} roll] ${critModSign} - ${mitigation} ${mitigationType}${modifierSuffix} -> ${damageDealt}`
    : `${formulaPrefix || '0'}(${rolledDice})${modSign} - ${mitigation} ${mitigationType}${modifierSuffix} -> ${damageDealt}`;

  return {
    rawDamage,
    mitigation,
    mitigationType,
    critMaxBonus: isCrit ? maximizedVal : 0,
    damageDealt,
    damageBreakdown,
    damageDice: damageDiceRolls,
    damageModifier: totalMod,
    damageBreakdownComponents: components
  };
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

