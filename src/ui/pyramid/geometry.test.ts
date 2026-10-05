import { describe, it, expect } from 'vitest';
import {
  parseCoordKey,
  getOffNodeWaypointPosition,
  getOffNodeWaypoint,
  POINTS_BY_ID
} from './geometry';

describe('pyramid geometry off-node waypoint calculations', () => {
  it('parses coordinate keys into ArchetypePoints', () => {
    expect(parseCoordKey('1,1,0')).toEqual({ fighter: 1, rogue: 1, mage: 0 });
    expect(parseCoordKey('2,1,3')).toEqual({ fighter: 2, rogue: 1, mage: 3 });
  });

  it('calculates off-node waypoint position for 1,1,0 exactly between warrior and thief', () => {
    const warrior = POINTS_BY_ID.get('warrior')!;
    const thief = POINTS_BY_ID.get('thief')!;

    const pos = getOffNodeWaypointPosition({ fighter: 1, rogue: 1, mage: 0 });

    const expectedX = Number(((warrior.x + thief.x) / 2).toFixed(1));
    const expectedY = Number(((warrior.y + thief.y) / 2).toFixed(1));

    expect(pos.x).toBeCloseTo(expectedX, 1);
    expect(pos.y).toBeCloseTo(expectedY, 1);
  });

  it('calculates tri-centroid 1,1,1 at pyramid geometric center (x ≈ 0)', () => {
    const pos = getOffNodeWaypointPosition({ fighter: 1, rogue: 1, mage: 1 });
    // Equilateral symmetry around x = 0
    expect(pos.x).toBeCloseTo(0, 1);
  });

  it('constructs a StarlightWaypoint descriptor', () => {
    const wp = getOffNodeWaypoint('1,1,0');
    expect(wp.coordKey).toBe('1,1,0');
    expect(wp.points).toEqual({ fighter: 1, rogue: 1, mage: 0 });
    expect(typeof wp.x).toBe('number');
    expect(typeof wp.y).toBe('number');
  });
});
