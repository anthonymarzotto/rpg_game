import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeMove } from './resolver';
import { endActiveTurn } from './turnClock';

describe('CTB Turn Clock Advancement & Unspent AP Recovery', () => {
  it('refunds 20 gauge points per unspent AP on turn end', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    const enemy = createRecruit('enemy', 'Orc');

    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');
    const heroCu = state.units.get('hero')!;
    expect(state.activeUnitId).toBe('hero');

    // Hero spends 1 AP on movement, leaving 2 AP unspent
    executeMove(state, 'hero', { q: 1, r: 0 });
    expect(heroCu.currentAp).toBe(2);

    // End turn with 2 unspent AP -> 2 * 20 = 40 gauge recovery baseline.
    // Clock ticks 6 times: Hero reaches 100 first (40 + 60), while Enemy is only at 60!
    const nextActiveId = endActiveTurn(state);

    expect(nextActiveId).toBe('hero');
    expect(state.turnNumber).toBe(2);
    expect(heroCu.currentAp).toBe(3);
    expect(state.units.get('enemy')!.initiativeGauge).toBe(60);
  });

  it('decrements active modifier durations on turn start and purges expired ones', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;

    // Add a 1-turn armor buff and a 2-turn speed buff
    heroCu.activeModifiers.push(
      { stat: 'armor', value: 2, durationTurns: 1 },
      { stat: 'speed', value: 4, durationTurns: 2 }
    );

    expect(heroCu.activeModifiers).toHaveLength(2);

    // Hero ends turn
    endActiveTurn(state);

    // On Hero's next turn start, 1-turn armor buff decrements to 0 and is purged;
    // 2-turn speed buff decrements to 1 and remains active!
    expect(heroCu.activeModifiers).toHaveLength(1);
    expect(heroCu.activeModifiers[0].stat).toBe('speed');
    expect(heroCu.activeModifiers[0].durationTurns).toBe(1);

    // Hero ends turn again
    endActiveTurn(state);

    // Now the speed buff decrements to 0 and is purged
    expect(heroCu.activeModifiers).toHaveLength(0);
  });
});
