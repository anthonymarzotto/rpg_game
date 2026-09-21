import { CombatUnit, ModifiableCombatStat } from './types';

/**
 * Computes a combat unit's dynamic effective stat value after applying active modifiers,
 * respecting minimum stat floors (speed and move floor at 1, other stats floor at 0).
 */
export function getEffectiveStat(cu: CombatUnit, stat: ModifiableCombatStat): number {
  const base = cu.unit.effectiveVitals[stat];
  const modSum = cu.activeModifiers
    .filter((m) => m.stat === stat)
    .reduce((sum, m) => sum + m.value, 0);
  const passiveSum = (cu.passives ?? []).reduce(
    (sum, p) => sum + (p.statModifiers?.[stat] ?? 0),
    0
  );

  const total = base + modSum + passiveSum;

  // Speed and Move have a minimum floor of 1
  if (stat === 'move' || stat === 'speed') {
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
