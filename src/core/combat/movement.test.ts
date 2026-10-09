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

  it('allows safe ledge drop-down (dh = -1) without fall damage', () => {
    const arena = createRadialArena(3);
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 1, isWalkable: true });
    arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });

    const hero = createRecruit('hero', 'Alden');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;
    const initialHp = heroCu.currentHp;

    executeMove(state, 'hero', { q: 1, r: 0 });
    expect(heroCu.currentHp).toBe(initialHp);
    expect(arena.getUnitPosition('hero')).toEqual({ q: 1, r: 0 });
    expect(heroCu.currentAp).toBe(2);
  });

  it('applies direct unmitigated fall damage when plunging down a cliff (dh = -2)', () => {
    const arena = createRadialArena(3);
    // Hero starts on high cliff at elevation 2
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
    arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });

    const hero = createRecruit('hero', 'Alden');
    // Give hero high armor to verify fall damage is unmitigated by armor
    (hero as any).effectiveVitals = { ...hero.effectiveVitals, armor: 10 };
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;
    const initialHp = heroCu.currentHp;

    // Plunge down cliff (dh = -2 -> 2 * 4 = 8 damage)
    executeMove(state, 'hero', { q: 1, r: 0 });

    expect(heroCu.currentHp).toBe(initialHp - 8);
    expect(arena.getUnitPosition('hero')).toEqual({ q: 1, r: 0 });

    // Verify combat log recorded fall damage
    const fallLog = state.combatLog.find((log) => log.message.includes('Fall Impact Damage'));
    expect(fallLog).toBeDefined();
    expect(fallLog!.message).toContain('8 direct Fall Impact Damage');
  });

  it('applies 12 direct fall damage when plunging down dh = -3', () => {
    const arena = createRadialArena(3);
    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 3, isWalkable: true });
    arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });

    const hero = createRecruit('hero', 'Alden');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;
    const initialHp = heroCu.currentHp;

    // Plunge down 3 elevation levels -> 3 * 4 = 12 damage
    executeMove(state, 'hero', { q: 1, r: 0 });

    expect(heroCu.currentHp).toBe(initialHp - 12);
  });
});
