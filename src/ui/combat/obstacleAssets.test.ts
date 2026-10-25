import { describe, it, expect } from 'vitest';
import {
  RUINS_ROTATIONS,
  getObstacleRotation,
  resolveObstacleAssetPath,
  getObstacleTokenUrls,
  preloadObstacleTokens
} from './obstacleAssets';

describe('obstacleAssets', () => {
  it('defines 8 distinct obstacle rotations', () => {
    expect(RUINS_ROTATIONS).toHaveLength(8);
    expect(new Set(RUINS_ROTATIONS).size).toBe(8);
    expect(RUINS_ROTATIONS).toContain('south');
    expect(RUINS_ROTATIONS).toContain('north');
    expect(RUINS_ROTATIONS).toContain('east');
    expect(RUINS_ROTATIONS).toContain('west');
    expect(RUINS_ROTATIONS).toContain('south-east');
    expect(RUINS_ROTATIONS).toContain('north-east');
    expect(RUINS_ROTATIONS).toContain('south-west');
    expect(RUINS_ROTATIONS).toContain('north-west');
  });

  describe('getObstacleRotation', () => {
    it('is strictly deterministic for identical coordinates', () => {
      const coord = { q: 2, r: -1 };
      const rot1 = getObstacleRotation(coord);
      const rot2 = getObstacleRotation(coord);
      expect(rot1).toBe(rot2);
    });

    it('produces varied directions across different battlefield coordinates', () => {
      const coords = [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -1, r: 2 },
        { q: 2, r: 1 },
        { q: -2, r: -1 }
      ];
      const rotations = new Set(coords.map(getObstacleRotation));
      expect(rotations.size).toBeGreaterThan(1);
    });

    it('returns a valid rotation for negative coordinates', () => {
      const rot = getObstacleRotation({ q: -3, r: -4 });
      expect(RUINS_ROTATIONS).toContain(rot);
    });
  });

  describe('resolveObstacleAssetPath', () => {
    it('resolves asset path for all valid rotations of ruins', () => {
      for (const rot of RUINS_ROTATIONS) {
        const path = resolveObstacleAssetPath('ruins', rot);
        expect(path).toContain(`/assets/objects/ruins/rotations/${rot}.png`);
      }
    });

    it('resolves asset path for aliases pillar and obstacle', () => {
      const pillarPath = resolveObstacleAssetPath('pillar', 'north');
      expect(pillarPath).toContain('/assets/objects/ruins/rotations/north.png');

      const obsPath = resolveObstacleAssetPath('OBSTACLE', 'east');
      expect(obsPath).toContain('/assets/objects/ruins/rotations/east.png');
    });

    it('defaults to south rotation when rotation is omitted', () => {
      const path = resolveObstacleAssetPath('ruins');
      expect(path).toContain('/assets/objects/ruins/rotations/south.png');
    });

    it('returns null for unmapped obstacle types', () => {
      expect(resolveObstacleAssetPath('trees')).toBeNull();
      expect(resolveObstacleAssetPath('lava')).toBeNull();
    });
  });

  describe('getObstacleTokenUrls', () => {
    it('returns 8 URLs for ruins', () => {
      const urls = getObstacleTokenUrls('ruins');
      expect(urls).toHaveLength(8);
      for (const rot of RUINS_ROTATIONS) {
        expect(urls.some((u) => u.includes(`/assets/objects/ruins/rotations/${rot}.png`))).toBe(true);
      }
    });

    it('returns empty array for unknown obstacle types', () => {
      expect(getObstacleTokenUrls('unknown')).toEqual([]);
    });
  });

  describe('preloadObstacleTokens', () => {
    it('executes safely for ruins and unknown types', async () => {
      const result = await preloadObstacleTokens(['ruins', 'unknown']);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
