import { describe, it, expect } from 'vitest';
import { Unit } from '../types/unit';
import { createRecruit } from '../units/unitFactory';
import {
  computeUnitThreat,
  computeSquadThreat,
  computeStageThreatBudget,
  BASE_RECRUIT_THREAT
} from './threatBudget';

function createMockUnitAtLevel(id: string, level: number): Unit {
  const recruit = createRecruit(id, `Hero-${id}`);
  return {
    ...recruit,
    progression: {
      ...recruit.progression,
      currentLevel: level
    }
  };
}

describe('Threat Budget & Challenge Rating', () => {
  it('computes 10 threat points for a Level-0 Novice', () => {
    const recruit = createRecruit('u1', 'Alden');
    expect(computeUnitThreat(recruit)).toBe(BASE_RECRUIT_THREAT);
  });

  it('scales threat points for promoted Level 1 and Level 2 units', () => {
    const lvl1 = createMockUnitAtLevel('u1', 1);
    const lvl2 = createMockUnitAtLevel('u2', 2);

    expect(computeUnitThreat(lvl1)).toBe(25);
    expect(computeUnitThreat(lvl2)).toBe(40);
  });

  it('aggregates squad threat across all active units', () => {
    const squad: Unit[] = [
      createMockUnitAtLevel('u1', 0),
      createMockUnitAtLevel('u2', 0),
      createMockUnitAtLevel('u3', 0)
    ];

    expect(computeSquadThreat(squad)).toBe(30);

    const promotedSquad: Unit[] = [
      createMockUnitAtLevel('u1', 1),
      createMockUnitAtLevel('u2', 1),
      createMockUnitAtLevel('u3', 0)
    ];

    // 25 + 25 + 10 = 60
    expect(computeSquadThreat(promotedSquad)).toBe(60);
  });

  it('scales target threat budget monotonically across stages', () => {
    const squadThreat = 30;

    expect(computeStageThreatBudget(squadThreat, 1)).toBe(30);
    expect(computeStageThreatBudget(squadThreat, 2)).toBe(33);
    expect(computeStageThreatBudget(squadThreat, 3)).toBe(36);
    expect(computeStageThreatBudget(squadThreat, 5)).toBe(42);
    expect(computeStageThreatBudget(squadThreat, 10)).toBe(57);
  });
});
