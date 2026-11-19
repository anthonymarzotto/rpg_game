import { CombatUnit } from './types';

export const MAX_ZEROED_IN_STACKS = 3;
export const ZEROED_IN_RANGE_MOD_ID = 'zeroed_in_range';
export const ZEROED_IN_AOE_MOD_ID = 'zeroed_in_aoe';

/**
 * Checks whether a combat unit has the Zeroed In (stationary calibration) passive trait.
 */
export function hasZeroedInPassive(cu: CombatUnit): boolean {
  return Boolean(cu.passives?.some((p) => p.stationaryCalibration));
}

/**
 * Synchronizes dynamic IN_TRIAL AbilityModifiers on the unit to reflect current Zeroed In stacks:
 * - +stacks Range on ranged abilities (base range >= 2)
 * - +1 AoE Radius on AoE abilities (base aoeRadius >= 1) when at max stacks (3)
 */
export function syncZeroedInModifiers(cu: CombatUnit): void {
  const stacks = Math.max(0, Math.min(MAX_ZEROED_IN_STACKS, cu.zeroedInStacks ?? 0));
  cu.zeroedInStacks = stacks;

  const preserved = (cu.abilityModifiers ?? []).filter(
    (m) => m.id !== ZEROED_IN_RANGE_MOD_ID && m.id !== ZEROED_IN_AOE_MOD_ID
  );

  if (stacks > 0) {
    preserved.push({
      id: ZEROED_IN_RANGE_MOD_ID,
      name: `Zeroed In (${stacks}x)`,
      tier: 'TRIAL',
      minBaseRange: 2,
      deltas: {
        range: stacks
      }
    });
  }

  if (stacks >= MAX_ZEROED_IN_STACKS) {
    preserved.push({
      id: ZEROED_IN_AOE_MOD_ID,
      name: `Zeroed In (${stacks}x)`,
      tier: 'TRIAL',
      minBaseAoeRadius: 1,
      deltas: {
        aoeRadius: 1
      }
    });
  }

  cu.abilityModifiers = preserved;
}

/**
 * Clears all Zeroed In stacks when the unit moves, teleports, or is displaced.
 * Returns true if any stacks were cleared.
 */
export function clearZeroedInStacks(cu: CombatUnit, markMoved = true): boolean {
  if (markMoved) {
    cu.movedThisTurn = true;
  }
  const hadStacks = (cu.zeroedInStacks ?? 0) > 0;
  cu.zeroedInStacks = 0;
  syncZeroedInModifiers(cu);
  return hadStacks;
}

/**
 * Evaluates Zeroed In stack accumulation at the end of a unit's active turn.
 * If the unit has the passive and did not move/teleport/displace this turn, increments stacks up to 3.
 * Resets movedThisTurn for the next turn.
 */
export function accumulateZeroedInOnTurnEnd(cu: CombatUnit): number {
  const didMove = Boolean(cu.movedThisTurn) || (cu.hexesMovedThisTurn ?? 0) > 0;
  cu.movedThisTurn = false;

  if (!hasZeroedInPassive(cu)) {
    return 0;
  }

  if (!didMove) {
    cu.zeroedInStacks = Math.min(MAX_ZEROED_IN_STACKS, (cu.zeroedInStacks ?? 0) + 1);
    syncZeroedInModifiers(cu);
  }

  return cu.zeroedInStacks ?? 0;
}
