/**
 * Hexagonal Grid Mathematics for Pointy-Topped Hexes.
 * Uses Axial (q, r) as primary storage and Cube (x, y, z) for distance and interpolation.
 */

export interface HexCoord {
  readonly q: number;
  readonly r: number;
}

export interface CubeCoord {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * 6 Pointy-topped neighbor directional vectors.
 * 0: East (+1, 0)
 * 1: Northeast (+1, -1)
 * 2: Northwest (0, -1)
 * 3: West (-1, 0)
 * 4: Southwest (-1, +1)
 * 5: Southeast (0, +1)
 */
export type HexDirection = 0 | 1 | 2 | 3 | 4 | 5;

export const HEX_DIRECTIONS = {
  EAST: 0 as HexDirection,
  NORTHEAST: 1 as HexDirection,
  NORTHWEST: 2 as HexDirection,
  WEST: 3 as HexDirection,
  SOUTHWEST: 4 as HexDirection,
  SOUTHEAST: 5 as HexDirection
} as const;

export type CombatArc = 'FRONT' | 'FLANK' | 'REAR';

export const POINTY_HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
] as const;

const FACING_ANGLES = [0, 300, 240, 180, 120, 60] as const;

/**
 * Returns the SVG rotation angle in degrees (clockwise) for a given hex facing.
 */
export function getFacingAngleDegrees(facing: HexDirection): number {
  return FACING_ANGLES[facing];
}

const SQRT3 = Math.sqrt(3);

/**
 * Determines the nearest of the 6 hex directions pointing from `from` to `to`.
 * Works for adjacent neighbors as well as distant hexes.
 */
export function getDirectionBetween(from: HexCoord, to: HexCoord): HexDirection {
  const dq = to.q - from.q;
  const dr = to.r - from.r;
  if (dq === 0 && dr === 0) {
    return HEX_DIRECTIONS.EAST;
  }

  const dx = SQRT3 * dq + (SQRT3 / 2) * dr;
  const dy = 1.5 * dr;
  const angleRad = Math.atan2(dy, dx);
  let deg = (angleRad * 180) / Math.PI;
  if (deg < 0) {
    deg += 360;
  }

  if (deg >= 330 || deg < 30) return HEX_DIRECTIONS.EAST;
  if (deg >= 30 && deg < 90) return HEX_DIRECTIONS.SOUTHEAST;
  if (deg >= 90 && deg < 150) return HEX_DIRECTIONS.SOUTHWEST;
  if (deg >= 150 && deg < 210) return HEX_DIRECTIONS.WEST;
  if (deg >= 210 && deg < 270) return HEX_DIRECTIONS.NORTHWEST;
  return HEX_DIRECTIONS.NORTHEAST;
}

/**
 * Evaluates the tactical combat arc of an attacker relative to a target's facing.
 * - 'FRONT': Attacker is in the forward 180° arc (direct front or front-diagonals).
 * - 'FLANK': Attacker is in the lateral side hexes (±120°).
 * - 'REAR': Attacker is directly behind the target (180° blind spot).
 */
export function getCombatArc(
  targetFacing: HexDirection,
  targetCoord: HexCoord,
  attackerCoord: HexCoord
): CombatArc {
  const dirToAttacker = getDirectionBetween(targetCoord, attackerCoord);
  const rel = (dirToAttacker - targetFacing + 6) % 6;

  if (rel === 0 || rel === 1 || rel === 5) {
    return 'FRONT';
  }
  if (rel === 2 || rel === 4) {
    return 'FLANK';
  }
  return 'REAR';
}

export function toHexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function axialToCube(hex: HexCoord): CubeCoord {
  const x = hex.q;
  const z = hex.r;
  const y = -x - z;
  return { x, y, z };
}

export function cubeToAxial(cube: CubeCoord): HexCoord {
  return {
    q: cube.x === 0 ? 0 : cube.x,
    r: cube.z === 0 ? 0 : cube.z
  };
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function hexSubtract(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q - b.q, r: a.r - b.r };
}

export function hexMultiply(a: HexCoord, k: number): HexCoord {
  return { q: a.q * k, r: a.r * k };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function getHexNeighbor(coord: HexCoord, directionIndex: number): HexCoord {
  const dir = POINTY_HEX_DIRECTIONS[((directionIndex % 6) + 6) % 6];
  return hexAdd(coord, dir);
}

export function getHexNeighbors(coord: HexCoord): HexCoord[] {
  return POINTY_HEX_DIRECTIONS.map((dir) => hexAdd(coord, dir));
}

/**
 * Returns all hexes at exact distance radius from center.
 */
export function getHexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius <= 0) {
    return [center];
  }

  const results: HexCoord[] = [];
  // Start at radius steps in direction 4 (Southwest)
  let current = hexAdd(center, hexMultiply(POINTY_HEX_DIRECTIONS[4], radius));

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < radius; j++) {
      results.push(current);
      current = getHexNeighbor(current, i);
    }
  }

  return results;
}

/**
 * Returns all hexes within distance radius of center (inclusive).
 */
export function getHexesInRange(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      results.push(hexAdd(center, { q, r }));
    }
  }
  return results;
}

function cubeRound(cube: { x: number; y: number; z: number }): CubeCoord {
  let rx = Math.round(cube.x);
  let ry = Math.round(cube.y);
  let rz = Math.round(cube.z);

  const xDiff = Math.abs(rx - cube.x);
  const yDiff = Math.abs(ry - cube.y);
  const zDiff = Math.abs(rz - cube.z);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return {
    x: rx === 0 ? 0 : rx,
    y: ry === 0 ? 0 : ry,
    z: rz === 0 ? 0 : rz
  };
}

/**
 * Computes a straight line of hexes between from and to (inclusive)
 * using cube coordinate linear interpolation with rounding.
 */
export function getHexLine(from: HexCoord, to: HexCoord): HexCoord[] {
  const n = hexDistance(from, to);
  if (n === 0) {
    return [from];
  }

  const a = axialToCube(from);
  const b = axialToCube(to);

  // Tiny nudge to ensure deterministic traversal when points lie directly on edges
  const aNudged = { x: a.x + 1e-6, y: a.y + 1e-6, z: a.z - 2e-6 };
  const bNudged = { x: b.x + 1e-6, y: b.y + 1e-6, z: b.z - 2e-6 };

  const results: HexCoord[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const interpolated = {
      x: aNudged.x + (bNudged.x - aNudged.x) * t,
      y: aNudged.y + (bNudged.y - aNudged.y) * t,
      z: aNudged.z + (bNudged.z - aNudged.z) * t
    };
    results.push(cubeToAxial(cubeRound(interpolated)));
  }

  return results;
}
