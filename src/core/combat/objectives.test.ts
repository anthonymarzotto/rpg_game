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
  it('evaluates FACTION_DEFEATED correctly', () => {
    const state = setupTestCombatState();
    const condition = {
      kind: 'FACTION_DEFEATED' as const,
      faction: 'ENEMY' as const
    };

    expect(evaluateCondition(condition, state)).toBe(false);

    // Defeat dummy1
    state.units.get('dummy1')!.currentHp = 0;
    state.units.get('dummy1')!.isDefeated = true;
    expect(evaluateCondition(condition, state)).toBe(false);

    // Defeat dummy2
    state.units.get('dummy2')!.currentHp = 0;
    state.units.get('dummy2')!.isDefeated = true;
    expect(evaluateCondition(condition, state)).toBe(true);
  });

  it('evaluates composable allOf condition trees', () => {
    const state = setupTestCombatState();
    const condition = {
      allOf: [
        { kind: 'FACTION_DEFEATED' as const, faction: 'ENEMY' as const }
      ]
    };

    expect(evaluateCondition(condition, state)).toBe(false);

    state.units.get('dummy1')!.currentHp = 0;
    state.units.get('dummy1')!.isDefeated = true;
    state.units.get('dummy2')!.currentHp = 0;
    state.units.get('dummy2')!.isDefeated = true;

    expect(evaluateCondition(condition, state)).toBe(true);
  });

  it('evaluates composable anyOf condition trees', () => {
    const state = setupTestCombatState();
    const condition = {
      anyOf: [
        { kind: 'FACTION_DEFEATED' as const, faction: 'ENEMY' as const }
      ]
    };

    expect(evaluateCondition(condition, state)).toBe(false);

    state.units.get('dummy1')!.currentHp = 0;
    state.units.get('dummy1')!.isDefeated = true;
    state.units.get('dummy2')!.currentHp = 0;
    state.units.get('dummy2')!.isDefeated = true;

    expect(evaluateCondition(condition, state)).toBe(true);
  });

  describe('evaluateEncounterOutcome', () => {
    const objectives: readonly EncounterObjective[] = [
      {
        id: 'rout_enemies',
        description: 'Defeat all enemies',
        condition: { kind: 'FACTION_DEFEATED', faction: 'ENEMY' }
      }
    ];

    it('returns IN_PROGRESS when objectives are unmet', () => {
      const state = setupTestCombatState();
      expect(evaluateEncounterOutcome(objectives, state)).toBe('IN_PROGRESS');
    });

    it('returns VICTORY when all objectives are fulfilled', () => {
      const state = setupTestCombatState();
      state.units.get('dummy1')!.currentHp = 0;
      state.units.get('dummy1')!.isDefeated = true;
      state.units.get('dummy2')!.currentHp = 0;
      state.units.get('dummy2')!.isDefeated = true;
      expect(evaluateEncounterOutcome(objectives, state)).toBe('VICTORY');
    });

    it('prioritizes DEFEAT if all player units fall', () => {
      const state = setupTestCombatState();
      state.units.get('player')!.currentHp = 0;
      state.units.get('player')!.isDefeated = true;

      expect(evaluateEncounterOutcome(objectives, state)).toBe('DEFEAT');
    });
  });
});
