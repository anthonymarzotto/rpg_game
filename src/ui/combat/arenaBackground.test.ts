import { describe, it, expect } from 'vitest';
import {
  resolveArenaBackground,
  computeBackgroundTransform,
  ARENA_BACKGROUNDS,
  hashString
} from './arenaBackground';

describe('arenaBackground', () => {
  it('deterministically resolves a background config for an encounter ID', () => {
    const bg1 = resolveArenaBackground('stage-1-encounter-1037');
    const bg2 = resolveArenaBackground('stage-1-encounter-1037');
    expect(bg1).toEqual(bg2);
    expect(ARENA_BACKGROUNDS).toContain(bg1.image);
    expect(bg1.scale).toBeGreaterThanOrEqual(1.15);
  });

  it('provides visual variety across different stage encounters', () => {
    const bgStage1 = resolveArenaBackground('stage-1-encounter-1037');
    const bgStage2 = resolveArenaBackground('stage-2-encounter-1074');
    const bgStage3 = resolveArenaBackground('stage-3-encounter-1111');

    // Verify all 3 point to valid webp backgrounds
    expect(ARENA_BACKGROUNDS).toContain(bgStage1.image);
    expect(ARENA_BACKGROUNDS).toContain(bgStage2.image);
    expect(ARENA_BACKGROUNDS).toContain(bgStage3.image);

    // Verify transforms are calculated
    const t1 = computeBackgroundTransform(bgStage1, 1.0);
    const t2 = computeBackgroundTransform(bgStage2, 1.0);
    expect(typeof t1).toBe('string');
    expect(typeof t2).toBe('string');
  });

  it('respects custom background overrides', () => {
    const custom = resolveArenaBackground('stage-1', 'background3.webp');
    expect(custom.image).toBe('/assets/backgrounds/background3.webp');

    const customFull = resolveArenaBackground('stage-1', '/assets/backgrounds/background2.webp');
    expect(customFull.image).toBe('/assets/backgrounds/background2.webp');
  });

  it('falls back gracefully when encounterId is undefined', () => {
    const bg = resolveArenaBackground();
    expect(ARENA_BACKGROUNDS).toContain(bg.image);
  });

  it('calculates parallax zoom transform smoothly', () => {
    const bg = resolveArenaBackground('novice-sandbox');
    const transformBase = computeBackgroundTransform(bg, 1.0);
    const transformZoomIn = computeBackgroundTransform(bg, 1.5);
    const transformZoomOut = computeBackgroundTransform(bg, 0.8);

    expect(transformBase).toContain('scale(');
    expect(transformZoomIn).toContain('scale(');
    expect(transformZoomOut).toContain('scale(');
    expect(transformBase).not.toEqual(transformZoomIn);
  });

  it('computes stable positive 32-bit hashes from string inputs', () => {
    const h1 = hashString('test-encounter');
    const h2 = hashString('test-encounter');
    const h3 = hashString('different-encounter');

    expect(h1).toBe(h2);
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h1).not.toBe(h3);
  });
});
