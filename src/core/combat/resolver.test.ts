import { describe, it, expect } from 'vitest';
import { createCombatState } from './resolver';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { SeededDiceRoller, MockDiceRoller } from './dice';

describe('createCombatState Initiative Seeding', () => {
  it('seeds initiativeGauge and initialInitiativeRoll with a 1d20 roll', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('campaign-hero-1', 'Hero');
    const goblin = createRecruit('enemy-goblin-1', 'Goblin', { faction: 'ENEMY' });

    // Mock roller that returns 14 for hero and 7 for goblin
    const mockRoller = new MockDiceRoller({ d20Rolls: [14, 7] });

    const state = createCombatState(arena, [hero, goblin], undefined, undefined, undefined, mockRoller);

    const heroCu = state.units.get('campaign-hero-1')!;
    const goblinCu = state.units.get('enemy-goblin-1')!;

    expect(heroCu.initialInitiativeRoll).toBe(14);
    expect(goblinCu.initialInitiativeRoll).toBe(7);
  });

  it('records an opening combat log event for initiative rolls', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('campaign-hero-1', 'Hero');
    const goblin = createRecruit('enemy-goblin-1', 'Goblin', { faction: 'ENEMY' });

    const mockRoller = new MockDiceRoller({ d20Rolls: [18, 5] });

    const state = createCombatState(arena, [hero, goblin], undefined, undefined, undefined, mockRoller);

    const initLog = state.combatLog.find((entry) => entry.actionId === 'initiative');
    expect(initLog).toBeDefined();
    expect(initLog?.turnNumber).toBe(0);
    expect(initLog?.message).toContain('Combat begins! Initiative rolled: Hero (18), Goblin (5)');
  });

  it('rolls deterministically when provided with a SeededDiceRoller', () => {
    const arena1 = createRadialArena(3);
    const arena2 = createRadialArena(3);
    const hero1 = createRecruit('c1', 'Hero 1');
    const goblin1 = createRecruit('e1', 'Goblin 1');
    const hero2 = createRecruit('c1', 'Hero 1');
    const goblin2 = createRecruit('e1', 'Goblin 1');

    const roller1 = new SeededDiceRoller(12345);
    const roller2 = new SeededDiceRoller(12345);

    const state1 = createCombatState(arena1, [hero1, goblin1], undefined, undefined, undefined, roller1);
    const state2 = createCombatState(arena2, [hero2, goblin2], undefined, undefined, undefined, roller2);

    const h1 = state1.units.get('c1')!;
    const h2 = state2.units.get('c1')!;
    const g1 = state1.units.get('e1')!;
    const g2 = state2.units.get('e1')!;

    expect(h1.initialInitiativeRoll).toBe(h2.initialInitiativeRoll);
    expect(g1.initialInitiativeRoll).toBe(g2.initialInitiativeRoll);
    expect(state1.activeUnitId).toBe(state2.activeUnitId);
  });

  it('resolves exact speed and gauge ties by favoring player units', () => {
    const arena = createRadialArena(3);
    const playerUnit = createRecruit('campaign-unit', 'Player Hero', { faction: 'PLAYER' });
    const enemyUnit = createRecruit('enemy-unit', 'Enemy Fiend', { faction: 'ENEMY' });

    // Both units roll identical initiative (15)
    const mockRoller = new MockDiceRoller({ d20Rolls: [15, 15] });

    const state = createCombatState(arena, [playerUnit, enemyUnit], undefined, undefined, undefined, mockRoller);

    // Both reached 100 on the same tick with identical gauge (105) and speed (10)
    // The player unit MUST win the tie
    expect(state.activeUnitId).toBe('campaign-unit');
  });

  it('allows an enemy with higher roll or higher speed to act first', () => {
    const arena = createRadialArena(3);
    const playerUnit = createRecruit('campaign-unit', 'Slow Player', { faction: 'PLAYER' });
    const enemyUnit = createRecruit('enemy-unit', 'Fast Enemy', { faction: 'ENEMY' });

    // Player rolls 2, Enemy rolls 19
    const mockRoller = new MockDiceRoller({ d20Rolls: [2, 19] });

    const state = createCombatState(arena, [playerUnit, enemyUnit], undefined, undefined, undefined, mockRoller);

    // Enemy rolled 19 vs Player 2 -> Enemy crosses 100 first!
    expect(state.activeUnitId).toBe('enemy-unit');
  });

  it('prevents all 3 enemies from taking the first 3 turns in a 3v3 battle', async () => {
    const { predictTurnOrder } = await import('./turnClock');
    const arena = createRadialArena(3);

    const p1 = createRecruit('campaign-p1', 'Player 1', { faction: 'PLAYER' });
    const p2 = createRecruit('campaign-p2', 'Player 2', { faction: 'PLAYER' });
    const p3 = createRecruit('campaign-p3', 'Player 3', { faction: 'PLAYER' });

    const e1 = createRecruit('enemy-e1', 'Enemy 1', { faction: 'ENEMY' });
    const e2 = createRecruit('enemy-e2', 'Enemy 2', { faction: 'ENEMY' });
    const e3 = createRecruit('enemy-e3', 'Enemy 3', { faction: 'ENEMY' });

    // p1..p3 roll [5, 4, 3], e1..e3 roll [20, 18, 16]
    const mockRoller = new MockDiceRoller({ d20Rolls: [5, 4, 3, 20, 18, 16] });

    const state = createCombatState(arena, [p1, p2, p3, e1, e2, e3], undefined, undefined, undefined, mockRoller);

    const openingTurns = predictTurnOrder(state, 3);
    const openingFactions = openingTurns.map((t) => t.faction);

    // Turn 1 and 2 are Enemy, but Turn 3 MUST be Player!
    expect(openingFactions).toEqual(['ENEMY', 'ENEMY', 'PLAYER']);
  });

  it('prevents all 3 players from taking the first 3 turns in a 3v3 battle', async () => {
    const { predictTurnOrder } = await import('./turnClock');
    const arena = createRadialArena(3);

    const p1 = createRecruit('campaign-p1', 'Player 1', { faction: 'PLAYER' });
    const p2 = createRecruit('campaign-p2', 'Player 2', { faction: 'PLAYER' });
    const p3 = createRecruit('campaign-p3', 'Player 3', { faction: 'PLAYER' });

    const e1 = createRecruit('enemy-e1', 'Enemy 1', { faction: 'ENEMY' });
    const e2 = createRecruit('enemy-e2', 'Enemy 2', { faction: 'ENEMY' });
    const e3 = createRecruit('enemy-e3', 'Enemy 3', { faction: 'ENEMY' });

    // p1..p3 roll [20, 18, 16], e1..e3 roll [5, 4, 3]
    const mockRoller = new MockDiceRoller({ d20Rolls: [20, 18, 16, 5, 4, 3] });

    const state = createCombatState(arena, [p1, p2, p3, e1, e2, e3], undefined, undefined, undefined, mockRoller);

    const openingTurns = predictTurnOrder(state, 3);
    const openingFactions = openingTurns.map((t) => t.faction);

    // Turn 1 and 2 are Player, but Turn 3 MUST be Enemy!
    expect(openingFactions).toEqual(['PLAYER', 'PLAYER', 'ENEMY']);
  });
});

