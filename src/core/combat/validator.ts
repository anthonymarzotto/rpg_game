import { HexCoord, hexDistance, getHexLine, getHexesInRange } from '../grid/hex';
import { Ability } from '../types/ability';
import { CombatState, CombatUnit, ValidationResult } from './types';
import { getEffectiveMove } from './effectiveVitals';
import { getEffectiveAbility } from './modifiers';
import { getConditionDefinition } from './conditions';
import { Arena, LineOfSightObstruction } from '../grid/arena';

/**
 * Calculates all arena tile coordinates that fall within the effective reach of an ability,
 * accounting for active ability modifiers, relative elevation vantage (for ranged),
 * vertical reach limits (for melee), and arena boundaries.
 */
export function getAbilityRangeCoords(
  arena: Arena,
  actorCoord: HexCoord,
  ability: Ability,
  cu?: CombatUnit
): HexCoord[] {
  const effectiveAbility = cu?.abilityModifiers
    ? getEffectiveAbility(ability, cu.abilityModifiers)
    : ability;

  if (effectiveAbility.targetType === 'SELF') {
    return arena.hasTile(actorCoord) ? [actorCoord] : [];
  }

  const actorElevation = arena.getElevation(actorCoord);

  if (effectiveAbility.range <= 1) {
    const candidates = getHexesInRange(actorCoord, 1);
    const maxReach = effectiveAbility.reachElevationDelta ?? 1;
    const ignoresReach = cu?.passives?.some((p) => p.ignoresElevationPenalty);

    return candidates.filter((coord) => {
      if (!arena.hasTile(coord)) return false;
      const targetElevation = arena.getElevation(coord);
      const elevationDelta = actorElevation - targetElevation;
      if (!ignoresReach && Math.abs(elevationDelta) > maxReach) {
        return false;
      }
      return true;
    });
  }

  // Ranged abilities (range >= 2):
  // Vantage grants +1 range per level of positive elevation difference:
  // effectiveRange = range + max(0, actorElevation - targetElevation).
  // The maximum possible range in any direction is range + actorElevation (since min arena elevation is 0).
  const maxPotentialRange = effectiveAbility.range + Math.max(0, actorElevation);
  const candidates = getHexesInRange(actorCoord, maxPotentialRange);

  return candidates.filter((coord) => {
    if (!arena.hasTile(coord)) return false;
    const dist = hexDistance(actorCoord, coord);
    const targetElevation = arena.getElevation(coord);
    const elevationDelta = actorElevation - targetElevation;
    const effectiveRange = effectiveAbility.range + Math.max(0, elevationDelta);
    return dist <= effectiveRange;
  });
}

