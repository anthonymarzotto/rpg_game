import { CombatState, CombatUnit, ModifiableCombatStat } from './types';
import { Ability } from '../types/ability';
import { getPassiveStatModifier } from './passives';
import { getConditionStatModifier } from './conditions';
import { isBastionStanceActive } from './bastionStance';
import { isDisplacementImmune } from './displacementImmunity';

/**
 * Computes a combat unit's dynamic effective stat value after applying active modifiers,
 * respecting minimum stat floors (speed and move floor at 1, other stats floor at 0).
 * Units with active Bastion Stance are locked in place with effective move of 0.
 */
export function getEffectiveStat(cu: CombatUnit, stat: ModifiableCombatStat): number {
  if (stat === 'attackRoll') {
    const modSum = cu.activeModifiers
      .filter((m) => m.stat === 'attackRoll')
      .reduce((sum, m) => sum + m.value, 0);
    const condSum = getConditionStatModifier(cu.activeConditions, 'attackRoll');
    return modSum + condSum;
  }
  if (stat === 'bastionStance') {
    return isBastionStanceActive(cu) ? 1 : 0;
  }
  if (stat === 'displacementImmunity') {
    return isDisplacementImmune(cu) ? 1 : 0;
  }
  const base = cu.unit.effectiveVitals[stat];
  const modSum = cu.activeModifiers
    .filter((m) => m.stat === stat)
    .reduce((sum, m) => sum + m.value, 0);
  const condSum = getConditionStatModifier(cu.activeConditions, stat);
  const passiveSum = getPassiveStatModifier(cu.passives, stat);
  const zeroedInPenalty = stat === 'evasion' ? -(cu.zeroedInStacks ?? 0) : 0;

  const total = base + modSum + condSum + passiveSum + zeroedInPenalty;

  if (stat === 'move') {
    if (isBastionStanceActive(cu)) {
      return 0;
    }
    return Math.max(1, total);
  }

  // Speed has a minimum floor of 1
  if (stat === 'speed') {
    return Math.max(1, total);
  }
  return Math.max(0, total);
}

export function getEffectiveSpeed(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'speed');
}

export function getEffectiveMove(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'move');
}

export function getEffectiveArmor(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'armor');
}

export function getEffectiveWard(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'ward');
}

export function getEffectiveEvasion(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'evasion');
}

export function getEffectiveResolve(cu: CombatUnit): number {
  return getEffectiveStat(cu, 'resolve');
}

/**
 * Returns true if two combat units belong to the same faction.
 */
export function isFriendlyUnit(
  actorCu: CombatUnit | undefined,
  targetCu: CombatUnit | undefined
): boolean {
  if (!actorCu || !targetCu) return false;
  const actorFaction = actorCu.faction ?? actorCu.unit.faction;
  const targetFaction = targetCu.faction ?? targetCu.unit.faction;
  return Boolean(actorFaction && targetFaction && actorFaction === targetFaction);
}

/**
 * Returns true if the unit possesses an active passive granting friendly-fire AoE exclusion
 * (e.g. Arcanist's Exclusion Matrix).
 */
export function hasFriendlyAoEExclusion(cu?: CombatUnit): boolean {
  return Boolean(cu?.passives?.some((p) => p.excludeFriendlyAoE));
}

/**
 * Returns true if an ability is classified as magical for LoS and passive filters.
 */
export function isMagicalAbility(ability: Ability): boolean {
  return ability.damageType === 'MAGICAL' || ability.archetypeTag === 'MAGE';
}

/**
 * Builds the Line-of-Sight unit screening predicate for a given actor and ability:
 * - Stealthed intermediate units never screen LoS.
 * - Friendly intermediate units do not screen LoS for magical abilities when the actor
 *   possesses a passive with `ignoresAllyLoS: true`.
 */
export function createLoSScreeningPredicate(
  state: CombatState,
  actorCu: CombatUnit,
  ability: Ability
): (unitId: string) => boolean {
  const ignoreAllies =
    Boolean(actorCu.passives?.some((p) => p.ignoresAllyLoS)) &&
    isMagicalAbility(ability);

  return (unitId: string): boolean => {
    const intermediateCu = state.units.get(unitId);
    if (!intermediateCu) return true;
    if (intermediateCu.activeConditions?.some((c) => c.type === 'STEALTH')) {
      return false;
    }
    if (ignoreAllies && isFriendlyUnit(actorCu, intermediateCu)) {
      return false;
    }
    return true;
  };
}
