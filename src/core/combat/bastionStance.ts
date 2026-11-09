import { CombatState, CombatUnit } from './types';
import { HexCoord, hexDistance, getCombatArc, getHexNeighbors, toHexKey } from '../grid/hex';
import { Ability } from '../types/ability';

/**
 * Checks if a combat unit currently has an active Bastion Stance modifier.
 */
export function isBastionStanceActive(cu: CombatUnit): boolean {
  if (cu.isDefeated) return false;
  return (cu.activeModifiers ?? []).some((m) => m.stat === 'bastionStance' && m.durationTurns > 0);
}

/**
 * Collects all hex keys that represent a Phalanx Front (Zone of Control)
 * projected by hostile units with active Bastion Stance.
 */
export function getBastionZocHexKeys(state: CombatState, movingUnitId: string): Set<string> {
  const zocKeys = new Set<string>();
  const movingCu = state.units.get(movingUnitId);
  if (!movingCu || movingCu.isDefeated) return zocKeys;

  for (const [unitId, sbCu] of state.units) {
    if (unitId === movingUnitId || sbCu.isDefeated) continue;
    // ZOC only affects opposing factions
    if (!sbCu.faction || !movingCu.faction || sbCu.faction === movingCu.faction) continue;
    if (!isBastionStanceActive(sbCu)) continue;

    const sbCoord = state.arena.getUnitPosition(unitId);
    if (!sbCoord) continue;

    for (const neighbor of getHexNeighbors(sbCoord)) {
      if (getCombatArc(sbCu.facing, sbCoord, neighbor) === 'FRONT') {
        zocKeys.add(toHexKey(neighbor));
      }
    }
  }
  return zocKeys;
}

/**
 * Checks if entering a specific hex triggers a Zone of Control traversal interruption
 * from an enemy unit with active Bastion Stance.
 */
export function evaluateZoneOfControl(
  state: CombatState,
  movingUnitId: string,
  enteredCoord: HexCoord
): CombatUnit | null {
  const movingCu = state.units.get(movingUnitId);
  if (!movingCu || movingCu.isDefeated) return null;

  for (const [unitId, sbCu] of state.units) {
    if (unitId === movingUnitId || sbCu.isDefeated) continue;
    if (!sbCu.faction || !movingCu.faction || sbCu.faction === movingCu.faction) continue;
    if (!isBastionStanceActive(sbCu)) continue;

    const sbCoord = state.arena.getUnitPosition(unitId);
    if (!sbCoord) continue;

    if (hexDistance(sbCoord, enteredCoord) === 1) {
      if (getCombatArc(sbCu.facing, sbCoord, enteredCoord) === 'FRONT') {
        return sbCu;
      }
    }
  }
  return null;
}

/**
 * Checks if a target unit benefits from rear-arc ranged cover granted by an allied Shield-bearer
 * in active Bastion Stance.
 * Cover requires:
 * 1. An incoming ranged attack (ability.range >= 2 or distance >= 2).
 * 2. An allied unit with active Bastion Stance adjacent to target (dist === 1).
 * 3. The target is positioned directly in the Shield-bearer's rear hex (CombatArc === 'REAR').
 */
export function hasBastionRangedCover(
  state: CombatState,
  targetCu: CombatUnit,
  attackerCoord?: HexCoord,
  ability?: Ability
): boolean {
  if (!targetCu || targetCu.isDefeated) return false;
  const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
  if (!targetCoord) return false;

  const isRanged = Boolean(
    (ability && ability.range >= 2) ||
    (attackerCoord && hexDistance(attackerCoord, targetCoord) >= 2)
  );
  if (!isRanged) return false;

  for (const [unitId, sbCu] of state.units) {
    if (unitId === targetCu.unit.id || sbCu.isDefeated) continue;
    if (!sbCu.faction || !targetCu.faction || sbCu.faction !== targetCu.faction) continue;
    if (!isBastionStanceActive(sbCu)) continue;

    const sbCoord = state.arena.getUnitPosition(unitId);
    if (!sbCoord) continue;

    if (hexDistance(sbCoord, targetCoord) === 1) {
      if (getCombatArc(sbCu.facing, sbCoord, targetCoord) === 'REAR') {
        return true;
      }
    }
  }
  return false;
}
