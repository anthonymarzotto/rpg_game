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

  it('resolves POISON and BURN damage ticks at turn start and decrements duration', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    const enemy = createRecruit('enemy', 'Enemy');
    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');
    const enemyCu = state.units.get('enemy')!;
    const initialHp = enemyCu.currentHp;

    // Apply 2-turn POISON and 1-turn BURN to enemy
    enemyCu.activeConditions.push(
      { type: 'POISON', durationTurns: 2, sourceUnitId: 'hero', damagePerTurn: 2 },
      { type: 'BURN', durationTurns: 1, sourceUnitId: 'hero', damagePerTurn: 3 }
    );

    // Set enemy gauge higher so enemy takes next turn
    enemyCu.initiativeGauge = 100;
    const heroCu = state.units.get('hero')!;
    heroCu.initiativeGauge = 0;

    endActiveTurn(state, 0);

    expect(state.activeUnitId).toBe('enemy');
    // Suffered 2 (poison) + 3 (burn) = 5 damage
    expect(enemyCu.currentHp).toBe(initialHp - 5);
    // BURN duration was 1, so it is purged; POISON duration was 2, now 1
    expect(enemyCu.activeConditions).toHaveLength(1);
    expect(enemyCu.activeConditions[0].type).toBe('POISON');
    expect(enemyCu.activeConditions[0].durationTurns).toBe(1);
  });

  it('marks unit defeated when DoT tick reduces HP to 0 without granting AP', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    const enemy = createRecruit('enemy', 'Goblin');
    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');
    const enemyCu = state.units.get('enemy')!;
    enemyCu.currentHp = 3;
    enemyCu.activeConditions.push({
      type: 'POISON',
      durationTurns: 2,
      sourceUnitId: 'hero',
      damagePerTurn: 4
    });

    enemyCu.initiativeGauge = 100;
    const heroCu = state.units.get('hero')!;
    heroCu.initiativeGauge = 0;

    // End hero turn. Enemy was ready, but dies to poison. Clock should advance back to hero!
    const nextActive = endActiveTurn(state, 0);

    expect(enemyCu.isDefeated).toBe(true);
    expect(enemyCu.currentHp).toBe(0);
    expect(enemyCu.currentAp).toBe(0);
    expect(arena.getUnitPosition('enemy')).toBeUndefined();
    expect(nextActive).toBe('hero');
  });

  it('clears pendingAbilityModifier on active unit when turn ends', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;

    heroCu.pendingAbilityModifier = {
      extraRange: 1,
      extraAoeRadius: 1,
      consumesOnUse: true,
      expiresAtTurnEnd: true
    };

    expect(heroCu.pendingAbilityModifier).toBeDefined();
    endActiveTurn(state);
    expect(heroCu.pendingAbilityModifier).toBeUndefined();
  });
});
