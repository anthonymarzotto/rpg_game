import { HexCoord, hexDistance } from '../grid/hex';
import { Ability } from '../types/ability';
import { CombatState, ValidationResult } from './types';
import { getEffectiveMove } from './effectiveVitals';

/**
 * Checks if the active unit can legally move to destination.
 */
export function canMove(
  state: CombatState,
  actorUnitId: string,
  destination: HexCoord
): ValidationResult {
  if (state.activeUnitId !== actorUnitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }
  if (cu.currentAp < 1) {
    return { valid: false, reason: 'Insufficient AP to move (costs 1 AP).' };
  }

  const currentCoord = state.arena.getUnitPosition(actorUnitId);
  if (!currentCoord) {
    return { valid: false, reason: 'Unit is not placed on the arena.' };
  }

  const effectiveMove = getEffectiveMove(cu);
  const reachable = state.arena.getReachableHexes(currentCoord, effectiveMove);

  if (!reachable.some((h) => h.q === destination.q && h.r === destination.r)) {
    return { valid: false, reason: `Destination (${destination.q}, ${destination.r}) is not reachable.` };
  }

  return { valid: true };
}

/**
 * Evaluates whether an ability can be cast against a target.
 */
export function canExecuteAbility(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  target?: { coord?: HexCoord; targetUnitId?: string }
): ValidationResult {
  if (state.activeUnitId !== actorUnitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }
  if (cu.currentAp < ability.apCost) {
    return { valid: false, reason: `Insufficient AP (requires ${ability.apCost}, has ${cu.currentAp}).` };
  }

  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  if (!actorCoord) {
    return { valid: false, reason: 'Actor not placed on arena.' };
  }

  if (ability.targetType === 'SELF') {
    return { valid: true };
  }

  if (ability.targetType === 'HEX') {
    if (!target?.coord) {
      return { valid: false, reason: 'Missing destination coordinate for hex-targeted ability.' };
    }
    const dist = hexDistance(actorCoord, target.coord);
    if (dist > ability.range) {
      return { valid: false, reason: `Target out of range (distance ${dist} > range ${ability.range}).` };
    }
    const destTile = state.arena.getTile(target.coord);
    if (!destTile) {
      return { valid: false, reason: `Destination (${target.coord.q}, ${target.coord.r}) does not exist in arena.` };
    }
    if (!destTile.isWalkable) {
      return { valid: false, reason: `Destination (${target.coord.q}, ${target.coord.r}) is not walkable.` };
    }
    if (destTile.occupiedByUnitId) {
      return { valid: false, reason: `Destination (${target.coord.q}, ${target.coord.r}) is already occupied.` };
    }
    return { valid: true };
  }

  const targetUnitId =
    ability.targetType === 'ALLY' && !target?.targetUnitId
      ? actorUnitId
      : target?.targetUnitId;

  if (ability.targetType === 'SINGLE_TARGET' || ability.targetType === 'ALLY') {
    if (!targetUnitId) {
      return { valid: false, reason: 'Missing target unit.' };
    }
    const targetCu = state.units.get(targetUnitId);
    if (!targetCu || targetCu.isDefeated) {
      return { valid: false, reason: 'Target unit does not exist or is defeated.' };
    }
    const targetCoord = state.arena.getUnitPosition(targetUnitId);
    if (!targetCoord) {
      return { valid: false, reason: 'Target unit not placed on arena.' };
    }

    if (ability.targetType === 'SINGLE_TARGET') {
      if (targetUnitId === actorUnitId) {
        return { valid: false, reason: 'Cannot target self with this ability.' };
      }
      if (
        cu.faction &&
        targetCu.faction &&
        cu.faction === targetCu.faction &&
        ability.damageType !== 'NONE'
      ) {
        return { valid: false, reason: 'Cannot attack a friendly unit.' };
      }
    }

    if (ability.targetType === 'ALLY') {
      if (targetUnitId !== actorUnitId) {
        if (cu.faction && targetCu.faction && cu.faction !== targetCu.faction) {
          return { valid: false, reason: 'Cannot cast an ally ability on an enemy unit.' };
        }
      }
    }

    const dist = hexDistance(actorCoord, targetCoord);
    if (dist > ability.range) {
      return { valid: false, reason: `Target out of range (distance ${dist} > range ${ability.range}).` };
    }

    if (!state.arena.hasLineOfSight(actorCoord, targetCoord)) {
      return { valid: false, reason: 'Line-of-Sight is blocked.' };
    }
  }

  return { valid: true };
}
