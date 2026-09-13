import { describe, it, expect } from 'vitest';
import {
  CLASS_CATALOG,
  CLASSES_BY_COORD,
  CLASSES_BY_ID,
  CLASSES_BY_TIER
} from '../../data/classes';
import {
  advanceArchetypeLevel,
  advanceMultipleLevels,
  createInitialProgression,
  getClassAtCoord,
  getEligibleClassAtLevel,
  isClassEligibleNextLevel,
  isClassLockedOut,
  MAX_ARCHETYPE_POINTS,
  MAX_LEVEL
} from './pyramid';

describe('Class Pyramid Master Catalog Integrity', () => {
  it('contains exactly 100 classes', () => {
    expect(CLASS_CATALOG).toHaveLength(100);
  });

  it('contains unique class numbers from 00 to 99', () => {
    const numbers = CLASS_CATALOG.map((c) => c.no);
    const uniqueNumbers = new Set(numbers);
    expect(uniqueNumbers.size).toBe(100);

    for (let i = 0; i < 100; i++) {
      const formatted = i.toString().padStart(2, '0');
      expect(uniqueNumbers.has(formatted)).toBe(true);
    }
  });

  it('contains unique IDs for every class', () => {
    const ids = CLASS_CATALOG.map((c) => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100);
    expect(Object.keys(CLASSES_BY_ID)).toHaveLength(100);
  });

  it('ensures every class has a unique (F, R, M) coordinate', () => {
    const coords = CLASS_CATALOG.map(
      (c) => `${c.requirements.fighter},${c.requirements.rogue},${c.requirements.mage}`
    );
    const uniqueCoords = new Set(coords);
    expect(uniqueCoords.size).toBe(100);
    expect(CLASSES_BY_COORD.size).toBe(100);
  });

  it('satisfies the mathematical constraint: Fighter + Rogue + Mage === Total Points for every class', () => {
    for (const cls of CLASS_CATALOG) {
      const sum = cls.requirements.fighter + cls.requirements.rogue + cls.requirements.mage;
      expect(sum).toBe(cls.totalPoints);
    }
  });

  it('ensures all coordinates respect the 0 to 5 archetype cap', () => {
    for (const cls of CLASS_CATALOG) {
      expect(cls.requirements.fighter).toBeGreaterThanOrEqual(0);
      expect(cls.requirements.fighter).toBeLessThanOrEqual(MAX_ARCHETYPE_POINTS);

      expect(cls.requirements.rogue).toBeGreaterThanOrEqual(0);
      expect(cls.requirements.rogue).toBeLessThanOrEqual(MAX_ARCHETYPE_POINTS);

      expect(cls.requirements.mage).toBeGreaterThanOrEqual(0);
      expect(cls.requirements.mage).toBeLessThanOrEqual(MAX_ARCHETYPE_POINTS);
    }
  });

  it('matches the exact tier partition distribution from specification', () => {
    const expectedTiers: Record<number, number> = {
      1: 3,
      2: 3,
      3: 6,
      4: 6,
      5: 9,
      6: 9,
      7: 12,
      8: 27,
      9: 25
    };

    for (const [tier, count] of Object.entries(expectedTiers)) {
      const tierNum = Number(tier);
      expect(CLASSES_BY_TIER[tierNum]).toBeDefined();
      expect(CLASSES_BY_TIER[tierNum]).toHaveLength(count);
    }
  });

  it('correctly maps the three Tier 1 corner classes', () => {
    const warrior = CLASSES_BY_ID['warrior'];
    const thief = CLASSES_BY_ID['thief'];
    const wizard = CLASSES_BY_ID['wizard'];

    expect(warrior).toBeDefined();
    expect(warrior.requirements).toEqual({ fighter: 1, rogue: 0, mage: 0 });
    expect(warrior.totalPoints).toBe(1);

    expect(thief).toBeDefined();
    expect(thief.requirements).toEqual({ fighter: 0, rogue: 1, mage: 0 });
    expect(thief.totalPoints).toBe(1);

    expect(wizard).toBeDefined();
    expect(wizard.requirements).toEqual({ fighter: 0, rogue: 0, mage: 1 });
    expect(wizard.totalPoints).toBe(1);
  });
});

