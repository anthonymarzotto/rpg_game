import { HexCoord, hexDistance } from '../grid/hex';
import { Ability } from '../types/ability';
import { CombatState, ValidationResult } from './types';
import { getEffectiveMove } from './effectiveVitals';
import { getEffectiveAbility } from './modifiers';

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

export interface AbilityTargetOptions {
  readonly coord?: HexCoord;
  readonly targetUnitId?: string;
  readonly originCoord?: HexCoord;
  readonly ignoreApCheck?: boolean;
}

/**
 * Evaluates whether an ability can be cast against a target,
 * taking into account all active ability modifiers on the caster.
 */
export function canExecuteAbility(
  state: CombatState,
  actorUnitId: string,
  ability: Ability,
  target?: AbilityTargetOptions
): ValidationResult {
  if (state.activeUnitId !== actorUnitId) {
    return { valid: false, reason: 'Unit is not currently active.' };
  }
  const cu = state.units.get(actorUnitId);
  if (!cu || cu.isDefeated) {
    return { valid: false, reason: 'Unit is defeated or does not exist.' };
  }

  const effectiveAbility = getEffectiveAbility(ability, cu.abilityModifiers);

  if (!target?.ignoreApCheck && cu.currentAp < effectiveAbility.apCost) {
    return { valid: false, reason: `Insufficient AP (requires ${effectiveAbility.apCost}, has ${cu.currentAp}).` };
  }
  if (effectiveAbility.oncePerTurn && cu.abilitiesUsedThisTurn?.includes(effectiveAbility.id)) {
    return { valid: false, reason: `${effectiveAbility.name} can only be used once per turn.` };
  }

  const actorCoord = target?.originCoord ?? state.arena.getUnitPosition(actorUnitId);
  if (!actorCoord) {
    return { valid: false, reason: 'Actor not placed on arena.' };
  }

  const effectiveRange = effectiveAbility.range;

  if (effectiveAbility.targetType === 'SELF') {
    return { valid: true };
  }

  if (effectiveAbility.targetType === 'HEX') {
    if (!target?.coord) {
      return { valid: false, reason: 'Missing destination coordinate for hex-targeted ability.' };
    }
    const dist = hexDistance(actorCoord, target.coord);
    if (dist > effectiveRange) {
      return { valid: false, reason: `Target out of range (distance ${dist} > range ${effectiveRange}).` };
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
    effectiveAbility.targetType === 'ALLY' && !target?.targetUnitId
      ? actorUnitId
      : target?.targetUnitId;

  if (effectiveAbility.targetType === 'SINGLE_TARGET' || effectiveAbility.targetType === 'ALLY') {
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

    if (effectiveAbility.targetType === 'SINGLE_TARGET') {
      if (targetUnitId === actorUnitId) {
        return { valid: false, reason: 'Cannot target self with this ability.' };
      }
      if (
        cu.faction &&
        targetCu.faction &&
        cu.faction === targetCu.faction &&
        effectiveAbility.damageType !== 'NONE'
      ) {
        return { valid: false, reason: 'Cannot attack a friendly unit.' };
      }
      if (
        targetCu.activeConditions?.some((c) => c.type === 'STEALTH') &&
        (!cu.faction || !targetCu.faction || cu.faction !== targetCu.faction)
      ) {
        return { valid: false, reason: 'Cannot target a stealthed unit directly.' };
      }
    }

    if (effectiveAbility.targetType === 'ALLY') {
      if (
        targetUnitId !== actorUnitId &&
        cu.faction &&
        targetCu.faction &&
        cu.faction !== targetCu.faction
      ) {
        return { valid: false, reason: 'Cannot cast an ally ability on an enemy unit.' };
      }
    }

    const dist = hexDistance(actorCoord, targetCoord);
    if (dist > effectiveRange) {
      return { valid: false, reason: `Target out of range (distance ${dist} > range ${effectiveRange}).` };
    }

    if (!state.arena.hasLineOfSight(actorCoord, targetCoord)) {
      return { valid: false, reason: 'Line-of-Sight is blocked.' };
    }
  }

  return { valid: true };
}
