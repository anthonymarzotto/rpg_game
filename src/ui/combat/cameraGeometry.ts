import { HexCoord } from '../../core/grid/hex';
import { hexToPixel, projectElevationY, DEFAULT_HEX_RADIUS } from './elevationGeometry';

export interface PanOffset {
  readonly x: number;
  readonly y: number;
}

export interface CameraBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly origWidth: number;
  readonly origHeight: number;
  readonly origX: number;
  readonly origY: number;
  readonly width: number;
  readonly height: number;
  readonly maxPanX: number;
  readonly maxPanY: number;
  readonly clampedPanX: number;
  readonly clampedPanY: number;
}

export interface CameraViewBoxResult {
  readonly viewBox: string;
  readonly backdropRadius: number;
  readonly bounds: CameraBounds;
}

export const BASE_CAMERA_MARGIN = 120;

/**
 * Computes dynamic SVG viewBox, backdrop radius, and zoom-aware pan bounds
 * from arena tiles, elevation offsets, zoom level, and pan offsets.
 */
export function computeArenaCamera(
  tiles: readonly { coord: HexCoord; elevation?: number }[],
  zoom = 1.0,
  panOffset?: PanOffset
): CameraViewBoxResult {
  if (tiles.length === 0) {
    const fallbackBounds: CameraBounds = {
      minX: -320,
      maxX: 320,
      minY: -280,
      maxY: 280,
      origWidth: 640,
      origHeight: 560,
      origX: -320,
      origY: -280,
      width: 640,
      height: 560,
      maxPanX: BASE_CAMERA_MARGIN,
      maxPanY: BASE_CAMERA_MARGIN,
      clampedPanX: 0,
      clampedPanY: 0
    };
    return {
      viewBox: '-320 -280 640 560',
      backdropRadius: 230,
      bounds: fallbackBounds
    };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const tile of tiles) {
    const base = hexToPixel(tile.coord);
    const elev = tile.elevation ?? 0;
    const projY = projectElevationY(base.y, elev);
    if (base.x < minX) minX = base.x;
    if (base.x > maxX) maxX = base.x;
    if (projY < minY) minY = projY;
    if (base.y > maxY) maxY = base.y;
  }

  const paddingX = DEFAULT_HEX_RADIUS + 35;
  const paddingTop = DEFAULT_HEX_RADIUS + 75;
  const paddingBottom = DEFAULT_HEX_RADIUS + 65;
  const origWidth = Math.round(maxX - minX + paddingX * 2);
  const origHeight = Math.round(maxY - minY + paddingTop + paddingBottom);
  const origX = Math.round(minX - paddingX);
  const origY = Math.round(minY - paddingTop);

  const safeZoom = Math.max(0.5, Math.min(2.2, zoom));
  const width = Math.round(origWidth / safeZoom);
  const height = Math.round(origHeight / safeZoom);

  const maxPanX = Math.round(Math.max(0, (origWidth - width) / 2) + BASE_CAMERA_MARGIN);
  const maxPanY = Math.round(Math.max(0, (origHeight - height) / 2) + BASE_CAMERA_MARGIN);

  const requestedPanX = panOffset?.x ?? 0;
  const requestedPanY = panOffset?.y ?? 0;

  const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, requestedPanX));
  const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, requestedPanY));

  const origCenterX = origX + (origWidth - width) / 2;
  const origCenterY = origY + (origHeight - height) / 2;

  const x = Math.round(origCenterX + clampedPanX);
  const y = Math.round(origCenterY + clampedPanY);

  const maxDimension = Math.max(maxX - minX, maxY - minY);
  const backdropRadius = Math.round(maxDimension / 2 + DEFAULT_HEX_RADIUS * 0.7);

  const bounds: CameraBounds = {
    minX,
    maxX,
    minY,
    maxY,
    origWidth,
    origHeight,
    origX,
    origY,
    width,
    height,
    maxPanX,
    maxPanY,
    clampedPanX,
    clampedPanY
  };

  return {
    viewBox: `${x} ${y} ${width} ${height}`,
    backdropRadius,
    bounds
  };
}

/**
 * Calculates the required PanOffset to center a target hex coordinate
 * and elevation in the camera viewport at the given zoom level.
 */
export function computeCenterUnitPan(
  targetCoord: HexCoord,
  targetElevation: number,
  allTiles: readonly { coord: HexCoord; elevation?: number }[],
  zoom = 1.0
): PanOffset {
  const camera = computeArenaCamera(allTiles, zoom);
  const targetPixel = hexToPixel(targetCoord);
  const targetY = projectElevationY(targetPixel.y, targetElevation);

  const worldCenterX = camera.bounds.origX + camera.bounds.origWidth / 2;
  const worldCenterY = camera.bounds.origY + camera.bounds.origHeight / 2;

  const rawPanX = Math.round(targetPixel.x - worldCenterX);
  const rawPanY = Math.round(targetY - worldCenterY);

  const clampedX = Math.max(-camera.bounds.maxPanX, Math.min(camera.bounds.maxPanX, rawPanX));
  const clampedY = Math.max(-camera.bounds.maxPanY, Math.min(camera.bounds.maxPanY, rawPanY));

  return { x: clampedX, y: clampedY };
}

/**
 * Converts screen drag pixel displacements to SVG viewBox coordinate deltas.
 */
export function screenDeltaToViewBoxDelta(
  screenDx: number,
  screenDy: number,
  viewBoxWidth: number,
  viewBoxHeight: number,
  containerWidth: number,
  containerHeight: number
): { dx: number; dy: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { dx: 0, dy: 0 };
  }
  const dx = -screenDx * (viewBoxWidth / containerWidth);
  const dy = -screenDy * (viewBoxHeight / containerHeight);
  return { dx, dy };
}
