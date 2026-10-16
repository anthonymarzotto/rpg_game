import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createCombatState } from './resolver';
import { Unit } from '../types/unit';
import {
  serializeCombatState,
  deserializeCombatState,
  exportTrialJson,
  importTrialJson
} from './stateSerializer';
import { decideNextActionWithTrace } from '../ai/decisionEngine';

function createMockUnit(
  id: string,
  name: string,
  faction: 'PLAYER' | 'ENEMY',
  overrides?: Partial<Unit['effectiveVitals']> & {
    abilities?: string[];
    activeClassId?: string;
    starterAbilityIds?: string[];
  }
): Unit {
  return {
    id,
    name,
    gender: 'male',
    race: 'human',
    faction,
    progression: {
      unitId: id,
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 10, finesse: 10, focus: 10 },
    effectiveVitals: {
      maxHp: overrides?.maxHp ?? 30,
      maxAp: overrides?.maxAp ?? 4,
      armor: overrides?.armor ?? 2,
      ward: overrides?.ward ?? 1,
      speed: overrides?.speed ?? 10,
      move: overrides?.move ?? 3,
      evasion: overrides?.evasion ?? 10,
      resolve: overrides?.resolve ?? 10
    },
    loadout: {
      activeClassId: overrides?.activeClassId ?? (faction === 'ENEMY' ? 'warrior' : 'novice'),
      wildcardAbilityIds: overrides?.abilities ?? [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: overrides?.starterAbilityIds ?? overrides?.abilities ?? ['strike']
  };
}


describe('stateSerializer', () => {
  it('Task 2.1: round-trip serialization and hydration preserves arena, units, positions, vitals, and logs', () => {
    const arena = createRadialArena(3);
    const hero = createMockUnit('hero', 'Player Hero', 'PLAYER', { maxHp: 35 });
    const enemy = createMockUnit('enemy', 'Hostile Novice', 'ENEMY', {
      maxHp: 25,
      activeClassId: 'novice',
      starterAbilityIds: ['strike']
    });

    arena.setUnitPosition(hero.id, { q: 0, r: 0 });
    arena.setUnitPosition(enemy.id, { q: 1, r: -1 });

    const state = createCombatState(arena, [hero, enemy], enemy.id);
    const enemyCu = state.units.get(enemy.id)!;
    enemyCu.currentAp = 3;
    enemyCu.currentHp = 19;

    state.combatLog.push({
      turnNumber: 1,
      actorUnitId: enemy.id,
      actionId: 'test_action',
      message: 'Enemy engaged hero',
      metadata: { type: 'GENERIC', actor: enemy.name, text: 'Engaged' }
    });

    const serialized = serializeCombatState(state);
    expect(serialized.version).toBe(1);
    expect(serialized.units['hero']).toBeDefined();
    expect(serialized.units['enemy']).toBeDefined();
    expect(serialized.arena.tiles.length).toBeGreaterThan(0);
    expect(serialized.arena.unitPositions).toEqual(
      expect.arrayContaining([
        ['hero', { q: 0, r: 0 }],
        ['enemy', { q: 1, r: -1 }]
      ])
    );

    const hydrated = deserializeCombatState(serialized);

    // Verify Arena reconstruction
    expect(hydrated.arena.getUnitPosition('hero')).toEqual({ q: 0, r: 0 });
    expect(hydrated.arena.getUnitPosition('enemy')).toEqual({ q: 1, r: -1 });
    expect(hydrated.arena.getUnitAt({ q: 0, r: 0 })).toBe('hero');
    expect(hydrated.arena.getUnitAt({ q: 1, r: -1 })).toBe('enemy');

    // Verify Units Map reconstruction
    expect(hydrated.units.size).toBe(2);
    const hydratedEnemy = hydrated.units.get('enemy')!;
    expect(hydratedEnemy.currentHp).toBe(19);
    expect(hydratedEnemy.currentAp).toBe(3);
    expect(hydratedEnemy.unit.name).toBe('Hostile Novice');

    // Verify combat log
    expect(hydrated.combatLog.length).toBe(1);
    expect(hydrated.combatLog[0].message).toBe('Enemy engaged hero');
    expect(hydrated.activeUnitId).toBe(enemy.id);
  });

  it('Task 2.1: exportTrialJson and importTrialJson properly stringify and parse JSON payload', () => {
    const arena = createRadialArena(2);
    const hero = createMockUnit('hero', 'Player Hero', 'PLAYER');
    arena.setUnitPosition(hero.id, { q: 0, r: 0 });
    const state = createCombatState(arena, [hero], hero.id);

    const json = exportTrialJson(state);
    expect(typeof json).toBe('string');
    expect(json).toContain('"version": 1');

    const hydrated = importTrialJson(json);
    expect(hydrated.activeUnitId).toBe('hero');
    expect(hydrated.arena.getUnitPosition('hero')).toEqual({ q: 0, r: 0 });
  });

  it('Task 2.2: headless re-simulation executes decideNextActionWithTrace on hydrated state with identical decision scoring', () => {
    const arena = createRadialArena(3);
    const hero = createMockUnit('hero', 'Player Hero', 'PLAYER', { maxHp: 30 });
    const enemy = createMockUnit('enemy', 'Hostile Novice', 'ENEMY', {
      activeClassId: 'novice',
      starterAbilityIds: ['strike']
    });

    arena.setUnitPosition(enemy.id, { q: 0, r: 0 });
    arena.setUnitPosition(hero.id, { q: 1, r: 0 });

    const originalState = createCombatState(arena, [enemy, hero], enemy.id);

    // Decision on original state
    const originalDecision = decideNextActionWithTrace(originalState, enemy.id);

    // Serialize and deserialize
    const json = exportTrialJson(originalState);
    const rehydratedState = importTrialJson(json);

    // Decision on hydrated state
    const rehydratedDecision = decideNextActionWithTrace(rehydratedState, enemy.id);

    expect(rehydratedDecision.action.type).toBe(originalDecision.action.type);
    expect(rehydratedDecision.action.score).toBe(originalDecision.action.score);
    expect(rehydratedDecision.trace.chosenAction).toEqual(originalDecision.trace.chosenAction);
    expect(rehydratedDecision.trace.topCandidates.length).toBe(originalDecision.trace.topCandidates.length);
    expect(rehydratedDecision.trace.topCandidates[0].score).toBe(originalDecision.trace.topCandidates[0].score);
  });
});
