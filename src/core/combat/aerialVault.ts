import {
  HexCoord,
  getHexLine,
  getDirectionBetween,
  getHexNeighbor,
  getHexNeighbors,
  hexDistance
} from '../grid/hex';
import { CombatState } from './types';

/**
 * Resolves the deterministic landing hex for an aerial vault attack against a target.
 * 1. Far Hex: The hex directly behind the target along the approach vector (rear arc).
 * 2. Near Hex: The hex directly in front of the target along the approach vector (line[line.length - 2]).
 * 3. Fallback: Any other walkable, unoccupied neighbor of the target, prioritized by shortest distance to the actor.
 * Returns undefined if all neighbors are occupied or impassable.
 */
export function resolveAerialVaultLandingHex(
  state: CombatState,
  actorCoord: HexCoord,
  targetCoord: HexCoord
): HexCoord | undefined {
  const line = getHexLine(actorCoord, targetCoord);
  if (line.length < 3) {
    // Distance must be at least 2 hexes
    return undefined;
  }

  const isAvailable = (hex?: HexCoord): boolean => {
    if (!hex) return false;
    const tile = state.arena.getTile(hex);
    if (!tile || !tile.isWalkable) return false;
    const occupant = state.arena.getUnitAt(hex);
    if (occupant && occupant !== state.arena.getUnitAt(actorCoord)) return false;
    return true;
  };

  // 1. Far Hex: Direction from actor to target continued 1 step past target
  const dir = getDirectionBetween(actorCoord, targetCoord);
  const farHex = getHexNeighbor(targetCoord, dir);
  if (isAvailable(farHex)) {
    return farHex;
  }

  // 2. Near Hex: Directly in front of the target along the approach line
  const nearHex = line[line.length - 2];
  if (isAvailable(nearHex)) {
    return nearHex;
  }

  // 3. Any other available neighbor of target, sorted by shortest distance to actor
  const candidates = getHexNeighbors(targetCoord)
    .filter((h) => isAvailable(h))
    .sort((a, b) => hexDistance(actorCoord, a) - hexDistance(actorCoord, b));

  return candidates.length > 0 ? candidates[0] : undefined;
}
