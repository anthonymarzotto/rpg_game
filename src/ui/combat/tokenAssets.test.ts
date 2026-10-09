import { describe, it, expect } from 'vitest';
import { Unit } from '../../core/types/unit';
import { HEX_DIRECTIONS } from '../../core/grid/hex';
import {
  resolveTokenAssetPath,
  resolvePixelTokenBase,
  isPixelAsset,
  getUnitTokenUrls,
  preloadCombatUnitTokens,
  clearImageCache,
  getClassBadgePalette,
  CLASS_BADGE_PALETTES
} from './tokenAssets';

function createMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'test-unit',
    name: 'Test Unit',
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    progression: {
      unitId: 'test-unit',
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 2, finesse: 2, focus: 2 },
    effectiveVitals: {
      maxHp: 30,
      maxAp: 3,
      speed: 10,
      move: 3,
      evasion: 10,
      resolve: 10,
      armor: 1,
      ward: 0
    },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike', 'throw_dart', 'spark'],
    ...overrides
  };
}

describe('Token Asset Resolution & Pixel Multi-Directional Support', () => {
  describe('Pixel Aesthetic & Hex Facing', () => {
    it('resolves novice (000_human_male) to pixel idle rotation paths for each hex direction', () => {
      const novice = createMockUnit({ gender: 'male', race: 'human' });

      expect(resolveTokenAssetPath(novice, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(novice, HEX_DIRECTIONS.NORTHEAST)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/north-east.png'
      );
      expect(resolveTokenAssetPath(novice, HEX_DIRECTIONS.NORTHWEST)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/north-west.png'
      );
      expect(resolveTokenAssetPath(novice, HEX_DIRECTIONS.WEST)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/west.png'
      );
      expect(resolveTokenAssetPath(novice, HEX_DIRECTIONS.SOUTHWEST)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/south-west.png'
      );
      expect(resolveTokenAssetPath(novice, HEX_DIRECTIONS.SOUTHEAST)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/south-east.png'
      );
    });

    it('resolves warrior (00_human_male) to pixel idle rotation paths', () => {
      const warrior = createMockUnit({
        gender: 'male',
        race: 'human',
        loadout: {
          activeClassId: 'warrior',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      expect(resolveTokenAssetPath(warrior, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/00_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(warrior, HEX_DIRECTIONS.SOUTHWEST)).toBe(
        '/assets/tokens/pixel/00_human_male/Idle/rotations/south-west.png'
      );
    });

    it('resolves thief (81_human_male) to pixel idle rotation paths', () => {
      const thief = createMockUnit({
        gender: 'male',
        race: 'human',
        loadout: {
          activeClassId: 'thief',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      expect(resolveTokenAssetPath(thief, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/81_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(thief, HEX_DIRECTIONS.NORTHWEST)).toBe(
        '/assets/tokens/pixel/81_human_male/Idle/rotations/north-west.png'
      );
    });

    it('resolves wizard (99_human_male) to pixel idle rotation paths', () => {
      const wizard = createMockUnit({
        gender: 'male',
        race: 'human',
        loadout: {
          activeClassId: 'wizard',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      expect(resolveTokenAssetPath(wizard, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/99_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(wizard, HEX_DIRECTIONS.SOUTHEAST)).toBe(
        '/assets/tokens/pixel/99_human_male/Idle/rotations/south-east.png'
      );
    });

    it('resolves cavalier (01_human_male) to pixel idle rotation paths across all hex directions', () => {
      const cavalier = createMockUnit({
        gender: 'male',
        race: 'human',
        loadout: {
          activeClassId: 'cavalier',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      expect(resolvePixelTokenBase(cavalier)).toBe('01_human_male');
      expect(resolveTokenAssetPath(cavalier, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(cavalier, HEX_DIRECTIONS.NORTHEAST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/north-east.png'
      );
      expect(resolveTokenAssetPath(cavalier, HEX_DIRECTIONS.NORTHWEST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/north-west.png'
      );
      expect(resolveTokenAssetPath(cavalier, HEX_DIRECTIONS.WEST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/west.png'
      );
      expect(resolveTokenAssetPath(cavalier, HEX_DIRECTIONS.SOUTHWEST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/south-west.png'
      );
      expect(resolveTokenAssetPath(cavalier, HEX_DIRECTIONS.SOUTHEAST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/south-east.png'
      );
    });

    it('resolves berserker (03_human_male) to pixel idle rotation paths and badge palette', () => {
      const berserker = createMockUnit({
        loadout: {
          activeClassId: 'berserker',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      expect(resolvePixelTokenBase(berserker)).toBe('03_human_male');
      expect(resolveTokenAssetPath(berserker, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/03_human_male/Idle/rotations/east.png'
      );
    });

    it('resolves highwayman (64_human_male) to pixel idle rotation paths across all hex directions', () => {
      const highwayman = createMockUnit({
        loadout: {
          activeClassId: 'highwayman',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      expect(resolvePixelTokenBase(highwayman)).toBe('64_human_male');
      expect(resolveTokenAssetPath(highwayman, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/64_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(highwayman, HEX_DIRECTIONS.NORTHEAST)).toBe(
        '/assets/tokens/pixel/64_human_male/Idle/rotations/north-east.png'
      );
      expect(resolveTokenAssetPath(highwayman, HEX_DIRECTIONS.NORTHWEST)).toBe(
        '/assets/tokens/pixel/64_human_male/Idle/rotations/north-west.png'
      );
      expect(resolveTokenAssetPath(highwayman, HEX_DIRECTIONS.WEST)).toBe(
        '/assets/tokens/pixel/64_human_male/Idle/rotations/west.png'
      );
      expect(resolveTokenAssetPath(highwayman, HEX_DIRECTIONS.SOUTHWEST)).toBe(
        '/assets/tokens/pixel/64_human_male/Idle/rotations/south-west.png'
      );
      expect(resolveTokenAssetPath(highwayman, HEX_DIRECTIONS.SOUTHEAST)).toBe(
        '/assets/tokens/pixel/64_human_male/Idle/rotations/south-east.png'
      );
    });

    it('resolves warlock (80_human_male) and witch (97_human_male) to pixel token bases', () => {
      const warlock = createMockUnit({
        loadout: {
          activeClassId: 'warlock',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });
      const witch = createMockUnit({
        loadout: {
          activeClassId: 'witch',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      expect(resolvePixelTokenBase(warlock)).toBe('80_human_male');
      expect(resolvePixelTokenBase(witch)).toBe('97_human_male');
    });

    it('defaults to front-facing south.png when facing is omitted (UI portraits)', () => {
      const novice = createMockUnit();
      expect(resolveTokenAssetPath(novice)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/south.png'
      );
    });

    it('gracefully falls back to available male sprite if female pixel sprite is not yet generated', () => {
      // Female novice does not have female-specific assets, so falls back to 000_human_male
      const femaleNovice = createMockUnit({ gender: 'female' });
      expect(resolvePixelTokenBase(femaleNovice)).toBe('000_human_male');
      expect(resolveTokenAssetPath(femaleNovice)).toBe(
        '/assets/tokens/pixel/000_human_male/Idle/rotations/south.png'
      );

      // Female thief (Lyra) falls back to 81_human_male
      const femaleThief = createMockUnit({
        gender: 'female',
        loadout: {
          activeClassId: 'thief',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });
      expect(resolvePixelTokenBase(femaleThief)).toBe('81_human_male');
      expect(resolveTokenAssetPath(femaleThief)).toBe(
        '/assets/tokens/pixel/81_human_male/Idle/rotations/south.png'
      );
    });

    it('returns null for ungenerated pixel classes to trigger the default vector fallback', () => {
      // Elementalist (class 60) does not exist in pixel assets yet
      const elementalist = createMockUnit({
        gender: 'male',
        loadout: {
          activeClassId: 'elementalist',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });
      expect(resolvePixelTokenBase(elementalist)).toBeNull();
      expect(resolveTokenAssetPath(elementalist)).toBeNull();
    });
  });

  describe('isPixelAsset helper', () => {
    it('returns true for pixel token paths', () => {
      expect(isPixelAsset('/assets/tokens/pixel/000_human_male/Idle/rotations/east.png')).toBe(true);
    });

    it('returns false for non-pixel paths and null', () => {
      expect(isPixelAsset('/assets/tokens/enamel/000_human_male.png')).toBe(false);
      expect(isPixelAsset('/assets/tokens/stained-glass/000_human_male_glass.png')).toBe(false);
      expect(isPixelAsset(null)).toBe(false);
      expect(isPixelAsset('')).toBe(false);
    });
  });

  describe('Scoped Preloading & URL Generation', () => {
    it('resolvePixelTokenBase correctly identifies base identifiers', () => {
      const warrior = createMockUnit({
        gender: 'male',
        race: 'human',
        loadout: {
          activeClassId: 'warrior',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });
      expect(resolvePixelTokenBase(warrior)).toBe('00_human_male');

      const thief = createMockUnit({
        gender: 'male',
        race: 'human',
        loadout: {
          activeClassId: 'thief',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });
      expect(resolvePixelTokenBase(thief)).toBe('81_human_male');
    });

    it('getUnitTokenUrls returns all 8 rotation URLs for pixel units on whitelist', () => {
      const novice = createMockUnit();
      const urls = getUnitTokenUrls(novice);

      expect(urls).toHaveLength(8);
      expect(urls).toContain('/assets/tokens/pixel/000_human_male/Idle/rotations/east.png');
      expect(urls).toContain('/assets/tokens/pixel/000_human_male/Idle/rotations/north.png');
      expect(urls).toContain('/assets/tokens/pixel/000_human_male/Idle/rotations/south.png');
      expect(urls).toContain('/assets/tokens/pixel/000_human_male/Idle/rotations/south-west.png');
    });

    it('getUnitTokenUrls returns empty array for ungenerated pixel units', () => {
      const elementalist = createMockUnit({
        gender: 'male',
        loadout: {
          activeClassId: 'elementalist',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });
      expect(getUnitTokenUrls(elementalist)).toEqual([]);
    });

    it('preloadCombatUnitTokens executes safely and deduplicates repeated unit classes', async () => {
      clearImageCache();
      const novice1 = createMockUnit({ id: 'novice-1' });
      const novice2 = createMockUnit({ id: 'novice-2' }); // same class/race/gender
      const warrior = createMockUnit({
        id: 'warrior-1',
        loadout: {
          activeClassId: 'warrior',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        }
      });

      // Should complete without error in Node/browser environments
      await expect(
        preloadCombatUnitTokens([novice1, novice2, warrior])
      ).resolves.toBeDefined();
    });
  });

  describe('Class Badge Palettes & Helpers', () => {
    it('returns dedicated palette colors for all Tier 3 classes', () => {
      expect(getClassBadgePalette('cavalier')).toEqual(CLASS_BADGE_PALETTES.cavalier);
      expect(getClassBadgePalette('berserker')).toEqual(CLASS_BADGE_PALETTES.berserker);
      expect(getClassBadgePalette('highwayman')).toEqual(CLASS_BADGE_PALETTES.highwayman);
      expect(getClassBadgePalette('warlock')).toEqual(CLASS_BADGE_PALETTES.warlock);
      expect(getClassBadgePalette('witch')).toEqual(CLASS_BADGE_PALETTES.witch);
    });

    it('returns dedicated palette colors for Tier 2 and Tier 1 classes', () => {
      expect(getClassBadgePalette('knight')).toEqual(CLASS_BADGE_PALETTES.knight);
      expect(getClassBadgePalette('infiltrator')).toEqual({ primary: '#047857', border: '#34d399' });
      expect(getClassBadgePalette('sorcerer')).toEqual({ primary: '#6d28d9', border: '#a78bfa' });
      expect(getClassBadgePalette('warrior')).toEqual(CLASS_BADGE_PALETTES.warrior);
      expect(getClassBadgePalette('thief')).toEqual(CLASS_BADGE_PALETTES.thief);
      expect(getClassBadgePalette('wizard')).toEqual(CLASS_BADGE_PALETTES.wizard);
      expect(getClassBadgePalette('novice')).toEqual(CLASS_BADGE_PALETTES.novice);
    });

    it('handles case-insensitivity and falls back to novice palette for unknown or undefined classes', () => {
      expect(getClassBadgePalette('CAVALIER')).toEqual(CLASS_BADGE_PALETTES.cavalier);
      expect(getClassBadgePalette('Witch')).toEqual(CLASS_BADGE_PALETTES.witch);
      expect(getClassBadgePalette('unknown_class')).toEqual(CLASS_BADGE_PALETTES.novice);
      expect(getClassBadgePalette(undefined)).toEqual(CLASS_BADGE_PALETTES.novice);
    });
  });
});
