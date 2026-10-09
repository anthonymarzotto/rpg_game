import { HexCoord } from '../../core/grid/hex';

export const ELEVATION_Y_OFFSET = 14;
export const DEFAULT_HEX_RADIUS = 38;
const SQRT3 = Math.sqrt(3);

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface ExtrudedWallFace {
  readonly id: 'southwest' | 'southeast';
  readonly points: string;
}

/**
 * Projects a flat hex coordinate into flat 2D pixel space.
 */
export function hexToPixel(coord: HexCoord, radius = DEFAULT_HEX_RADIUS): Point2D {
  const x = radius * (SQRT3 * coord.q + (SQRT3 / 2) * coord.r);
  const y = radius * (1.5 * coord.r);
  return { x, y };
}

/**
 * Applies vertical elevation projection offset ($y_{\text{projected}} = y_{\text{flat}} - h \times 14\text{px}$).
 */
export function projectElevationY(
  baseY: number,
  elevation: number,
  offsetPerLevel = ELEVATION_Y_OFFSET
): number {
  return baseY - Math.max(0, elevation) * offsetPerLevel;
}

/**
 * Computes the 6 polygon vertices of a pointy-topped hex centered at (cx, cy).
 * Vertices are indexed 0..5:
 * 0: Northeast (-30 deg)
 * 1: Southeast (+30 deg)
 * 2: South (+90 deg)
 * 3: Southwest (+150 deg)
 * 4: Northwest (+210 deg)
 * 5: North (+270 deg)
 */
export function getHexVertices(
  cx: number,
  cy: number,
  radius = DEFAULT_HEX_RADIUS - 1.5
): Point2D[] {
  const vertices: Point2D[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = ((60 * i - 30) * Math.PI) / 180;
    const x = Number((cx + radius * Math.cos(angleRad)).toFixed(1));
    const y = Number((cy + radius * Math.sin(angleRad)).toFixed(1));
    vertices.push({ x, y });
  }
  return vertices;
}

/**
 * Formats a list of 2D points into an SVG polygon points attribute string.
 */
export function pointsToSvgString(points: readonly Point2D[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

/**
 * Computes the top surface hex polygon points for a given center and elevation.
 */
export function getHexPolygonPoints(
  cx: number,
  cy: number,
  radius = DEFAULT_HEX_RADIUS - 1.5
): string {
  return pointsToSvgString(getHexVertices(cx, cy, radius));
}

/**
 * Generates procedural extruded prism side-wall quads for elevated tiles (h >= 1).
 * Faces extend from the elevated top surface down to the base floor level.
 * - Southwest face: bounded by V3 -> V2
 * - Southeast face: bounded by V2 -> V1
 */
export function getExtrudedPrismWalls(
  cx: number,
  baseY: number,
  elevation: number,
  radius = DEFAULT_HEX_RADIUS - 1.5,
  offsetPerLevel = ELEVATION_Y_OFFSET
): readonly ExtrudedWallFace[] {
  if (elevation <= 0) {
    return [];
  }

  const topY = projectElevationY(baseY, elevation, offsetPerLevel);
  const topVertices = getHexVertices(cx, topY, radius);
  const bottomVertices = getHexVertices(cx, baseY, radius);

  // V1 = Southeast, V2 = South, V3 = Southwest
  const v1Top = topVertices[1];
  const v2Top = topVertices[2];
  const v3Top = topVertices[3];

  const v1Bottom = bottomVertices[1];
  const v2Bottom = bottomVertices[2];
  const v3Bottom = bottomVertices[3];

  // Southwest face: v3Top -> v2Top -> v2Bottom -> v3Bottom
  const swQuad: Point2D[] = [v3Top, v2Top, v2Bottom, v3Bottom];
  // Southeast face: v2Top -> v1Top -> v1Bottom -> v2Bottom
  const seQuad: Point2D[] = [v2Top, v1Top, v1Bottom, v2Bottom];

  return [
    { id: 'southwest', points: pointsToSvgString(swQuad) },
    { id: 'southeast', points: pointsToSvgString(seQuad) }
  ];
}
