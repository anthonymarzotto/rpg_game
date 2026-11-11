import { describe, it, expect } from 'vitest';
import { Unit } from '../types/unit';
import { createRecruit } from '../units/unitFactory';
import {
  computeUnitThreat,
  computeSquadThreat,
  computeStageThreatBudget,
  computeProjectedUnitThreat,
  computeProjectedSquadThreat,
  getStageHostileBonusThreat,
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

  it('computes projected unit and squad threat accounting for pending level ascensions', () => {
    // Novice with 0 XP -> not ready, level 0 (10 pts)
    const noviceNoXp = createRecruit('u1', 'Alden');
    expect(computeProjectedUnitThreat(noviceNoXp)).toBe(10);

    // Novice with 5 Fighter XP -> qualifies for Level 1 (threshold is 5) -> projected level 1 (25 pts)
    const noviceReady: Unit = {
      ...noviceNoXp,
      progression: {
        ...noviceNoXp.progression,
        accumulatedXp: { fighter: 5, rogue: 0, mage: 0 }
      }
    };
    expect(computeProjectedUnitThreat(noviceReady)).toBe(25);

    // Promoted Level 1 unit with 10 Rogue XP -> qualifies for Level 2 (threshold is 10) -> projected level 2 (40 pts)
    const lvl1Ready: Unit = {
      ...createMockUnitAtLevel('u2', 1),
      progression: {
        ...createMockUnitAtLevel('u2', 1).progression,
        accumulatedXp: { fighter: 0, rogue: 12, mage: 0 }
      }
    };
    expect(computeProjectedUnitThreat(lvl1Ready)).toBe(40);

    // Promoted Level 1 unit with only 4 XP -> does not meet threshold 10 -> stays at level 1 (25 pts)
    const lvl1NotReady: Unit = {
      ...createMockUnitAtLevel('u3', 1),
      progression: {
        ...createMockUnitAtLevel('u3', 1).progression,
        accumulatedXp: { fighter: 4, rogue: 0, mage: 0 }
      }
    };
    expect(computeProjectedUnitThreat(lvl1NotReady)).toBe(25);

    // Squad with 2 ready units and 1 unready unit: 25 + 40 + 25 = 90
    const mixedSquad = [noviceReady, lvl1Ready, lvl1NotReady];
    expect(computeProjectedSquadThreat(mixedSquad)).toBe(90);
  });

  it('evaluates stage hostile bonus threat based on highest tier unlocked', () => {
    // Stage 1: Novice (+0 pts for parity recruit trial)
    expect(getStageHostileBonusThreat(1)).toBe(0);
    // Stage 2: Tier 1 (+25 pts)
    expect(getStageHostileBonusThreat(2)).toBe(25);
    // Stage 3-4: Tier 2 (+40 pts)
    expect(getStageHostileBonusThreat(3)).toBe(40);
    expect(getStageHostileBonusThreat(4)).toBe(40);
    // Stage 5: Tier 3 (+55 pts)
    expect(getStageHostileBonusThreat(5)).toBe(55);
    // Stage 6+: Tier 4 (+70 pts)
    expect(getStageHostileBonusThreat(6)).toBe(70);
    expect(getStageHostileBonusThreat(10)).toBe(70);
  });
});

