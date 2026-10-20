import { describe, it, expect } from 'vitest';
import {
  HexCoord,
  hexDistance,
  hexAdd,
  hexSubtract,
  hexEquals,
  toHexKey,
  parseHexKey,
  getHexNeighbors,
  getHexRing,
  getHexesInRange,
  getHexLine,
  getHexRaySteps
} from './hex';
import { Arena, HexTile } from './arena';
import { createRadialArena } from './templates';


describe('Hex Grid Coordinate Mathematics (Pointy-Topped)', () => {
  it('calculates accurate distance between coordinates', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 3 })).toBe(3);
    expect(hexDistance({ q: -2, r: 1 }, { q: 2, r: -1 })).toBe(4);
  });

  it('performs vector addition and subtraction', () => {
    const a: HexCoord = { q: 1, r: 2 };
    const b: HexCoord = { q: -1, r: 3 };

    expect(hexAdd(a, b)).toEqual({ q: 0, r: 5 });
    expect(hexSubtract(a, b)).toEqual({ q: 2, r: -1 });
    expect(hexEquals(a, { q: 1, r: 2 })).toBe(true);
  });

  it('serializes and deserializes coordinate keys', () => {
    const coord: HexCoord = { q: -3, r: 7 };
    const key = toHexKey(coord);
    expect(key).toBe('-3,7');
    expect(parseHexKey(key)).toEqual(coord);
  });

  it('returns all 6 valid neighbors for pointy-topped hexes', () => {
    const center: HexCoord = { q: 0, r: 0 };
    const neighbors = getHexNeighbors(center);

    expect(neighbors).toHaveLength(6);
    for (const neighbor of neighbors) {
      expect(hexDistance(center, neighbor)).toBe(1);
    }
  });

  it('generates accurate range rings and disks', () => {
    const center: HexCoord = { q: 0, r: 0 };

    // Rings
    expect(getHexRing(center, 0)).toHaveLength(1);
    expect(getHexRing(center, 1)).toHaveLength(6);
    expect(getHexRing(center, 2)).toHaveLength(12);

    // Disks: 1 + 6 = 7, 7 + 12 = 19, 19 + 18 = 37
    expect(getHexesInRange(center, 1)).toHaveLength(7);
    expect(getHexesInRange(center, 2)).toHaveLength(19);
    expect(getHexesInRange(center, 3)).toHaveLength(37);
  });

  it('computes deterministic straight line raycasting', () => {
    const from: HexCoord = { q: 0, r: 0 };
    const to: HexCoord = { q: 3, r: 0 };
    const line = getHexLine(from, to);

    expect(line).toHaveLength(4);
    expect(line[0]).toEqual({ q: 0, r: 0 });
    expect(line[1]).toEqual({ q: 1, r: 0 });
    expect(line[2]).toEqual({ q: 2, r: 0 });
    expect(line[3]).toEqual({ q: 3, r: 0 });
  });

  it('identifies interior and shared-edge steps with dual opposite-epsilon cube rounding', () => {
    // 1. Cardinal ray passes through hex interiors (no shared edges)
    const cardinalSteps = getHexRaySteps({ q: 0, r: 0 }, { q: 2, r: 0 });
    expect(cardinalSteps).toHaveLength(3);
    expect(cardinalSteps[1].isEdge).toBe(false);
    expect(cardinalSteps[1].hexes).toEqual([{ q: 1, r: 0 }]);

    // 2. Off-axis ray (Leander -> Theron) passes directly along the shared edge between (2, -3) and (2, -2)
    const edgeSteps = getHexRaySteps({ q: 3, r: -3 }, { q: 1, r: -2 });
    expect(edgeSteps).toHaveLength(3);
    expect(edgeSteps[1].isEdge).toBe(true);
    expect(edgeSteps[1].hexes).toHaveLength(2);
    // Both flanking hexes are present
    expect(edgeSteps[1].hexes).toContainEqual({ q: 2, r: -3 });
    expect(edgeSteps[1].hexes).toContainEqual({ q: 2, r: -2 });

    // 3. Reciprocal symmetry: Theron -> Leander identifies the exact same two flanking hexes
    const reverseSteps = getHexRaySteps({ q: 1, r: -2 }, { q: 3, r: -3 });
    expect(reverseSteps).toHaveLength(3);
    expect(reverseSteps[1].isEdge).toBe(true);
    expect(reverseSteps[1].hexes).toContainEqual({ q: 2, r: -3 });
    expect(reverseSteps[1].hexes).toContainEqual({ q: 2, r: -2 });
  });
});

