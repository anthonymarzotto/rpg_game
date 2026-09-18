import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createCombatState } from './resolver';
import { createRecruit } from '../units/unitFactory';
import { Unit } from '../types/unit';
import { EncounterObjective } from './types';
import { evaluateCondition, evaluateEncounterOutcome } from './objectives';

function setupTestCombatState() {
  const arena = createRadialArena(2);
  const player = createRecruit('player', 'Hero', { faction: 'PLAYER' });
  const dummy1: Unit = {
    ...createRecruit('dummy1', 'Target Dummy 1', { faction: 'ENEMY' }),
    faction: 'ENEMY'
  };
  const dummy2: Unit = {
    ...createRecruit('dummy2', 'Target Dummy 2', { faction: 'ENEMY' }),
    faction: 'ENEMY'
  };

  arena.setUnitPosition('player', { q: 0, r: 0 });
  arena.setUnitPosition('dummy1', { q: 1, r: 0 });
  arena.setUnitPosition('dummy2', { q: 0, r: 1 });

  return createCombatState(arena, [player, dummy1, dummy2], 'player');
}

describe('objectives evaluation engine', () => {
  it('evaluates ARCHETYPE_XP_EARNED correctly', () => {
    const state = setupTestCombatState();
    const condition = {
      kind: 'ARCHETYPE_XP_EARNED' as const,
      unitId: 'player',
      archetype: 'FIGHTER' as const,
      amount: 5
    };

    expect(evaluateCondition(condition, state)).toBe(false);

    state.units.get('player')!.inBattleXp.fighter = 4;
    expect(evaluateCondition(condition, state)).toBe(false);

    state.units.get('player')!.inBattleXp.fighter = 5;
    expect(evaluateCondition(condition, state)).toBe(true);

    state.units.get('player')!.inBattleXp.fighter = 7;
    expect(evaluateCondition(condition, state)).toBe(true);
  });

  it('evaluates composable allOf condition trees', () => {
    const state = setupTestCombatState();
    const condition = {
      allOf: [
        { kind: 'ARCHETYPE_XP_EARNED' as const, unitId: 'player', archetype: 'FIGHTER' as const, amount: 2 },
        { kind: 'ARCHETYPE_XP_EARNED' as const, unitId: 'player', archetype: 'MAGE' as const, amount: 3 }
      ]
    };

    expect(evaluateCondition(condition, state)).toBe(false);

    state.units.get('player')!.inBattleXp.fighter = 2;
    expect(evaluateCondition(condition, state)).toBe(false);

    state.units.get('player')!.inBattleXp.mage = 3;
    expect(evaluateCondition(condition, state)).toBe(true);
  });

  it('evaluates composable anyOf condition trees (any archetype 5 XP)', () => {
    const state = setupTestCombatState();
    const condition = {
      anyOf: [
        { kind: 'ARCHETYPE_XP_EARNED' as const, unitId: 'player', archetype: 'FIGHTER' as const, amount: 5 },
        { kind: 'ARCHETYPE_XP_EARNED' as const, unitId: 'player', archetype: 'ROGUE' as const, amount: 5 },
        { kind: 'ARCHETYPE_XP_EARNED' as const, unitId: 'player', archetype: 'MAGE' as const, amount: 5 }
      ]
    };

    expect(evaluateCondition(condition, state)).toBe(false);

    // Earning 5 Rogue XP triggers it
    state.units.get('player')!.inBattleXp.rogue = 5;
    expect(evaluateCondition(condition, state)).toBe(true);
  });

  describe('evaluateEncounterOutcome', () => {
    const objectives: readonly EncounterObjective[] = [
      {
        id: 'trial_xp',
        description: 'Earn 5 XP in any archetype',
        condition: {
          anyOf: [
            { kind: 'ARCHETYPE_XP_EARNED', unitId: 'player', archetype: 'FIGHTER', amount: 5 },
            { kind: 'ARCHETYPE_XP_EARNED', unitId: 'player', archetype: 'ROGUE', amount: 5 },
            { kind: 'ARCHETYPE_XP_EARNED', unitId: 'player', archetype: 'MAGE', amount: 5 }
          ]
        }
      }
    ];

    it('returns IN_PROGRESS when objectives are unmet', () => {
      const state = setupTestCombatState();
      expect(evaluateEncounterOutcome(objectives, state, 'player')).toBe('IN_PROGRESS');
    });

    it('returns VICTORY when all objectives are fulfilled', () => {
      const state = setupTestCombatState();
      state.units.get('player')!.inBattleXp.fighter = 5;
      expect(evaluateEncounterOutcome(objectives, state, 'player')).toBe('VICTORY');
    });

    it('prioritizes DEFEAT if the player recruit falls', () => {
      const state = setupTestCombatState();
      // Even if XP threshold was somehow met, falling in battle is defeat
      state.units.get('player')!.inBattleXp.fighter = 5;
      state.units.get('player')!.currentHp = 0;
      state.units.get('player')!.isDefeated = true;

      expect(evaluateEncounterOutcome(objectives, state, 'player')).toBe('DEFEAT');
    });
  });
});
