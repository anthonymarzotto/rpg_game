import {
  HexCoord,
  toHexKey,
  hexDistance,
  getHexNeighbors,
  getHexLine,
  hexSubtract,
  hexAdd
} from './hex';
import { DISPLACEMENT_CONFIG } from '../config/balance';


export interface HexTile {
  readonly coord: HexCoord;
  readonly elevation: number;
  readonly isWalkable: boolean;
  occupiedByUnitId?: string;
}

export type CollisionType = 'VOID' | 'WALL' | 'CLIFF' | 'UNIT';

export interface KnockbackResult {
  readonly finalCoord: HexCoord;
  readonly isCollided: boolean;
  readonly collisionType?: CollisionType;
  readonly collidingUnitId?: string;
}

/**
 * Spatial container managing arena tiles, elevation, unit occupancy,
 * pathfinding, line-of-sight, and displacement mechanics.
 */
export class Arena {
  private readonly tiles: Map<string, HexTile> = new Map();
  private readonly unitPositions: Map<string, HexCoord> = new Map();

  constructor(initialTiles: readonly HexTile[] = []) {
    for (const tile of initialTiles) {
      this.tiles.set(toHexKey(tile.coord), { ...tile });
    }
  }

  public getTile(coord: HexCoord): HexTile | undefined {
    return this.tiles.get(toHexKey(coord));
  }

  public hasTile(coord: HexCoord): boolean {
    return this.tiles.has(toHexKey(coord));
  }

  public setTile(tile: HexTile): void {
    this.tiles.set(toHexKey(tile.coord), { ...tile });
  }

  public getUnitPosition(unitId: string): HexCoord | undefined {
    return this.unitPositions.get(unitId);
  }

  public getUnitAt(coord: HexCoord): string | undefined {
    return this.getTile(coord)?.occupiedByUnitId;
  }

  /**
   * Places or moves a unit to the designated coordinate, updating two-way occupancy.
   */
  public setUnitPosition(unitId: string, coord: HexCoord): void {
    const tile = this.getTile(coord);
    if (!tile || !tile.isWalkable) {
      throw new Error(`Cannot place unit ${unitId} on invalid or unwalkable tile at (${coord.q}, ${coord.r}).`);
    }
    if (tile.occupiedByUnitId && tile.occupiedByUnitId !== unitId) {
      throw new Error(`Tile at (${coord.q}, ${coord.r}) is already occupied by ${tile.occupiedByUnitId}.`);
    }

    // Clear previous occupancy if unit was already on the board
    const prevCoord = this.unitPositions.get(unitId);
    if (prevCoord) {
      const prevTile = this.getTile(prevCoord);
      if (prevTile) {
        prevTile.occupiedByUnitId = undefined;
      }
    }

    tile.occupiedByUnitId = unitId;
    this.unitPositions.set(unitId, coord);
  }

  /**
   * Clears a unit from the arena (e.g. upon defeat or extraction).
   */
  public removeUnit(unitId: string): void {
    const coord = this.unitPositions.get(unitId);
    if (coord) {
      const tile = this.getTile(coord);
      if (tile) {
        tile.occupiedByUnitId = undefined;
      }
      this.unitPositions.delete(unitId);
    }
  }