describe('Arena Spatial Engine', () => {
  it('manages unit placement and two-way position tracking', () => {
    const arena = createRadialArena(3);
    const startCoord: HexCoord = { q: 0, r: 0 };

    arena.setUnitPosition('hero', startCoord);
    expect(arena.getUnitPosition('hero')).toEqual(startCoord);
    expect(arena.getUnitAt(startCoord)).toBe('hero');

    // Move to adjacent tile
    const nextCoord: HexCoord = { q: 1, r: 0 };
    arena.setUnitPosition('hero', nextCoord);
    expect(arena.getUnitPosition('hero')).toEqual(nextCoord);
    expect(arena.getUnitAt(startCoord)).toBeUndefined();
    expect(arena.getUnitAt(nextCoord)).toBe('hero');

    // Remove unit
    arena.removeUnit('hero');
    expect(arena.getUnitPosition('hero')).toBeUndefined();
    expect(arena.getUnitAt(nextCoord)).toBeUndefined();
  });

  it('calculates reachable hexes respecting single-unit occupancy', () => {
    const arena = createRadialArena(2);
    const origin: HexCoord = { q: 0, r: 0 };

    // Place an obstacle unit blocking East neighbor (1, 0)
    arena.setUnitPosition('ally', { q: 1, r: 0 });

    const reachable = arena.getReachableHexes(origin, 1);
    // 6 neighbors minus 1 blocked = 5 reachable hexes
    expect(reachable).toHaveLength(5);
    expect(reachable.some((c) => hexEquals(c, { q: 1, r: 0 }))).toBe(false);
  });

  it('calculates weighted elevation step costs and enforces climb barriers', () => {
    const tiles: HexTile[] = [
      { coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true },
      // +1 ramp (costs 2 MP)
      { coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true },
      // +2 cliff (costs 3 MP)
      { coord: { q: 0, r: 1 }, elevation: 2, isWalkable: true },
      // +3 impassable wall (costs > maxClimbElevation)
      { coord: { q: -1, r: 1 }, elevation: 3, isWalkable: true }
    ];
    const arena = new Arena(tiles);

    // 1 MP budget: cannot climb up to elevation 1, 2, or 3
    const reach1 = arena.getReachableHexes({ q: 0, r: 0 }, 1);
    expect(reach1).toHaveLength(0);

    // 2 MP budget: can reach elevation 1 (+1 step costs 2 MP)
    const reach2 = arena.getReachableHexes({ q: 0, r: 0 }, 2);
    expect(reach2).toHaveLength(1);
    expect(reach2[0]).toEqual({ q: 1, r: 0 });

    // 3 MP budget: can reach elevation 1 and elevation 2 (+2 step costs 3 MP)
    const reach3 = arena.getReachableHexes({ q: 0, r: 0 }, 3);
    expect(reach3).toHaveLength(2);
    expect(reach3.some((c) => hexEquals(c, { q: 1, r: 0 }))).toBe(true);
    expect(reach3.some((c) => hexEquals(c, { q: 0, r: 1 }))).toBe(true);
    // Elevation 3 is impassable (climb rise >= 3)
    expect(reach3.some((c) => hexEquals(c, { q: -1, r: 1 }))).toBe(false);
  });

  it('prioritizes safe routes with zero fall damage over hazardous cliff plunges when within budget', () => {
    // Top plateau at (0, 0, h=2)
    // Direct drop to cliff bottom at (1, 0, h=0): dh = -2, 8 fall damage, 1 MP
    // Gentle ramp via (0, 1, h=1) -> (1, 0, h=0): dh = -1, dh = -1, 0 fall damage, 2 MP
    const tiles: HexTile[] = [
      { coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true },
      { coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true },
      { coord: { q: 0, r: 1 }, elevation: 1, isWalkable: true }
    ];
    const arena = new Arena(tiles);

    // Budget 2 MP: Can take the gentle ramp (0,0) -> (0,1) -> (1,0)
    const infoMap = arena.getReachableHexInfo({ q: 0, r: 0 }, 2);
    const targetInfo = infoMap.get(toHexKey({ q: 1, r: 0 }));

    expect(targetInfo).toBeDefined();
    expect(targetInfo!.fallDamage).toBe(0);
    expect(targetInfo!.cost).toBe(2);
    expect(targetInfo!.path).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: 1 },
      { q: 1, r: 0 }
    ]);
  });

  it('selects hazardous cliff jump when the safe route is out of movement budget', () => {
    // Top plateau at (0, 0, h=2)
    // Direct drop to (1, 0, h=0): 1 MP, 8 fall damage
    // Long safe ramp around: 3 MP
    const tiles: HexTile[] = [
      { coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true },
      { coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true },
      // Ramp requires 3 steps to reach (1, 0)
      { coord: { q: -1, r: 1 }, elevation: 1, isWalkable: true },
      { coord: { q: 0, r: 1 }, elevation: 1, isWalkable: true }
    ];
    const arena = new Arena(tiles);

    // Budget 1 MP: Safe ramp is out of budget, but cliff jump is reachable
    const infoMap = arena.getReachableHexInfo({ q: 0, r: 0 }, 1);
    const targetInfo = infoMap.get(toHexKey({ q: 1, r: 0 }));

    expect(targetInfo).toBeDefined();
    expect(targetInfo!.fallDamage).toBe(8);
    expect(targetInfo!.cost).toBe(1);
    expect(targetInfo!.path).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 }
    ]);
  });

  it('validates discrete elevation querying and clamping in Arena', () => {
    const arena = new Arena([
      { coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true },
      { coord: { q: 1, r: 0 }, elevation: 5, isWalkable: true } // should clamp to 3
    ]);

    expect(arena.getElevation({ q: 0, r: 0 })).toBe(2);
    expect(arena.getElevation({ q: 1, r: 0 })).toBe(3);
    expect(arena.getElevation({ q: 5, r: 5 })).toBe(0); // missing tile defaults to 0
  });

  it('validates 3D Line-of-Sight slope raycasting with high-ground vantage', () => {
    const arena = createRadialArena(3);
    const source: HexCoord = { q: 0, r: 0 };
    const intermediate: HexCoord = { q: 1, r: 0 };
    const target: HexCoord = { q: 2, r: 0 };

    // 1. Flat ground: intermediate unit or obstacle blocks
    expect(arena.hasLineOfSight(source, target)).toBe(true);
    arena.setUnitPosition('tank', intermediate);
    expect(arena.hasLineOfSight(source, target)).toBe(false);
    arena.removeUnit('tank');

    // 2. High-ground shooter (elevation 2) shoots over lower obstacle (elevation 0)
    arena.setTile({ coord: source, elevation: 2, isWalkable: true });
    arena.setTile({ coord: intermediate, elevation: 0, isWalkable: false, terrainType: 'OBSTACLE' });
    arena.setTile({ coord: target, elevation: 0, isWalkable: true });

    // Midpoint ray height is 1.0 > obstacle elevation 0 -> LoS is clear!
    expect(arena.hasLineOfSight(source, target)).toBe(true);

    // 3. Stepped terrace at elevation 1 does NOT block LoS down the slope (hRay(0.5) = 1.0, H_tile = 1 <= hRay)
    arena.setTile({ coord: intermediate, elevation: 1, isWalkable: true });
    expect(arena.hasLineOfSight(source, target)).toBe(true);

    // 3b. Higher hill (elevation 2) DOES block LoS along the slope (H_tile 2 > hRay 1.0)
    arena.setTile({ coord: intermediate, elevation: 2, isWalkable: true });
    expect(arena.hasLineOfSight(source, target)).toBe(false);

    // 3c. Impassable obstacle on stepped terrace (elevation 1) blocks LoS (H_tile 1 >= hRay 1.0)
    arena.setTile({ coord: intermediate, elevation: 1, isWalkable: false });
    expect(arena.hasLineOfSight(source, target)).toBe(false);

    // 3d. Intervening stealthed unit on stepped terrace does not screen LoS when screening is bypassed
    arena.setTile({ coord: intermediate, elevation: 1, isWalkable: true });
    arena.setUnitPosition('scout', intermediate);
    expect(arena.hasLineOfSight(source, target, { isUnitScreening: () => false })).toBe(true);
    expect(arena.hasLineOfSight(source, target, { isUnitScreening: () => true })).toBe(false);
    arena.removeUnit('scout');

    // 4. Low-ground shooter at elevation 0 cannot shoot over hill to target at elevation 0
    arena.setTile({ coord: source, elevation: 0, isWalkable: true });
    arena.setTile({ coord: intermediate, elevation: 1, isWalkable: true });
    arena.setTile({ coord: target, elevation: 0, isWalkable: true });
    expect(arena.hasLineOfSight(source, target)).toBe(false);
  });

  it('evaluates dual-hex edge traversal Line-of-Sight permissively and symmetrically', () => {
    const arena = createRadialArena(3);
    const leander: HexCoord = { q: 3, r: -3 };
    const theron: HexCoord = { q: 1, r: -2 };
    const flankA: HexCoord = { q: 2, r: -3 };
    const flankB: HexCoord = { q: 2, r: -2 };

    // 1. Both flanking hexes are empty -> LoS is clear
    expect(arena.hasLineOfSight(leander, theron)).toBe(true);
    expect(arena.hasLineOfSight(theron, leander)).toBe(true);

    // 2. Exact user scenario: Enemy occupies flankA (2, -3), flankB (2, -2) is open
    // Permissive dual-hex traversal allows LoS through the open flank
    arena.setUnitPosition('enemy-2', flankA);
    expect(arena.hasLineOfSight(leander, theron)).toBe(true);
    expect(arena.hasLineOfSight(theron, leander)).toBe(true);

    // 3. Mirror scenario: Unit on flankB, flankA is open -> still clear
    arena.removeUnit('enemy-2');
    arena.setUnitPosition('enemy-2', flankB);
    expect(arena.hasLineOfSight(leander, theron)).toBe(true);
    expect(arena.hasLineOfSight(theron, leander)).toBe(true);

    // 4. Solid obstacle on one flank, unit on other flank -> BOTH blocked -> LoS blocked!
    arena.setTile({ coord: flankA, elevation: 0, isWalkable: false, label: 'RUINS' });
    expect(arena.hasLineOfSight(leander, theron)).toBe(false);
    expect(arena.hasLineOfSight(theron, leander)).toBe(false);
    // Obstruction priority attributes to solid obstacle over unit
    const obs = arena.getLineOfSightObstruction(leander, theron);
    expect(obs?.type).toBe('OBSTACLE');
    expect(obs?.label).toBe('RUINS');

    // 5. Units on both flanks -> BOTH blocked -> LoS blocked!
    arena.setTile({ coord: flankA, elevation: 0, isWalkable: true });
    arena.setUnitPosition('enemy-1', flankA);
    expect(arena.hasLineOfSight(leander, theron)).toBe(false);
    expect(arena.hasLineOfSight(theron, leander)).toBe(false);

    // Clean up units
    arena.removeUnit('enemy-1');
    arena.removeUnit('enemy-2');

    // 6. 3D Elevation along edge:
    // Leander at elevation 2, Theron at elevation 0. Ray height at midpoint is 1.0.
    arena.setTile({ coord: leander, elevation: 2, isWalkable: true });
    arena.setTile({ coord: theron, elevation: 0, isWalkable: true });
    // flankA has hill at elevation 2 (H_tile 2 > hRay 1.0 -> blocked on flankA)
    // flankB is terrace at elevation 1 (H_tile 1 <= hRay 1.0 -> clear on flankB)
    arena.setTile({ coord: flankA, elevation: 2, isWalkable: true });
    arena.setTile({ coord: flankB, elevation: 1, isWalkable: true });
    // Because flankB slope matches ray, LoS is clear through flankB!
    expect(arena.hasLineOfSight(leander, theron)).toBe(true);

    // If flankB is also elevated to 2 (both flanks are hills above ray height 1.0) -> blocked!
    arena.setTile({ coord: flankB, elevation: 2, isWalkable: true });
    expect(arena.hasLineOfSight(leander, theron)).toBe(false);
  });

  describe('Knockback & Wall-Slam Collision', () => {
    it('displaces target 1 hex along attacker vector when destination is clear', () => {
      const arena = createRadialArena(3);
      const attacker: HexCoord = { q: 0, r: 0 };
      const target: HexCoord = { q: 1, r: 0 };

      const result = arena.calculateKnockback(attacker, target, 1);
      expect(result.isCollided).toBe(false);
      expect(result.finalCoord).toEqual({ q: 2, r: 0 });
    });

    it('detects VOID collision and halts displacement at map border', () => {
      const arena = createRadialArena(2);
      // Target is at outer edge of radius 2
      const attacker: HexCoord = { q: 1, r: 0 };
      const target: HexCoord = { q: 2, r: 0 };

      // Knockback pushes toward (3, 0) which is off the radius-2 arena
      const result = arena.calculateKnockback(attacker, target, 1);
      expect(result.isCollided).toBe(true);
      expect(result.collisionType).toBe('VOID');
      expect(result.finalCoord).toEqual(target);
    });

    it('detects UNIT collision (body slam) when pushed into another unit', () => {
      const arena = createRadialArena(3);
      const attacker: HexCoord = { q: 0, r: 0 };
      const target: HexCoord = { q: 1, r: 0 };
      const bystander: HexCoord = { q: 2, r: 0 };

      arena.setUnitPosition('target', target);
      arena.setUnitPosition('bystander', bystander);

      const result = arena.calculateKnockback(attacker, target, 1);
      expect(result.isCollided).toBe(true);
      expect(result.collisionType).toBe('UNIT');
      expect(result.collidingUnitId).toBe('bystander');
      expect(result.finalCoord).toEqual(target);
    });

    it('halts displacement and inflicts CLIFF collision when pushed into elevation difference >= minCliffSlamElevationDelta', () => {
      const arena = createRadialArena(3);
      const attacker: HexCoord = { q: 0, r: 0 };
      const target: HexCoord = { q: 1, r: 0 };
      const cliff: HexCoord = { q: 2, r: 0 };

      // Attacker at 0, target at 0, cliff at 2 (delta = +2 >= 2)
      arena.setTile({ coord: cliff, elevation: 2, isWalkable: true });

      const result = arena.calculateKnockback(attacker, target, 1);
      expect(result.isCollided).toBe(true);
      expect(result.collisionType).toBe('CLIFF');
      expect(result.finalCoord).toEqual(target);
    });

    it('ascends terrace cleanly without collision when pushed onto delta h = 1', () => {
      const arena = createRadialArena(3);
      const attacker: HexCoord = { q: 0, r: 0 };
      const target: HexCoord = { q: 1, r: 0 };
      const terrace: HexCoord = { q: 2, r: 0 };

      // Target at 0, terrace at 1 (delta = +1 < 2)
      arena.setTile({ coord: terrace, elevation: 1, isWalkable: true });

      const result = arena.calculateKnockback(attacker, target, 1);
      expect(result.isCollided).toBe(false);
      expect(result.finalCoord).toEqual(terrace);
      expect(result.fallDamage).toBeUndefined();
    });

    it('inflicts unmitigated fall damage when knocked over a ledge (delta h <= -2)', () => {
      const arena = createRadialArena(3);
      const attacker: HexCoord = { q: 0, r: 0 };
      const target: HexCoord = { q: 1, r: 0 };
      const valley: HexCoord = { q: 2, r: 0 };

      // Attacker at 2, target at 2, valley at 0 (delta = -2)
      arena.setTile({ coord: attacker, elevation: 2, isWalkable: true });
      arena.setTile({ coord: target, elevation: 2, isWalkable: true });
      arena.setTile({ coord: valley, elevation: 0, isWalkable: true });

      const result = arena.calculateKnockback(attacker, target, 1);
      expect(result.isCollided).toBe(false);
      expect(result.finalCoord).toEqual(valley);
      // Fall damage: |-2| * 4 = 8
      expect(result.fallDamage).toBe(8);
      expect(result.plungedElevationDelta).toBe(2);
    });

    it('causes no fall damage when knocked down a 1-level step (delta h = -1)', () => {
      const arena = createRadialArena(3);
      const attacker: HexCoord = { q: 0, r: 0 };
      const target: HexCoord = { q: 1, r: 0 };
      const low: HexCoord = { q: 2, r: 0 };

      arena.setTile({ coord: attacker, elevation: 1, isWalkable: true });
      arena.setTile({ coord: target, elevation: 1, isWalkable: true });
      arena.setTile({ coord: low, elevation: 0, isWalkable: true });

      const result = arena.calculateKnockback(attacker, target, 1);
      expect(result.isCollided).toBe(false);
      expect(result.finalCoord).toEqual(low);
      expect(result.fallDamage).toBeUndefined();
    });
  });

  describe('Tile Collection & Metadata', () => {
    it('returns all tiles in the arena via getAllTiles', () => {
      const arena = createRadialArena(2);
      const tiles = arena.getAllTiles();
      // Radius 2 arena: 1 + 6 + 12 = 19 tiles
      expect(tiles).toHaveLength(19);
      expect(tiles.every((t) => t.coord && typeof t.isWalkable === 'boolean')).toBe(true);
    });

    it('preserves custom tile metadata such as label and terrainType', () => {
      const arena = new Arena([
        { coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true, terrainType: 'GRASS' },
        { coord: { q: 0, r: 1 }, elevation: 1, isWalkable: false, label: 'PILLAR' }
      ]);
      const tiles = arena.getAllTiles();
      expect(tiles).toHaveLength(2);
      const pillar = arena.getTile({ q: 0, r: 1 });
      expect(pillar?.label).toBe('PILLAR');
      expect(pillar?.isWalkable).toBe(false);
    });
  });
});

