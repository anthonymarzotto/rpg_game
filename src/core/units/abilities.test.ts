import { describe, it, expect } from 'vitest';
import {
  NOVICE_FIGHTER_ABILITIES,
  NOVICE_ROGUE_ABILITIES,
  NOVICE_MAGE_ABILITIES,
  UNIVERSAL_ACTIONS,
  rollNoviceStarterKit,
  CLASS_PACKAGES
} from '../../data/abilities';
import { createRecruit } from './unitFactory';

describe('Ability Catalog Invariants', () => {
  const allNoviceAbilities = [
    ...NOVICE_FIGHTER_ABILITIES,
    ...NOVICE_ROGUE_ABILITIES,
    ...NOVICE_MAGE_ABILITIES,
    ...UNIVERSAL_ACTIONS
  ];

  it('ensures all ability IDs are unique across the catalog', () => {
    const ids = allNoviceAbilities.map((a) => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('ensures all abilities have valid metadata and non-negative AP costs', () => {
    for (const ability of allNoviceAbilities) {
      expect(ability.id.length).toBeGreaterThan(0);
      expect(ability.name.length).toBeGreaterThan(0);
      expect(ability.description.length).toBeGreaterThan(0);
      expect(ability.apCost).toBeGreaterThanOrEqual(0);
    }
  });

  it('ensures all damaging abilities specify a valid dice profile', () => {
    for (const ability of allNoviceAbilities) {
      if (ability.damageType !== 'NONE') {
        expect(ability.damageProfile).toBeDefined();
        expect(ability.damageProfile!.count).toBeGreaterThan(0);
        expect(ability.damageProfile!.sides).toBeGreaterThan(0);
      }
    }
  });

  it('ensures all abilities rolling against a defense target specify an attackModifierAttribute', () => {
    for (const ability of allNoviceAbilities) {
      if (ability.defenseTarget !== 'NONE') {
        expect(ability.attackModifierAttribute).toBeDefined();
      }
    }
  });

  it('ensures all Novice pool abilities cost exactly 1 AP', () => {
    const pool = [
      ...NOVICE_FIGHTER_ABILITIES,
      ...NOVICE_ROGUE_ABILITIES,
      ...NOVICE_MAGE_ABILITIES
    ];
    for (const ability of pool) {
      expect(ability.apCost).toBe(1);
    }
  });

  it('verifies correct archetype tagging for each pool', () => {
    expect(NOVICE_FIGHTER_ABILITIES.every((a) => a.archetypeTag === 'FIGHTER')).toBe(true);
    expect(NOVICE_ROGUE_ABILITIES.every((a) => a.archetypeTag === 'ROGUE')).toBe(true);
    expect(NOVICE_MAGE_ABILITIES.every((a) => a.archetypeTag === 'MAGE')).toBe(true);
  });
});

describe('Starter Ability Kit Generation Logic', () => {
  it('rolls exactly 1 Fighter, 1 Rogue, and 1 Mage combat ability', () => {
    const kit = rollNoviceStarterKit();

    expect(kit).toHaveLength(3);
    expect(kit[0].archetypeTag).toBe('FIGHTER');
    expect(kit[1].archetypeTag).toBe('ROGUE');
    expect(kit[2].archetypeTag).toBe('MAGE');
  });

  it('supports deterministic generation using a mock RNG', () => {
    const mockRng = () => 0.0;
    const kit = rollNoviceStarterKit(mockRng);

    expect(kit[0].id).toBe('strike');
    expect(kit[1].id).toBe('quick_thrust');
    expect(kit[2].id).toBe('spark');
  });

  it('assigns rolled starter ability IDs to newly recruited Novices', () => {
    const mockRng = () => 0.0;
    const recruit = createRecruit('unit-novice', 'Bran', { rng: mockRng });

    expect(recruit.starterAbilityIds).toEqual(['strike', 'quick_thrust', 'spark']);
    expect(recruit.loadout.activeClassId).toBe('novice');
  });
});

describe('Class Package Invariants', () => {
  it('ensures all authored packages define signature, 2 domain abilities, and a passive', () => {
    for (const [classId, pkg] of Object.entries(CLASS_PACKAGES)) {
      expect(pkg.classId).toBe(classId);
      expect(pkg.className.length).toBeGreaterThan(0);
      expect(pkg.signatureAbility.id.length).toBeGreaterThan(0);
      expect(pkg.domainAbilities).toHaveLength(2);
      expect(pkg.passive.id.length).toBeGreaterThan(0);
      expect(pkg.passive.hook).toBe('ALWAYS');
    }
  });
});
