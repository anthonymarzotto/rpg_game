import { CombatUnit, ModifiableCombatStat } from './types';
import { getPassiveStatModifier } from './passives';
import { isBastionStanceActive } from './bastionStance';
import { isDisplacementImmune } from './displacementImmunity';

/**
 * Computes a combat unit's dynamic effective stat value after applying active modifiers,
 * respecting minimum stat floors (speed and move floor at 1, other stats floor at 0).
 * Units with active Bastion Stance are locked in place with effective move of 0.
 */
export function getEffectiveStat(cu: CombatUnit, stat: ModifiableCombatStat): number {
  if (stat === 'attackRoll') {
    return cu.activeModifiers
      .filter((m) => m.stat === 'attackRoll')
      .reduce((sum, m) => sum + m.value, 0);
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
  const passiveSum = getPassiveStatModifier(cu.passives, stat);

  const total = base + modSum + passiveSum;

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