  /**
   * Returns all hexes reachable from origin within the given movement budget,
   * respecting walkability, max jump elevation, and strict single-unit occupancy.
   */
  public getReachableHexes(
    origin: HexCoord,
    moveBudget: number,
    maxJumpElevation: number = DISPLACEMENT_CONFIG.maxJumpElevation
  ): HexCoord[] {
    const startTile = this.getTile(origin);
    if (!startTile || moveBudget <= 0) {
      return [];
    }

    const reachable: HexCoord[] = [];
    const distances: Map<string, number> = new Map();
    const queue: HexCoord[] = [origin];
    distances.set(toHexKey(origin), 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances.get(toHexKey(current))!;
      const currentTile = this.getTile(current)!;

      if (currentDist >= moveBudget) {
        continue;
      }

      for (const neighbor of getHexNeighbors(current)) {
        const neighborKey = toHexKey(neighbor);
        const neighborTile = this.getTile(neighbor);

        // Cannot move into non-existent or unwalkable tiles
        if (!neighborTile || !neighborTile.isWalkable) {
          continue;
        }

        // Strict single occupancy: cannot move through occupied tiles
        if (neighborTile.occupiedByUnitId) {
          continue;
        }

        // Elevation jump check
        if (Math.abs(neighborTile.elevation - currentTile.elevation) > maxJumpElevation) {
          continue;
        }

        const newDist = currentDist + 1;
        if (!distances.has(neighborKey) || newDist < distances.get(neighborKey)!) {
          distances.set(neighborKey, newDist);
          reachable.push(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return reachable;
  }

  /**
   * Evaluates Line-of-Sight (LoS) between two hexes.
   * LoS is blocked if any intermediate hex:
   * 1. Does not exist in the arena (void), OR
   * 2. Has an elevation strictly higher than both source and target (terrain obstacle), OR
   * 3. Is occupied by any unit (physical body-blocking).
   */
  public hasLineOfSight(from: HexCoord, to: HexCoord): boolean {
    const fromTile = this.getTile(from);
    const toTile = this.getTile(to);
    if (!fromTile || !toTile) {
      return false;
    }

    const line = getHexLine(from, to);
    if (line.length <= 2) {
      // Adjacent hexes always have direct Line-of-Sight
      return true;
    }

    const maxElevation = Math.max(fromTile.elevation, toTile.elevation);

    // Check intermediate hexes (excluding source and target)
    for (let i = 1; i < line.length - 1; i++) {
      const stepCoord = line[i];
      const stepTile = this.getTile(stepCoord);

      // Void / missing tile blocks LoS
      if (!stepTile) {
        return false;
      }

      // Intervening unit blocks LoS (screening)
      if (stepTile.occupiedByUnitId) {
        return false;
      }

      // Higher terrain obstacle blocks LoS
      if (stepTile.elevation > maxElevation) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculates knockback displacement along the attacker -> target vector.
   * If the destination is off-map, unwalkable, blocked by high elevation,
   * or occupied by another unit, displacement halts and a wall-slam collision is registered.
   */
  public calculateKnockback(
    attackerCoord: HexCoord,
    targetCoord: HexCoord,
    distance = 1,
    maxJumpElevation: number = DISPLACEMENT_CONFIG.maxJumpElevation
  ): KnockbackResult {
    const targetTile = this.getTile(targetCoord);
    if (!targetTile) {
      throw new Error(`Target hex (${targetCoord.q}, ${targetCoord.r}) does not exist in arena.`);
    }

    // Directional vector: delta = target - attacker
    const rawDelta = hexSubtract(targetCoord, attackerCoord);
    const dist = hexDistance(attackerCoord, targetCoord);
    if (dist === 0) {
      return { finalCoord: targetCoord, isCollided: false };
    }

    // Single step direction
    const stepDir: HexCoord = {
      q: Math.round(rawDelta.q / dist),
      r: Math.round(rawDelta.r / dist)
    };

    let current = targetCoord;

    for (let i = 0; i < distance; i++) {
      const nextCoord = hexAdd(current, stepDir);
      const nextTile = this.getTile(nextCoord);

      // 1. Off-map / Void collision
      if (!nextTile) {
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'VOID'
        };
      }

      // 2. Unwalkable wall collision
      if (!nextTile.isWalkable) {
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'WALL'
        };
      }

      // 3. Cliff / High elevation collision
      const currentTile = this.getTile(current)!;
      if (nextTile.elevation - currentTile.elevation > maxJumpElevation) {
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'CLIFF'
        };
      }

      // 4. Occupied unit collision (body slam)
      if (nextTile.occupiedByUnitId) {
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'UNIT',
          collidingUnitId: nextTile.occupiedByUnitId
        };
      }

      current = nextCoord;
    }

    return {
      finalCoord: current,
      isCollided: false
    };
  }
}

// Re-export arena generation templates for convenience
export { createRadialArena } from './templates';

