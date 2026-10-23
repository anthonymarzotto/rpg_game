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

  it('clears turn-expiring abilityModifiers on active unit when turn ends', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Alden');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;

    heroCu.abilityModifiers.push({
      id: 'spell_sculpt',
      name: 'Spell Sculpt',
      deltas: { range: 1, aoeRadius: 1 },
      consumesOnUse: true,
      expiresAtTurnEnd: true
    });
    heroCu.abilityModifiers.push({
      id: 'temp_boost',
      name: 'Temp Boost',
      deltas: { apCost: -1 },
      durationTurns: 2
    });

    expect(heroCu.abilityModifiers).toHaveLength(2);
    endActiveTurn(state);
    // expiresAtTurnEnd was removed, durationTurns decremented from 2 to 1
    expect(heroCu.abilityModifiers).toHaveLength(1);
    expect(heroCu.abilityModifiers[0].id).toBe('temp_boost');
    expect(heroCu.abilityModifiers[0].durationTurns).toBe(1);
  });

  describe('Facing-Aware Stealth Detection at Turn Start', () => {
    it('reveals opposing stealthed unit when positioned in active unit FRONT arc at range 1', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Infiltrator', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 }); // Direct East (+1, 0, Direction 0)

      const state = createCombatState(arena, [hero, enemy], 'enemy');
      const heroCu = state.units.get('hero')!;
      const enemyCu = state.units.get('enemy')!;

      heroCu.facing = 0; // Facing East (directly toward enemy at {q: 1, r: 0})
      enemyCu.facing = 0; // Enemy facing East (Hero is looking at enemy's rear/back)

      // Enemy has STEALTH
      enemyCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: 'enemy'
      });

      // Advance turn to Hero
      heroCu.initiativeGauge = 100;
      enemyCu.initiativeGauge = 0;
      endActiveTurn(state, 0);

      expect(state.activeUnitId).toBe('hero');
      // Enemy was in Hero's FRONT arc -> STEALTH removed!
      expect(enemyCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
      // Enemy facing was preserved (not auto-rotated)
      expect(enemyCu.facing).toBe(0);
      // Log entry emitted
      expect(state.combatLog.some((l) => l.message.includes('Alden spotted Infiltrator in their direct field of view'))).toBe(true);
    });

    it('preserves STEALTH when positioned in active unit REAR or FLANK arc at range 1', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Infiltrator', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: -1, r: 0 }); // Direct West (-1, 0, Direction 3)

      const state = createCombatState(arena, [hero, enemy], 'enemy');
      const heroCu = state.units.get('hero')!;
      const enemyCu = state.units.get('enemy')!;

      heroCu.facing = 0; // Facing East (Hero looking away from enemy at {q: -1, r: 0})
      enemyCu.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 2,
        sourceUnitId: 'enemy'
      });

      // Advance turn to Hero
      heroCu.initiativeGauge = 100;
      enemyCu.initiativeGauge = 0;
      endActiveTurn(state, 0);

      expect(state.activeUnitId).toBe('hero');
      // Enemy was in Hero's REAR arc (blind spot) -> STEALTH preserved!
      expect(enemyCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(true);
    });
  });
});
