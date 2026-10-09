import { describe, it, expect } from 'vitest';
import {
  ELEVATION_Y_OFFSET,
  DEFAULT_HEX_RADIUS,
  hexToPixel,
  projectElevationY,
  getHexVertices,
  getHexPolygonPoints,
  getExtrudedPrismWalls
} from './elevationGeometry';

describe('elevationGeometry', () => {
  it('projects hex coordinates into flat 2D pixel space correctly', () => {
    const origin = hexToPixel({ q: 0, r: 0 });
    expect(origin.x).toBeCloseTo(0, 1);
    expect(origin.y).toBeCloseTo(0, 1);

    const stepR = hexToPixel({ q: 0, r: 1 });
    expect(stepR.y).toBeCloseTo(DEFAULT_HEX_RADIUS * 1.5, 1);
  });

  it('projects elevation upward along the Y axis', () => {
    const flatY = 100;
    expect(projectElevationY(flatY, 0)).toBe(100);
    expect(projectElevationY(flatY, 1)).toBe(100 - ELEVATION_Y_OFFSET);
    expect(projectElevationY(flatY, 2)).toBe(100 - ELEVATION_Y_OFFSET * 2);
    expect(projectElevationY(flatY, 3)).toBe(100 - ELEVATION_Y_OFFSET * 3);
  });

  it('generates 6 vertices for pointy-topped hexes', () => {
    const vertices = getHexVertices(0, 0, 30);
    expect(vertices).toHaveLength(6);
    // V2 is South (bottom)
    expect(vertices[2].x).toBeCloseTo(0, 1);
    expect(vertices[2].y).toBeCloseTo(30, 1);
    // V5 is North (top)
    expect(vertices[5].x).toBeCloseTo(0, 1);
    expect(vertices[5].y).toBeCloseTo(-30, 1);
  });

  it('produces formatted SVG polygon point strings', () => {
    const pointsStr = getHexPolygonPoints(0, 0, 30);
    const coords = pointsStr.split(' ');
    expect(coords).toHaveLength(6);
    for (const pair of coords) {
      const [x, y] = pair.split(',').map(Number);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  it('returns empty extruded walls for flat ground (elevation <= 0)', () => {
    const walls0 = getExtrudedPrismWalls(0, 0, 0);
    expect(walls0).toHaveLength(0);
    const wallsNeg = getExtrudedPrismWalls(0, 0, -1);
    expect(wallsNeg).toHaveLength(0);
  });

  it('generates Southwest and Southeast extruded wall quads for elevated tiles', () => {
    const cx = 50;
    const baseY = 80;
    const elevation = 2;
    const walls = getExtrudedPrismWalls(cx, baseY, elevation);

    expect(walls).toHaveLength(2);
    const [swWall, seWall] = walls;

    expect(swWall.id).toBe('southwest');
    expect(seWall.id).toBe('southeast');

    // Each wall is a 4-vertex quad
    expect(swWall.points.split(' ')).toHaveLength(4);
    expect(seWall.points.split(' ')).toHaveLength(4);

    // Verify top edge vs bottom edge vertical offset from quad points (point 3 is bottom, point 0 is top)
    const expectedDrop = elevation * ELEVATION_Y_OFFSET;
    const swPoints = swWall.points.split(' ').map((p) => p.split(',').map(Number));
    const sePoints = seWall.points.split(' ').map((p) => p.split(',').map(Number));
    expect(swPoints[3][1] - swPoints[0][1]).toBeCloseTo(expectedDrop, 1);
    expect(sePoints[2][1] - sePoints[1][1]).toBeCloseTo(expectedDrop, 1);
  });
});
