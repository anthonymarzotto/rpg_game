import { describe, it, expect } from 'vitest';
import {
  NOVICE_FIGHTER_ABILITIES,
  NOVICE_ROGUE_ABILITIES,
  NOVICE_MAGE_ABILITIES,
  UNIVERSAL_ACTIONS,
  rollNoviceAbilityKit
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
  it('rolls exactly 1 Fighter, 1 Rogue, 1 Mage, and 2 Universal actions', () => {
    const kit = rollNoviceAbilityKit();

    expect(kit).toHaveLength(5);
    expect(kit.filter((a) => a.archetypeTag === 'FIGHTER')).toHaveLength(1);
    expect(kit.filter((a) => a.archetypeTag === 'ROGUE')).toHaveLength(1);
    expect(kit.filter((a) => a.archetypeTag === 'MAGE')).toHaveLength(1);
    expect(kit.filter((a) => !a.archetypeTag)).toHaveLength(2);
  });

  it('supports deterministic generation using a mock RNG', () => {
    const mockRng = () => 0.0;
    const kit = rollNoviceAbilityKit(mockRng);

    expect(kit[0].id).toBe('strike');
    expect(kit[1].id).toBe('quick_thrust');
    expect(kit[2].id).toBe('spark');
  });

  it('equips newly recruited Novices with their rolled starter kit', () => {
    const recruit = createRecruit('unit-novice', 'Bran');

    expect(recruit.abilities).toHaveLength(5);
    expect(recruit.abilities.some((a) => a.archetypeTag === 'FIGHTER')).toBe(true);
    expect(recruit.abilities.some((a) => a.archetypeTag === 'ROGUE')).toBe(true);
    expect(recruit.abilities.some((a) => a.archetypeTag === 'MAGE')).toBe(true);
  });
});
