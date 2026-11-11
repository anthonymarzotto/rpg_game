import { describe, it, expect } from 'vitest';
import { runSquadSimulation } from './squadSimulation';
import { createSimulatedCombatant } from './simulation';

describe('Squad Simulation Engine', () => {
  it('executes a simulation batch with normalizedLevel parity', () => {
    const result = runSquadSimulation({
      matches: 4,
      maxTurnsPerMatch: 40,
      arenaRadius: 3,
      normalizedLevel: 4,
      baseSeed: 554433
    });

    expect(result.totalMatches).toBe(4);
    expect(result.teamAWins + result.teamBWins + result.timeouts).toBe(4);
    expect(result.avgTurnsPerMatch).toBeGreaterThan(0);
  });

  it('verifies that all drafted combatants receive 32 HP at normalized Level 4', () => {
    const classesToTest = [
      'warrior',
      'thief',
      'wizard',
      'knight',
      'infiltrator',
      'cavalier',
      'berserker',
      'shield-bearer',
      'dragoon'
    ];

    for (const classId of classesToTest) {
      const unit = createSimulatedCombatant({ classId, normalizedLevel: 4 });
      expect(unit.effectiveVitals.maxHp).toBe(32);
      const totalAttrs = unit.baseAttributes.force + unit.baseAttributes.finesse + unit.baseAttributes.focus;
      expect(totalAttrs).toBe(4);
    }
  });

  it('executes fixed squad matchups at normalized level', () => {
    const result = runSquadSimulation({
      matches: 2,
      maxTurnsPerMatch: 50,
      arenaRadius: 3,
      normalizedLevel: 4,
      fixedTeamA: ['warrior', 'thief', 'wizard'],
      fixedTeamB: ['shield-bearer', 'dragoon', 'cavalier'],
      baseSeed: 12345
    });

    expect(result.totalMatches).toBe(2);
    expect(result.teamAWins + result.teamBWins + result.timeouts).toBe(2);
  });
});
