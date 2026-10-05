import { describe, it, expect } from 'vitest';
import { checkHeroLevelReady, getArchetypeProgress, getHeroDisplayTitle } from './heroUtils';
import { Unit } from '../../core/types/unit';

function makeMockUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: 'hero-1',
    name: 'Roland',
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: { maxHp: 20, maxAp: 3, movement: 3, armor: 0, defenseDc: 10 },
    progression: {
      unitId: 'hero-1',
      currentLevel: 0,
      constellation: [],
      accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
    },
    loadout: {
      activeClassId: 'novice',
      signatureAbilityId: 'strike',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike'],
    ...overrides
  } as unknown as Unit;
}

describe('heroUtils', () => {
  it('returns isReady false when accumulated XP is below threshold', () => {
    const unit = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 0,
        constellation: [],
        accumulatedXp: { fighter: 4, rogue: 2, mage: 0 },
        archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
      }
    });

    const status = checkHeroLevelReady(unit);
    expect(status.isReady).toBe(false);
    expect(status.qualifyingArchetypes).toEqual([]);
    expect(status.threshold).toBe(5);
  });

  it('returns isReady true with qualifying archetypes when threshold is met', () => {
    const unit = makeMockUnit({
      progression: {
        unitId: 'hero-1',
        currentLevel: 0,
        constellation: [],
        accumulatedXp: { fighter: 5, rogue: 6, mage: 0 },
        archetypePoints: { fighter: 0, rogue: 0, mage: 0 }
      }
    });

    const status = checkHeroLevelReady(unit);
    expect(status.isReady).toBe(true);
    expect(status.qualifyingArchetypes).toEqual(['FIGHTER', 'ROGUE']);
  });

  it('calculates archetype progress correctly capped at 100', () => {
    expect(getArchetypeProgress(2, 5)).toBe(40);
    expect(getArchetypeProgress(5, 5)).toBe(100);
    expect(getArchetypeProgress(7, 5)).toBe(100);
    expect(getArchetypeProgress(0, 0)).toBe(0);
  });

  describe('getHeroDisplayTitle', () => {
    it('returns base class name when unit has 0 off-node milestones', () => {
      const unit = makeMockUnit({
        loadout: {
          activeClassId: 'warrior',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        },
        progression: {
          unitId: 'hero-1',
          currentLevel: 1,
          constellation: ['warrior'],
          accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
          archetypePoints: { fighter: 1, rogue: 0, mage: 0 }
        }
      });

      expect(getHeroDisplayTitle(unit)).toBe('Warrior');
    });

    it('appends Wayfarer I when unit has 1 off-node milestone', () => {
      const unit = makeMockUnit({
        loadout: {
          activeClassId: 'warrior',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        },
        progression: {
          unitId: 'hero-1',
          currentLevel: 2,
          constellation: ['warrior'],
          offNodeMilestones: ['1,1,0'],
          accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
          archetypePoints: { fighter: 1, rogue: 1, mage: 0 }
        }
      });

      expect(getHeroDisplayTitle(unit)).toBe('Warrior • Wayfarer I');
    });

    it('appends Wayfarer II when unit has 2 off-node milestones', () => {
      const unit = makeMockUnit({
        loadout: {
          activeClassId: 'thief',
          wildcardAbilityIds: [],
          wildcardPassiveIds: []
        },
        progression: {
          unitId: 'hero-1',
          currentLevel: 3,
          constellation: ['thief'],
          offNodeMilestones: ['1,1,0', '1,1,1'],
          accumulatedXp: { fighter: 0, rogue: 0, mage: 0 },
          archetypePoints: { fighter: 1, rogue: 1, mage: 1 }
        }
      });

      expect(getHeroDisplayTitle(unit)).toBe('Thief • Wayfarer II');
    });
  });
});

