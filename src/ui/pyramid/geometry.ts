import { ClassDefinition } from '../../core/types/class';
import { CLASS_CATALOG } from '../../data/classes';

export type ProjectionMode = 'triangle-mosaic' | 'triangle-grid';

export interface TriangleGeometry {
  readonly row: number;
  readonly col: number;
  readonly orientation: 'up' | 'down';
  readonly pointsStr: string;
  readonly centroidX: number;
  readonly centroidY: number;
}

export interface StarPoint {
  readonly cls: ClassDefinition;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly triangle: TriangleGeometry;
}

// Fixed equilateral pyramid geometric dimensions
export const PYRAMID_HEIGHT = 620;
export const PYRAMID_ROWS = 10;
export const ROW_HEIGHT = PYRAMID_HEIGHT / PYRAMID_ROWS;
export const TILE_SIDE = (2 * ROW_HEIGHT) / Math.sqrt(3);
export const PYRAMID_TOP_Y = (-2 / 3) * PYRAMID_HEIGHT;

// Precompute 100 pyramid class positions once at module initialization
export const STAR_POINTS: readonly StarPoint[] = Object.freeze(
  CLASS_CATALOG.map((cls, index) => {
    const f = cls.requirements.fighter;
    const r = cls.requirements.rogue;
    const m = cls.requirements.mage;
    const total = cls.totalPoints;

    // Triangle subdivision geometry (100 = 10^2 cells)
    const row = Math.floor(Math.sqrt(index));
    const col = index - row * row;
    const yTopR = PYRAMID_TOP_Y + row * ROW_HEIGHT;
    const yBotR = PYRAMID_TOP_Y + (row + 1) * ROW_HEIGHT;
    const isUpright = col % 2 === 0;

    let v1: [number, number];
    let v2: [number, number];
    let v3: [number, number];
    let centroidX: number;
    let centroidY: number;

    if (isUpright) {
      const k = col / 2;
      const xTop = -row * (TILE_SIDE / 2) + k * TILE_SIDE;
      v1 = [xTop, yTopR];
      v2 = [xTop - TILE_SIDE / 2, yBotR];
      v3 = [xTop + TILE_SIDE / 2, yBotR];
      centroidX = xTop;
      centroidY = yTopR + (2 / 3) * ROW_HEIGHT;
    } else {
      const k = (col - 1) / 2;
      const xBot = -row * (TILE_SIDE / 2) + (k + 0.5) * TILE_SIDE;
      v1 = [xBot - TILE_SIDE / 2, yTopR];
      v2 = [xBot + TILE_SIDE / 2, yTopR];
      v3 = [xBot, yBotR];
      centroidX = xBot;
      centroidY = yTopR + (1 / 3) * ROW_HEIGHT;
    }

    const pointsStr = `${v1[0].toFixed(1)},${v1[1].toFixed(1)} ${v2[0].toFixed(1)},${v2[1].toFixed(1)} ${v3[0].toFixed(1)},${v3[1].toFixed(1)}`;

    const triangle: TriangleGeometry = {
      row,
      col,
      orientation: isUpright ? 'up' : 'down',
      pointsStr,
      centroidX: Number(centroidX.toFixed(1)),
      centroidY: Number(centroidY.toFixed(1))
    };

    const x = triangle.centroidX;
    const y = triangle.centroidY;

    // Color interpolation based on archetype weights
    const rf = Math.round((f / total) * 239);
    const gg = Math.round((r / total) * 210);
    const bb = Math.round((m / total) * 246);
    const color = `rgb(${Math.max(70, rf)}, ${Math.max(70, gg)}, ${Math.max(70, bb)})`;

    return { cls, x, y, color, triangle };
  })
);

// Map for fast coord lookup of star points
export const POINTS_BY_ID: ReadonlyMap<string, StarPoint> = new Map(
  STAR_POINTS.map((p) => [p.cls.id, p])
);
