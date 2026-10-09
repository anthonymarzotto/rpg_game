import {
  HexCoord,
  toHexKey,
  hexDistance,
  getHexNeighbors,
  getHexLine,
  hexAdd,
  getDirectionBetween,
  POINTY_HEX_DIRECTIONS
} from './hex';
import { DISPLACEMENT_CONFIG } from '../config/balance';


export interface HexTile {
  readonly coord: HexCoord;
  readonly elevation: number;
  readonly isWalkable: boolean;
  readonly label?: string;
  readonly terrainType?: string;
  occupiedByUnitId?: string;
}

export interface ReachableTileInfo {
  readonly coord: HexCoord;
  readonly cost: number;
  readonly fallDamage: number;
  readonly path: readonly HexCoord[];
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
      const elevation = Math.max(0, Math.min(3, Math.floor(tile.elevation ?? 0)));
      this.tiles.set(toHexKey(tile.coord), { ...tile, elevation });
    }
  }

  public getTile(coord: HexCoord): HexTile | undefined {
    return this.tiles.get(toHexKey(coord));
  }

  public getElevation(coord: HexCoord): number {
    return this.getTile(coord)?.elevation ?? 0;
  }

  public getAllTiles(): HexTile[] {
    return Array.from(this.tiles.values());
  }

  public hasTile(coord: HexCoord): boolean {
    return this.tiles.has(toHexKey(coord));
  }

  public setTile(tile: HexTile): void {
    const elevation = Math.max(0, Math.min(3, Math.floor(tile.elevation ?? 0)));
    this.tiles.set(toHexKey(tile.coord), { ...tile, elevation });
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
   * Computes all reachable tiles and optimal paths within a movement budget (MP)
   * using Dijkstra search over discrete elevation terrain.
   * - Step cost: 1 + Math.max(0, dh) MP.
   * - Impassable rise: dh > maxClimbElevation (dh >= 3).
   * - Safe-route prioritization: chooses zero-fall-damage routes when within budget.
   * - Fall damage: |dh| * 4 when plunging dh <= -2.
   */
  public getReachableHexInfo(
    origin: HexCoord,
    moveBudget: number
  ): Map<string, ReachableTileInfo> {
    const startTile = this.getTile(origin);
    if (!startTile || moveBudget <= 0) {
      return new Map();
    }

    interface SearchNode {
      coord: HexCoord;
      cost: number;
      fallDamage: number;
      path: HexCoord[];
    }

    // Best destination outcomes for stopping at a tile (keyed by hexKey)
    const bestDestinations = new Map<string, ReachableTileInfo>();

    // Pareto frontier of non-dominated states per tile: array of { cost, fallDamage }
    const frontiers = new Map<string, Array<{ cost: number; fallDamage: number }>>();

    const queue: SearchNode[] = [
      {
        coord: origin,
        cost: 0,
        fallDamage: 0,
        path: [origin]
      }
    ];

    frontiers.set(toHexKey(origin), [{ cost: 0, fallDamage: 0 }]);

    while (queue.length > 0) {
      // Sort to pop the lowest (fallDamage, cost) state
      queue.sort((a, b) => {
        if (a.fallDamage !== b.fallDamage) {
          return a.fallDamage - b.fallDamage;
        }
        return a.cost - b.cost;
      });

      const current = queue.shift()!;
      const currentTile = this.getTile(current.coord)!;

      for (const neighbor of getHexNeighbors(current.coord)) {
        const neighborKey = toHexKey(neighbor);
        const neighborTile = this.getTile(neighbor);

        // 1. Cannot move into non-existent or unwalkable tiles
        if (!neighborTile || !neighborTile.isWalkable) {
          continue;
        }

        // 2. Strict single occupancy: cannot move through or land on occupied tiles
        if (neighborTile.occupiedByUnitId) {
          continue;
        }

        // 3. Elevation difference
        const dh = neighborTile.elevation - currentTile.elevation;

        // Impassable climb limit (dh >= 3)
        if (dh > DISPLACEMENT_CONFIG.maxClimbElevation) {
          continue;
        }

        // 4. Step cost: 1 + max(0, dh)
        const stepCost = 1 + Math.max(0, dh);
        const nextCost = current.cost + stepCost;

        if (nextCost > moveBudget) {
          continue;
        }

        // 5. Fall damage: |dh| * 4 if plunging dh <= -2
        const stepFallDamage =
          dh <= -2 ? Math.abs(dh) * DISPLACEMENT_CONFIG.fallDamagePerElevation : 0;
        const nextFallDamage = current.fallDamage + stepFallDamage;
        const nextPath = [...current.path, neighbor];

        // 6. Pareto dominance check:
        // A state (c, d) is dominated if an existing frontier state has c' <= c AND d' <= d
        const frontier = frontiers.get(neighborKey) ?? [];
        const isDominated = frontier.some(
          (f) => f.cost <= nextCost && f.fallDamage <= nextFallDamage
        );
        if (isDominated) {
          continue;
        }

        // Add to frontier and filter out any existing states that next dominates
        const newFrontier = frontier.filter(
          (f) => !(nextCost <= f.cost && nextFallDamage <= f.fallDamage)
        );
        newFrontier.push({ cost: nextCost, fallDamage: nextFallDamage });
        frontiers.set(neighborKey, newFrontier);

        // 7. Update best destination if next is better for landing:
        // Priority: strictly lower fallDamage, or equal fallDamage with lower cost
        const existingBest = bestDestinations.get(neighborKey);
        if (
          !existingBest ||
          nextFallDamage < existingBest.fallDamage ||
          (nextFallDamage === existingBest.fallDamage && nextCost < existingBest.cost)
        ) {
          bestDestinations.set(neighborKey, {
            coord: neighbor,
            cost: nextCost,
            fallDamage: nextFallDamage,
            path: nextPath
          });
        }

        queue.push({
          coord: neighbor,
          cost: nextCost,
          fallDamage: nextFallDamage,
          path: nextPath
        });
      }
    }

    return bestDestinations;
  }

  /**
   * Returns all hexes reachable from origin within the given movement budget.
   */
  public getReachableHexes(
    origin: HexCoord,
    moveBudget: number,
    _maxJumpElevation: number = DISPLACEMENT_CONFIG.maxJumpElevation
  ): HexCoord[] {
    const reachableMap = this.getReachableHexInfo(origin, moveBudget);
    return Array.from(reachableMap.values()).map((info) => info.coord);
  }

  /**
   * Finds the optimal path from origin to destination within the movement budget,
   * returning total MP cost, anticipated fall damage, and reconstructed coordinates.
   */
  public findPath(
    origin: HexCoord,
    destination: HexCoord,
    moveBudget: number
  ): ReachableTileInfo | undefined {
    return this.getReachableHexInfo(origin, moveBudget).get(toHexKey(destination));
  }

  /**
   * Evaluates Line-of-Sight (LoS) between two hexes using continuous 3D slope raycasting.
   * Ray equation: h_ray(t) = fromElevation + t * (toElevation - fromElevation)
   * LoS is blocked if any intermediate hex:
   * 1. Does not exist in the arena (void), OR
   * 2. Has an elevation strictly higher than h_ray(t) (terrain hill), OR
   * 3. Has an elevation >= h_ray(t) along an intersecting slope, OR
   * 4. Is occupied by another unit or is an obstacle at or above the ray elevation.
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

    const n = line.length - 1;
    const hFrom = fromTile.elevation;
    const hTo = toTile.elevation;
    const EPSILON = 1e-5;

    // Check intermediate hexes (excluding source and target)
    for (let i = 1; i < n; i++) {
      const stepCoord = line[i];
      const stepTile = this.getTile(stepCoord);

      // Void / missing tile blocks LoS
      if (!stepTile) {
        return false;
      }

      const t = i / n;
      const hRay = hFrom + t * (hTo - hFrom);

      // 1. Higher terrain blocks
      if (stepTile.elevation > hRay + EPSILON) {
        return false;
      }

      // 2. Terrain at ray level blocks if slope intersects it
      if (hFrom !== hTo && stepTile.elevation >= hRay - EPSILON) {
        return false;
      }

      // 3. Obstacle or intervening unit blocks if its tile is at or above ray level
      if (stepTile.occupiedByUnitId || !stepTile.isWalkable) {
        if (stepTile.elevation >= hRay - EPSILON) {
          return false;
        }
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

    const dist = hexDistance(attackerCoord, targetCoord);
    if (dist === 0) {
      return { finalCoord: targetCoord, isCollided: false };
    }

    const dir = getDirectionBetween(attackerCoord, targetCoord);
    const stepDir = POINTY_HEX_DIRECTIONS[dir];

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

