import { describe, it, expect } from 'vitest';
import {
  computeArenaCamera,
  computeCenterUnitPan,
  screenDeltaToViewBoxDelta,
  BASE_CAMERA_MARGIN
} from './cameraGeometry';
import { HexCoord } from '../../core/grid/hex';

describe('cameraGeometry', () => {
  const sampleTiles: { coord: HexCoord; elevation?: number }[] = [
    { coord: { q: 0, r: 0 }, elevation: 0 },
    { coord: { q: 1, r: 0 }, elevation: 1 },
    { coord: { q: -1, r: 0 }, elevation: 0 },
    { coord: { q: 0, r: 1 }, elevation: 2 },
    { coord: { q: 0, r: -1 }, elevation: 0 }
  ];

  it('computes default viewBox centered at 1.0 zoom with zero pan', () => {
    const result = computeArenaCamera(sampleTiles, 1.0);
    expect(result.viewBox).toBeDefined();
    const [x, y, width, height] = result.viewBox.split(' ').map(Number);
    expect(width).toBe(result.bounds.origWidth);
    expect(height).toBe(result.bounds.origHeight);
    expect(x).toBe(result.bounds.origX);
    expect(y).toBe(result.bounds.origY);
  });

  it('clamps pan offsets dynamically at zoom 1.0', () => {
    // At zoom 1.0, maxPan is restricted to BASE_CAMERA_MARGIN
    const result = computeArenaCamera(sampleTiles, 1.0, { x: 500, y: -500 });
    expect(result.bounds.clampedPanX).toBe(BASE_CAMERA_MARGIN);
    expect(result.bounds.clampedPanY).toBe(-BASE_CAMERA_MARGIN);
  });

  it('expands maxPan bounds proportionally when zoomed in', () => {
    const zoom1 = computeArenaCamera(sampleTiles, 1.0);
    const zoom15 = computeArenaCamera(sampleTiles, 1.5);
    const zoom2 = computeArenaCamera(sampleTiles, 2.0);

    expect(zoom15.bounds.maxPanX).toBeGreaterThan(zoom1.bounds.maxPanX);
    expect(zoom2.bounds.maxPanX).toBeGreaterThan(zoom15.bounds.maxPanX);
  });

  it('applies pan offsets within bounds to the viewBox origin', () => {
    const base = computeArenaCamera(sampleTiles, 1.5, { x: 0, y: 0 });
    const panned = computeArenaCamera(sampleTiles, 1.5, { x: 50, y: -40 });

    const [baseX, baseY] = base.viewBox.split(' ').map(Number);
    const [pannedX, pannedY] = panned.viewBox.split(' ').map(Number);

    expect(pannedX).toBe(baseX + 50);
    expect(pannedY).toBe(baseY - 40);
  });

  it('returns fallback viewBox for empty tile array', () => {
    const fallback = computeArenaCamera([], 1.0);
    expect(fallback.viewBox).toBe('-320 -280 640 560');
    expect(fallback.backdropRadius).toBe(230);
  });

  it('computes centering pan offset for a target unit coordinate', () => {
    const targetCoord = { q: 1, r: 0 };
    const pan = computeCenterUnitPan(targetCoord, 1, sampleTiles, 1.5);
    expect(pan).toBeDefined();
    expect(typeof pan.x).toBe('number');
    expect(typeof pan.y).toBe('number');

    // Pan with the calculated centering offset
    const centeredCamera = computeArenaCamera(sampleTiles, 1.5, pan);
    expect(centeredCamera.bounds.clampedPanX).toBe(pan.x);
    expect(centeredCamera.bounds.clampedPanY).toBe(pan.y);
  });

  it('translates screen drag pixel displacements to 1:1 viewBox units', () => {
    // 10px screen drag to right on a 800px wide container displaying a 400px wide viewBox
    // should translate viewBox by -5 (dragging right moves camera left)
    const delta = screenDeltaToViewBoxDelta(10, 20, 400, 300, 800, 600);
    expect(delta.dx).toBe(-5);
    expect(delta.dy).toBe(-10);
  });

  it('handles zero container dimensions safely', () => {
    const delta = screenDeltaToViewBoxDelta(10, 20, 400, 300, 0, 0);
    expect(delta.dx).toBe(0);
    expect(delta.dy).toBe(0);
  });
});
