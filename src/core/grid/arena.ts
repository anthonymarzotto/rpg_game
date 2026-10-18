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

export type LoSObstructionType = 'VOID' | 'HILL' | 'OBSTACLE' | 'UNIT';

export interface LineOfSightObstruction {
  readonly coord: HexCoord;
  readonly type: LoSObstructionType;
  readonly elevation: number;
  readonly rayElevation: number;
  readonly label?: string;
  readonly occupiedByUnitId?: string;
}

export interface LineOfSightOptions {
  readonly isUnitScreening?: (unitId: string) => boolean;
}

export interface KnockbackResult {
  readonly finalCoord: HexCoord;
  readonly isCollided: boolean;
  readonly collisionType?: CollisionType;
  readonly collidingUnitId?: string;
  readonly fallDamage?: number;
  readonly plungedElevationDelta?: number;
}

/**
 * Calculates raw unmitigated fall impact damage for an elevation delta (from -> to).
 * Drops of dh <= -2 inflict |dh| * fallDamagePerElevation. Drops of dh >= -1 inflict 0.
 */
export function calculateRawFallDamage(elevationDelta: number): number {
  return elevationDelta <= -2
    ? Math.abs(elevationDelta) * DISPLACEMENT_CONFIG.fallDamagePerElevation
    : 0;
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
        const stepFallDamage = calculateRawFallDamage(dh);
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
    moveBudget: number
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
   * Evaluates Line-of-Sight (LoS) between two hexes using continuous 3D slope raycasting,
   * returning any intermediate obstruction that blocks the ray.
   * Ray equation: h_ray(t) = fromElevation + t * (toElevation - fromElevation)
   * LoS is blocked if any intermediate hex:
   * 1. Does not exist in the arena (void), OR
   * 2. Has an elevation strictly higher than h_ray(t) (terrain hill), OR
   * 3. Is an impassable obstacle at or above the ray elevation, OR
   * 4. Is occupied by a screening unit at or above the ray elevation.
   * Stepped terraces along a downward slope (H_tile <= h_ray) do NOT block high ground sightlines.
   */
  public getLineOfSightObstruction(
    from: HexCoord,
    to: HexCoord,
    options?: LineOfSightOptions
  ): LineOfSightObstruction | null {
    const fromTile = this.getTile(from);
    const toTile = this.getTile(to);
    if (!fromTile || !toTile) {
      return {
        coord: !fromTile ? from : to,
        type: 'VOID',
        elevation: 0,
        rayElevation: 0
      };
    }

    const line = getHexLine(from, to);
    if (line.length <= 2) {
      // Adjacent hexes always have direct Line-of-Sight
      return null;
    }

    const n = line.length - 1;
    const hFrom = fromTile.elevation;
    const hTo = toTile.elevation;
    const EPSILON = 1e-5;

    // Check intermediate hexes (excluding source and target)
    for (let i = 1; i < n; i++) {
      const stepCoord = line[i];
      const stepTile = this.getTile(stepCoord);

      const t = i / n;
      const hRay = hFrom + t * (hTo - hFrom);

      // Void / missing tile blocks LoS
      if (!stepTile) {
        return {
          coord: stepCoord,
          type: 'VOID',
          elevation: 0,
          rayElevation: hRay
        };
      }

      // 1. Obstacle blocks if at or above ray elevation
      if (!stepTile.isWalkable) {
        if (stepTile.elevation >= hRay - EPSILON) {
          return {
            coord: stepCoord,
            type: 'OBSTACLE',
            elevation: stepTile.elevation,
            rayElevation: hRay,
            label: stepTile.label
          };
        }
      }

      // 2. Terrain strictly higher than ray blocks (hills)
      if (stepTile.elevation > hRay + EPSILON) {
        return {
          coord: stepCoord,
          type: 'HILL',
          elevation: stepTile.elevation,
          rayElevation: hRay,
          label: stepTile.label
        };
      }

      // 3. Intervening screening unit blocks if at or above ray elevation
      if (stepTile.occupiedByUnitId) {
        const isScreening = options?.isUnitScreening
          ? options.isUnitScreening(stepTile.occupiedByUnitId)
          : true;
        if (isScreening && stepTile.elevation >= hRay - EPSILON) {
          return {
            coord: stepCoord,
            type: 'UNIT',
            elevation: stepTile.elevation,
            rayElevation: hRay,
            occupiedByUnitId: stepTile.occupiedByUnitId
          };
        }
      }
    }

    return null;
  }

  /**
   * Evaluates Line-of-Sight (LoS) between two hexes using continuous 3D slope raycasting.
   */
  public hasLineOfSight(
    from: HexCoord,
    to: HexCoord,
    options?: LineOfSightOptions
  ): boolean {
    return this.getLineOfSightObstruction(from, to, options) === null;
  }

  /**
   * Calculates knockback displacement along the attacker -> target vector.
   * If the destination is off-map, unwalkable, blocked by high elevation (cliff >= minCliffSlamElevationDelta),
   * or occupied by another unit, displacement halts and a wall/cliff-slam collision is registered.
   * If the knockback plunges down a ledge (dh <= -2), unmitigated fall impact damage is accumulated.
   */
  public calculateKnockback(
    attackerCoord: HexCoord,
    targetCoord: HexCoord,
    distance = 1,
    minCliffSlamElevationDelta: number = DISPLACEMENT_CONFIG.minCliffSlamElevationDelta,
    options?: { canVaultOnKnockback?: boolean }
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
    let totalFallDamage = 0;
    let maxPlungedDelta = 0;

    for (let i = 0; i < distance; i++) {
      const nextCoord = hexAdd(current, stepDir);
      const nextTile = this.getTile(nextCoord);

      // 1. Off-map / Void collision
      if (!nextTile) {
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'VOID',
          fallDamage: totalFallDamage > 0 ? totalFallDamage : undefined,
          plungedElevationDelta: maxPlungedDelta > 0 ? maxPlungedDelta : undefined
        };
      }

      // 2. Unwalkable wall collision (supports vaulting over 1-hex obstacles)
      if (!nextTile.isWalkable) {
        if (options?.canVaultOnKnockback) {
          const vaultCoord = hexAdd(nextCoord, stepDir);
          const vaultTile = this.getTile(vaultCoord);
          if (vaultTile && vaultTile.isWalkable && !vaultTile.occupiedByUnitId) {
            current = vaultCoord;
            continue;
          }
        }
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'WALL',
          fallDamage: totalFallDamage > 0 ? totalFallDamage : undefined,
          plungedElevationDelta: maxPlungedDelta > 0 ? maxPlungedDelta : undefined
        };
      }

      // 3. Cliff / High elevation collision (supports vaulting up onto cliff top)
      const currentTile = this.getTile(current)!;
      const elevationDelta = nextTile.elevation - currentTile.elevation;
      if (elevationDelta >= minCliffSlamElevationDelta) {
        if (options?.canVaultOnKnockback && !nextTile.occupiedByUnitId) {
          current = nextCoord;
          continue;
        }
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'CLIFF',
          fallDamage: totalFallDamage > 0 ? totalFallDamage : undefined,
          plungedElevationDelta: maxPlungedDelta > 0 ? maxPlungedDelta : undefined
        };
      }

      // 4. Occupied unit collision (body slam)
      if (nextTile.occupiedByUnitId) {
        return {
          finalCoord: current,
          isCollided: true,
          collisionType: 'UNIT',
          collidingUnitId: nextTile.occupiedByUnitId,
          fallDamage: totalFallDamage > 0 ? totalFallDamage : undefined,
          plungedElevationDelta: maxPlungedDelta > 0 ? maxPlungedDelta : undefined
        };
      }

      // 5. Plunging ledge drop (dh <= -2)
      const stepFallDamage = calculateRawFallDamage(elevationDelta);
      if (stepFallDamage > 0) {
        totalFallDamage += stepFallDamage;
        maxPlungedDelta = Math.max(maxPlungedDelta, Math.abs(elevationDelta));
      }

      current = nextCoord;
    }

    return {
      finalCoord: current,
      isCollided: false,
      fallDamage: totalFallDamage > 0 ? totalFallDamage : undefined,
      plungedElevationDelta: maxPlungedDelta > 0 ? maxPlungedDelta : undefined
    };
  }
}

// Re-export arena generation templates for convenience
export { createRadialArena } from './templates';

