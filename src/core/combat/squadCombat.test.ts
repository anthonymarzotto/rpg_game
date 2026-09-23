import { describe, it, expect } from 'vitest';
import { Unit } from '../types/unit';
import { createRadialArena } from '../grid/templates';
import { createCombatState, executeAbility } from './resolver';
import {
  stepClockUntilReady,
  predictTurnOrder
} from './turnClock';
import { evaluateEncounterOutcome } from './objectives';
import { MINOR_WARD } from '../../data/packages/novice';
import { DevDiceRoller } from '../../ui/combat/devDice';

function makeMockUnit(
  id: string,
  name: string,
  speed: number,
  faction: 'PLAYER' | 'ENEMY' = 'PLAYER'
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
      maxHp: 30,
      maxAp: 3,
      speed,
      move: 3,
      evasion: 10,
      resolve: 10,
      armor: 2,
      ward: 1
    },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: ['strike', 'minor_ward']
  };
}

describe('Squad Combat & Turn Scheduling', () => {
  it('stepClockUntilReady correctly ticks gauges and resolves ties', () => {
    const participants = [
      { id: 'alden', gauge: 80, speed: 10 },
      { id: 'dummy', gauge: 85, speed: 5 }
    ];

    // Tick 1: alden = 90, dummy = 90
    // Tick 2: alden = 100, dummy = 95 -> alden wins
    const result1 = stepClockUntilReady(participants);
    expect(result1.ticks).toBe(2);
    expect(result1.winner.id).toBe('alden');
    expect(participants[0].gauge).toBe(100);
    expect(participants[1].gauge).toBe(95);

    // If both reach >= 100 with same gauge, higher speed wins
    const tieParticipants = [
      { id: 'slow', gauge: 90, speed: 10 }, // -> 100
      { id: 'fast', gauge: 85, speed: 15 }  // -> 100
    ];
    const tieResult = stepClockUntilReady(tieParticipants);
    expect(tieResult.winner.id).toBe('fast');
  });

  it('predictTurnOrder projects upcoming turns accurately without mutating state', () => {
    const arena = createRadialArena(3);
    const u1 = makeMockUnit('p1', 'Alden', 12, 'PLAYER');
    const u2 = makeMockUnit('p2', 'Lyra', 20, 'PLAYER'); // Very fast
    const e1 = makeMockUnit('e1', 'Dummy', 6, 'ENEMY');   // Slow

    arena.setUnitPosition('p1', { q: 0, r: 0 });
    arena.setUnitPosition('p2', { q: 1, r: 0 });
    arena.setUnitPosition('e1', { q: 2, r: 0 });

    const state = createCombatState(arena, [u1, u2, e1], 'p1');
    const p1Cu = state.units.get('p1')!;
    const p2Cu = state.units.get('p2')!;
    const e1Cu = state.units.get('e1')!;

    // Initial gauges
    p1Cu.initiativeGauge = 100;
    p2Cu.initiativeGauge = 40;
    e1Cu.initiativeGauge = 10;

    const projected = predictTurnOrder(state, 6);
    expect(projected.length).toBe(6);

    // Slot 0 is current active (p1)
    expect(projected[0].unitId).toBe('p1');
    expect(projected[0].isCurrentActive).toBe(true);

    // Ensure state was not mutated by predictTurnOrder
    expect(p1Cu.initiativeGauge).toBe(100);
    expect(p2Cu.initiativeGauge).toBe(40);
    expect(e1Cu.initiativeGauge).toBe(10);
    expect(state.activeUnitId).toBe('p1');

    // Fast unit (Lyra, speed 20) should appear multiple times before slow unit (Dummy, speed 6)
    const lyraTurns = projected.filter((entry) => entry.unitId === 'p2');
    expect(lyraTurns.length).toBeGreaterThanOrEqual(2);
  });

  it('squad defeat only triggers when ALL player units are defeated', () => {
    const arena = createRadialArena(3);
    const u1 = makeMockUnit('p1', 'Alden', 10, 'PLAYER');
    const u2 = makeMockUnit('p2', 'Lyra', 10, 'PLAYER');
    const e1 = makeMockUnit('e1', 'Dummy', 10, 'ENEMY');

    const state = createCombatState(arena, [u1, u2, e1], 'p1');
    const p1Cu = state.units.get('p1')!;
    const p2Cu = state.units.get('p2')!;

    // 1. All alive -> IN_PROGRESS
    expect(evaluateEncounterOutcome(undefined, state)).toBe('IN_PROGRESS');

    // 2. Alden falls -> still IN_PROGRESS because Lyra is alive
    p1Cu.currentHp = 0;
    p1Cu.isDefeated = true;
    expect(evaluateEncounterOutcome(undefined, state)).toBe('IN_PROGRESS');

    // 3. Lyra also falls -> DEFEAT (squad wipe)
    p2Cu.currentHp = 0;
    p2Cu.isDefeated = true;
    expect(evaluateEncounterOutcome(undefined, state)).toBe('DEFEAT');
  });

  it('FACTION_DEFEATED objective triggers victory when all enemies fall', () => {
    const arena = createRadialArena(3);
    const u1 = makeMockUnit('p1', 'Alden', 10, 'PLAYER');
    const e1 = makeMockUnit('e1', 'Dummy A', 10, 'ENEMY');
    const e2 = makeMockUnit('e2', 'Dummy B', 10, 'ENEMY');

    const objectives = [
      {
        id: 'rout_enemies',
        description: 'Defeat all enemy units',
        condition: { kind: 'FACTION_DEFEATED' as const, faction: 'ENEMY' as const }
      }
    ];

    const state = createCombatState(arena, [u1, e1, e2], 'p1');
    const e1Cu = state.units.get('e1')!;
    const e2Cu = state.units.get('e2')!;

    expect(evaluateEncounterOutcome(objectives, state)).toBe('IN_PROGRESS');

    e1Cu.currentHp = 0;
    e1Cu.isDefeated = true;
    expect(evaluateEncounterOutcome(objectives, state)).toBe('IN_PROGRESS');

    e2Cu.currentHp = 0;
    e2Cu.isDefeated = true;
    expect(evaluateEncounterOutcome(objectives, state)).toBe('VICTORY');
  });

  it('friendly ability (Minor Ward) can target an ally and applies modifier', () => {
    const arena = createRadialArena(3);
    const vael = makeMockUnit('vael', 'Vael', 10, 'PLAYER');
    const alden = makeMockUnit('alden', 'Alden', 10, 'PLAYER');

    arena.setUnitPosition('vael', { q: 0, r: 0 });
    arena.setUnitPosition('alden', { q: 1, r: 0 });

    const state = createCombatState(arena, [vael, alden], 'vael');
    const aldenCu = state.units.get('alden')!;

    const roller = new DevDiceRoller('NORMAL');
    const resolution = executeAbility(
      state,
      'vael',
      MINOR_WARD,
      { coord: { q: 1, r: 0 }, targetUnitId: 'alden' },
      roller
    );

    expect(resolution.type).toBe('BUFF');
    expect(aldenCu.activeModifiers.some((m) => m.stat === 'ward' && m.value === 2)).toBe(true);
  });
});