describe('Progression and Lockout Simulation Engine', () => {
  it('creates an initial Level 0 Novice with empty constellation', () => {
    const unit = createInitialProgression('unit-1');
    expect(unit.currentLevel).toBe(0);
    expect(unit.archetypePoints).toEqual({ fighter: 0, rogue: 0, mage: 0 });
    expect(unit.constellation).toEqual([]);
  });

  it('correctly identifies locked out classes based on current level', () => {
    const warrior = CLASSES_BY_ID['warrior']; // Total 1
    const knight = CLASSES_BY_ID['knight'];   // Total 2
    const cavalier = CLASSES_BY_ID['cavalier']; // Total 3

    // At Level 1, Warrior (Total 1) is not locked out
    expect(isClassLockedOut(warrior, 1)).toBe(false);

    // At Level 2, Warrior (Total 1) is locked out, Knight (Total 2) is not
    expect(isClassLockedOut(warrior, 2)).toBe(true);
    expect(isClassLockedOut(knight, 2)).toBe(false);

    // At Level 4, Knight (2) and Cavalier (3) are both locked out
    expect(isClassLockedOut(knight, 4)).toBe(true);
    expect(isClassLockedOut(cavalier, 4)).toBe(true);
  });

  it('correctly handles archetype-aware lockouts and next-level eligibility', () => {
    const warrior = CLASSES_BY_ID['warrior'];     // (1,0,0) - Tier 1
    const thief = CLASSES_BY_ID['thief'];         // (0,1,0) - Tier 1
    const wizard = CLASSES_BY_ID['wizard'];       // (0,0,1) - Tier 1
    const knight = CLASSES_BY_ID['knight'];       // (2,0,0) - Tier 2
    const infiltrator = CLASSES_BY_ID['infiltrator']; // (0,2,0) - Tier 2
    const sorcerer = CLASSES_BY_ID['sorcerer'];   // (0,0,2) - Tier 2
    const berserker = CLASSES_BY_ID['berserker']; // (2,0,1) - Tier 3
    const cavalier = CLASSES_BY_ID['cavalier'];   // (2,1,0) - Tier 3

    // At Level 0 (0,0,0): all Tier 1 corners are eligible, none are locked out
    const initial = createInitialProgression('unit-1');
    expect(isClassLockedOut(warrior, 0, initial.archetypePoints)).toBe(false);
    expect(isClassLockedOut(thief, 0, initial.archetypePoints)).toBe(false);
    expect(isClassLockedOut(wizard, 0, initial.archetypePoints)).toBe(false);
    expect(isClassEligibleNextLevel(warrior, 0, initial.archetypePoints)).toBe(true);
    expect(isClassEligibleNextLevel(thief, 0, initial.archetypePoints)).toBe(true);
    expect(isClassEligibleNextLevel(wizard, 0, initial.archetypePoints)).toBe(true);
    expect(isClassEligibleNextLevel(sorcerer, 0, initial.archetypePoints)).toBe(false);

    // Taking 1 Mage -> Level 1 with (0,0,1), Wizard unlocked
    const lvl1 = advanceArchetypeLevel(initial, 'MAGE');
    expect(lvl1.constellation).toEqual(['wizard']);

    // Wizard is unlocked
    expect(isClassLockedOut(wizard, 1, lvl1.archetypePoints, true)).toBe(false);

    // Warrior and Thief are lower/current tier and incompatible -> locked out
    expect(isClassLockedOut(warrior, 1, lvl1.archetypePoints, false)).toBe(true);
    expect(isClassLockedOut(thief, 1, lvl1.archetypePoints, false)).toBe(true);

    // Knight (2,0,0) and Infiltrator (0,2,0) require 0 Mage, but unit has 1 Mage -> locked out!
    expect(isClassLockedOut(knight, 1, lvl1.archetypePoints, false)).toBe(true);
    expect(isClassLockedOut(infiltrator, 1, lvl1.archetypePoints, false)).toBe(true);
    expect(isClassEligibleNextLevel(knight, 1, lvl1.archetypePoints)).toBe(false);
    expect(isClassEligibleNextLevel(infiltrator, 1, lvl1.archetypePoints)).toBe(false);

    // Sorcerer (0,0,2) is open and eligible at next level!
    expect(isClassLockedOut(sorcerer, 1, lvl1.archetypePoints, false)).toBe(false);
    expect(isClassEligibleNextLevel(sorcerer, 1, lvl1.archetypePoints)).toBe(true);

    // Berserker (2,0,1) requires 1 Mage, so it remains a viable future pathway (not locked out, but not next level)
    expect(isClassLockedOut(berserker, 1, lvl1.archetypePoints, false)).toBe(false);
    expect(isClassEligibleNextLevel(berserker, 1, lvl1.archetypePoints)).toBe(false);

    // Cavalier (2,1,0) requires 0 Mage, but unit has 1 Mage -> locked out!
    expect(isClassLockedOut(cavalier, 1, lvl1.archetypePoints, false)).toBe(true);
  });

  it('progresses from Level 0 to Level 1 and unlocks Warrior', () => {
    const initial = createInitialProgression('unit-1');
    const lvl1 = advanceArchetypeLevel(initial, 'FIGHTER');

    expect(lvl1.currentLevel).toBe(1);
    expect(lvl1.archetypePoints).toEqual({ fighter: 1, rogue: 0, mage: 0 });
    expect(lvl1.constellation).toEqual(['warrior']);
  });

  it('handles off-node level-ups gracefully without adding to constellation', () => {
    // Level 0 -> Level 1 (Fighter) -> Warrior (1,0,0)
    const lvl1 = advanceArchetypeLevel(createInitialProgression('unit-1'), 'FIGHTER');
    // Level 1 -> Level 2 (Rogue) -> (1,1,0) - off-node
    const lvl2 = advanceArchetypeLevel(lvl1, 'ROGUE');

    expect(lvl2.currentLevel).toBe(2);
    expect(lvl2.archetypePoints).toEqual({ fighter: 1, rogue: 1, mage: 0 });
    // Constellation should still only have Warrior
    expect(lvl2.constellation).toEqual(['warrior']);
    expect(getClassAtCoord(lvl2.archetypePoints)).toBeNull();
    expect(getEligibleClassAtLevel(lvl2.archetypePoints, 2)).toBeNull();

    // Level 2 -> Level 3 (Fighter) -> (2,1,0) - Cavalier
    const lvl3 = advanceArchetypeLevel(lvl2, 'FIGHTER');
    expect(lvl3.currentLevel).toBe(3);
    expect(lvl3.archetypePoints).toEqual({ fighter: 2, rogue: 1, mage: 0 });
    expect(lvl3.constellation).toEqual(['warrior', 'cavalier']);
  });

  it('advances sequentially through multiple levels', () => {
    const initial = createInitialProgression('unit-2');
    const sequence: readonly ('FIGHTER' | 'ROGUE' | 'MAGE')[] = [
      'FIGHTER', // 1: (1,0,0) -> Warrior
      'FIGHTER', // 2: (2,0,0) -> Knight
      'MAGE',    // 3: (2,0,1) -> Berserker
      'FIGHTER', // 4: (3,0,1) -> Dragoon
      'FIGHTER', // 5: (4,0,1) -> off-node
      'FIGHTER', // 6: (5,0,1) -> off-node
      'MAGE',    // 7: (5,0,2) -> off-node
      'ROGUE',   // 8: (5,1,2) -> Herald
      'ROGUE'    // 9: (5,2,2) -> Warlord
    ];

    const final = advanceMultipleLevels(initial, sequence);

    expect(final.currentLevel).toBe(9);
    expect(final.archetypePoints).toEqual({ fighter: 5, rogue: 2, mage: 2 });
    expect(final.constellation).toEqual([
      'warrior',
      'knight',
      'berserker',
      'dragoon',
      'herald',
      'warlord'
    ]);
  });

  it('prevents exceeding archetype point cap of 5', () => {
    let unit = createInitialProgression('unit-3');
    for (let i = 0; i < 5; i++) {
      unit = advanceArchetypeLevel(unit, 'FIGHTER');
    }
    expect(unit.archetypePoints.fighter).toBe(5);

    expect(() => advanceArchetypeLevel(unit, 'FIGHTER')).toThrowError(
      /Cannot exceed max archetype cap/
    );
  });

  it('prevents leveling beyond the maximum level cap of 9', () => {
    const sequence: readonly ('FIGHTER' | 'ROGUE' | 'MAGE')[] = [
      'FIGHTER', 'FIGHTER', 'FIGHTER', 'FIGHTER', 'FIGHTER', // 5 Fighter
      'ROGUE', 'ROGUE', 'ROGUE', 'ROGUE'                    // 4 Rogue -> Total 9 (Archer)
    ];

    const cappedUnit = advanceMultipleLevels(createInitialProgression('unit-4'), sequence);
    expect(cappedUnit.currentLevel).toBe(MAX_LEVEL);

    expect(() => advanceArchetypeLevel(cappedUnit, 'MAGE')).toThrowError(
      /maximum level cap/
    );
  });
});
