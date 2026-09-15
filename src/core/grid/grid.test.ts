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
  getHexLine
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

  it('blocks movement pathing through high elevation cliffs', () => {
    const tiles: HexTile[] = [
      { coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true },
      // High cliff elevation 2 (+2 jump > max 1)
      { coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true },
      // Low ramp elevation 1 (+1 jump <= max 1)
      { coord: { q: 0, r: 1 }, elevation: 1, isWalkable: true }
    ];
    const arena = new Arena(tiles);

    const reachable = arena.getReachableHexes({ q: 0, r: 0 }, 1);
    expect(reachable).toHaveLength(1);
    expect(reachable[0]).toEqual({ q: 0, r: 1 });
  });

  it('validates Line-of-Sight blocking by both terrain and units', () => {
    const arena = createRadialArena(3);
    const source: HexCoord = { q: 0, r: 0 };
    const target: HexCoord = { q: 2, r: 0 };
    const intermediate: HexCoord = { q: 1, r: 0 };

    // Clear LoS
    expect(arena.hasLineOfSight(source, target)).toBe(true);

    // Intermediate unit blocks LoS (screening)
    arena.setUnitPosition('tank', intermediate);
    expect(arena.hasLineOfSight(source, target)).toBe(false);
    arena.removeUnit('tank');
    expect(arena.hasLineOfSight(source, target)).toBe(true);

    // High terrain obstacle blocks LoS
    arena.setTile({ coord: intermediate, elevation: 2, isWalkable: true });
    expect(arena.hasLineOfSight(source, target)).toBe(false);
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
  });
});
