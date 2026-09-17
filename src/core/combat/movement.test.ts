import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeMove } from './resolver';

describe('Combat Movement & AP Deduction', () => {
  it('handles movement and AP deduction on CombatUnit', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;
    expect(state.activeUnitId).toBe('hero');
    expect(heroCu.currentAp).toBe(3);

    // Move to adjacent tile (costs 1 AP)
    executeMove(state, 'hero', { q: 1, r: 0 });
    expect(heroCu.currentAp).toBe(2);
    expect(arena.getUnitPosition('hero')).toEqual({ q: 1, r: 0 });

    // Move again
    executeMove(state, 'hero', { q: 2, r: 0 });
    expect(heroCu.currentAp).toBe(1);
    expect(arena.getUnitPosition('hero')).toEqual({ q: 2, r: 0 });
  });
});
