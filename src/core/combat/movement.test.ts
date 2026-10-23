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

  it('reproduces Turn 6 scenario: Hollow Novice facing Silas at turn start, then moving towards Rowan', () => {
    const arena = createRadialArena(4);
    // Obstacle at (0, -2)
    arena.setTile({ coord: { q: 0, r: -2 }, elevation: 0, isWalkable: false });

    const silas = createRecruit('silas', 'Silas', { faction: 'PLAYER' });
    const rowan = createRecruit('rowan', 'Rowan', { faction: 'PLAYER' });
    const hollow = createRecruit('hollow', 'Hollow Novice', { faction: 'ENEMY' });

    arena.setUnitPosition('silas', { q: 1, r: -2 });
    arena.setUnitPosition('rowan', { q: -1, r: -2 });
    arena.setUnitPosition('hollow', { q: 2, r: -2 });

    const state = createCombatState(arena, [silas, rowan, hollow], 'hollow');
    const silasCu = state.units.get('silas')!;
    const rowanCu = state.units.get('rowan')!;
    const hollowCu = state.units.get('hollow')!;

    silasCu.activeConditions.push({ type: 'STEALTH', durationTurns: 1, sourceUnitId: 'silas' });
    rowanCu.activeConditions.push({ type: 'STEALTH', durationTurns: 1, sourceUnitId: 'rowan' });
    hollowCu.facing = 3; // Facing West

    // Move hollow to (0, -3)
    executeMove(state, 'hollow', { q: 0, r: -3 });

    // Moving to (0, -3) did NOT unmask Silas (Silas was in flank/rear during the move path)
    expect(silasCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(true);
    // Stepping to (0, -3) facing West halted at (0, -3) because Rowan at (-1, -2) was spotted in front arc
    expect(rowanCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
    expect(arena.getUnitPosition('hollow')).toEqual({ q: 0, r: -3 });
    expect(state.combatLog.some((l) => l.actionId === 'move_interrupted')).toBe(true);
  });
});