function validateElevationReachAndRange(
  actorElevation: number,
  targetElevation: number,
  effectiveAbility: Ability,
  cu: CombatUnit,
  dist: number
): ValidationResult | undefined {
  const elevationDelta = actorElevation - targetElevation;
  if (effectiveAbility.range <= 1) {
    const maxReach = effectiveAbility.reachElevationDelta ?? 1;
    const ignoresReach = cu.passives?.some((p) => p.ignoresElevationPenalty);
    if (!ignoresReach && Math.abs(elevationDelta) > maxReach) {
      return {
        valid: false,
        reason: `Target is vertically out of reach (elevation difference ${Math.abs(elevationDelta)} > reach ${maxReach}).`
      };
    }
  }

  const effectiveRange =
    effectiveAbility.range >= 2
      ? effectiveAbility.range + Math.max(0, elevationDelta)
      : effectiveAbility.range;

  if (dist > effectiveRange) {
    return { valid: false, reason: `Target out of range (distance ${dist} > range ${effectiveRange}).` };
  }
  return undefined;
}

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

  if (effectiveAbility.targetType === 'SELF') {
    return { valid: true };
  }

  const actorElevation = state.arena.getElevation(actorCoord);

  if (effectiveAbility.targetType === 'HEX') {
    if (!target?.coord) {
      return { valid: false, reason: 'Missing destination coordinate for hex-targeted ability.' };
    }
    const dist = hexDistance(actorCoord, target.coord);
    const rangeError = validateElevationReachAndRange(
      actorElevation,
      state.arena.getElevation(target.coord),
      effectiveAbility,
      cu,
      dist
    );
    if (rangeError) return rangeError;
    const destTile = state.arena.getTile(target.coord);
    if (!destTile) {
      return { valid: false, reason: `Destination (${target.coord.q}, ${target.coord.r}) does not exist in arena.` };
    }
    if (!destTile.isWalkable) {
      return { valid: false, reason: `Destination (${target.coord.q}, ${target.coord.r}) is not walkable.` };
    }
    const isAoE = (effectiveAbility.aoeRadius ?? 0) > 0;
    if (!isAoE && destTile.occupiedByUnitId) {
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
      for (const cond of targetCu.activeConditions ?? []) {
        const def = getConditionDefinition(cond.type);
        if (def?.canBeTargeted && !def.canBeTargeted(cond, cu, targetCu, effectiveAbility)) {
          return { valid: false, reason: 'Cannot target a stealthed unit directly.' };
        }
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
    const rangeError = validateElevationReachAndRange(
      actorElevation,
      state.arena.getElevation(targetCoord),
      effectiveAbility,
      cu,
      dist
    );
    if (rangeError) return rangeError;

    const isRush = effectiveAbility.effects?.some((e) => e.type === 'RUSH_CHARGE');
    if (isRush) {
      if (dist < 2) {
        return { valid: false, reason: 'Lance Charge requires at least 2 hexes of charging distance.' };
      }
      const isStraightLine =
        actorCoord.q === targetCoord.q ||
        actorCoord.r === targetCoord.r ||
        actorCoord.q + actorCoord.r === targetCoord.q + targetCoord.r;
      if (!isStraightLine) {
        return { valid: false, reason: 'Lance Charge must follow an unobstructed straight hex ray.' };
      }
      const line = getHexLine(actorCoord, targetCoord);
      for (let i = 1; i < line.length - 1; i++) {
        const hex = line[i];
        const tile = state.arena.getTile(hex);
        if (!tile || !tile.isWalkable) {
          return { valid: false, reason: `Charge trajectory through (${hex.q}, ${hex.r}) is blocked.` };
        }
        const occupantId = state.arena.getUnitAt(hex);
        if (occupantId && occupantId !== actorUnitId) {
          return { valid: false, reason: `Charge trajectory is obstructed by a unit at (${hex.q}, ${hex.r}).` };
        }
      }
    }

    const obstruction = state.arena.getLineOfSightObstruction(actorCoord, targetCoord, {
      isUnitScreening: (unitId) =>
        !state.units.get(unitId)?.activeConditions?.some((c) => c.type === 'STEALTH')
    });
    if (obstruction) {
      return { valid: false, reason: formatLoSObstructionReason(state, obstruction) };
    }
  }

  return { valid: true };
}

/**
 * Formats an informative, user-facing explanation for why Line-of-Sight is blocked.
 */
export function formatLoSObstructionReason(
  state: CombatState,
  obstruction: LineOfSightObstruction
): string {
  const { coord, type, elevation, label, occupiedByUnitId } = obstruction;
  const hexStr = `(${coord.q}, ${coord.r})`;

  switch (type) {
    case 'UNIT': {
      const blockingUnit = occupiedByUnitId ? state.units.get(occupiedByUnitId) : undefined;
      const unitName = blockingUnit?.unit?.name ?? 'a unit';
      return `Line-of-Sight is blocked: screened by ${unitName} at ${hexStr}.`;
    }
    case 'OBSTACLE': {
      const obstacleLabel = label ? label : 'an obstacle';
      return `Line-of-Sight is blocked by ${obstacleLabel} at ${hexStr}.`;
    }
    case 'HILL': {
      return `Line-of-Sight is blocked by high terrain (+${elevation}) at ${hexStr}.`;
    }
    case 'VOID':
    default: {
      return `Line-of-Sight is blocked at ${hexStr}.`;
    }
  }
}

