import { describe, it, expect } from 'vitest';
import { checkHeroLevelReady, getArchetypeProgress } from './heroUtils';
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
});
