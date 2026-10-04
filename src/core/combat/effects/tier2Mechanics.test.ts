import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState, executeAbility } from '../resolver';
import { canExecuteAbility } from '../validator';
import { endActiveTurn } from '../turnClock';
import { MockDiceRoller } from '../dice';
import { Ability } from '../../types/ability';
import { Unit } from '../../types/unit';
import { SPARK, SPELL_SCULPT, GUST, SMOKE_VEIL } from '../../../data/packages';

describe('Tier 2 Combat Engine Mechanics', () => {
  it('evaluates friendly aoeRadius support abilities across all allies within radius', () => {
    const arena = createRadialArena(3);
    const knight = createRecruit('knight', 'Knight', { faction: 'PLAYER' });
    const ally1 = createRecruit('ally1', 'Ally 1', { faction: 'PLAYER' });
    const ally2 = createRecruit('ally2', 'Ally 2', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

    arena.setUnitPosition('knight', { q: 0, r: 0 });
    arena.setUnitPosition('ally1', { q: 1, r: 0 });
    arena.setUnitPosition('ally2', { q: 2, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 1 });

    const state = createCombatState(arena, [knight, ally1, ally2, enemy], 'knight');

    const leadTheCharge: Ability = {
      id: 'lead_the_charge',
      name: 'Lead the Charge',
      description: 'Rallies all allies within 3 hexes.',
      archetypeTag: 'FIGHTER',
      targetType: 'SELF',
      defenseTarget: 'NONE',
      range: 0,
      apCost: 2,
      damageType: 'NONE',
      aoeRadius: 3,
      effects: [
        {
          type: 'STAT_MODIFIER',
          magnitude: 2,
          durationTurns: 2,
          statModifiers: { move: 2, speed: 2 }
        }
      ]
    };

    const res = executeAbility(state, 'knight', leadTheCharge, {}, new MockDiceRoller());

    expect(res.type).toBe('SUPPORT');
    if (res.type === 'SUPPORT') {
      expect(res.targetUnitIds).toContain('knight');
      expect(res.targetUnitIds).toContain('ally1');
      expect(res.targetUnitIds).toContain('ally2');
      expect(res.targetUnitIds).not.toContain('enemy');
    }

    const knightCu = state.units.get('knight')!;
    const ally1Cu = state.units.get('ally1')!;
    const ally2Cu = state.units.get('ally2')!;
    const enemyCu = state.units.get('enemy')!;

    expect(knightCu.activeModifiers.some((m) => m.stat === 'move' && m.value === 2)).toBe(true);
    expect(ally1Cu.activeModifiers.some((m) => m.stat === 'move' && m.value === 2)).toBe(true);
    expect(ally2Cu.activeModifiers.some((m) => m.stat === 'speed' && m.value === 2)).toBe(true);
    expect(enemyCu.activeModifiers).toHaveLength(0);
  });

  it('primes Spell Sculpt and enhances subsequent Mage ability range and AoE', () => {
    const arena = createRadialArena(5);
    const sorcerer = createRecruit('sorcerer', 'Sorcerer', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

    // Sorcerer at (0, 0), enemy at (4, 0). Normal SPARK range is 3!
    arena.setUnitPosition('sorcerer', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 4, r: 0 });

    const state = createCombatState(arena, [sorcerer, enemy], 'sorcerer');
    const sorcCu = state.units.get('sorcerer')!;
    sorcCu.currentAp = 3;

    const spellSculpt: Ability = {
      id: 'spell_sculpt',
      name: 'Spell Sculpt',
      description: 'Primes next spell with +1 Range & +1 AoE',
      archetypeTag: 'MAGE',
      targetType: 'SELF',
      defenseTarget: 'NONE',
      range: 0,
      apCost: 1,
      damageType: 'NONE',
      oncePerTurn: true,
      effects: [
        {
          type: 'SPELL_SCULPT',
          magnitude: 1
        }
      ]
    };

    // Before Spell Sculpt, Spark cannot reach distance 4
    const preCheck = canExecuteAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' });
    expect(preCheck.valid).toBe(false);

    // Cast Spell Sculpt
    executeAbility(state, 'sorcerer', spellSculpt, {}, new MockDiceRoller());
    expect(sorcCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(true);
    expect(sorcCu.abilityModifiers.find((m) => m.id === 'spell_sculpt')?.deltas?.range).toBe(1);

    // Now Spark can reach distance 4!
    const postCheck = canExecuteAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' });
    expect(postCheck.valid).toBe(true);

    // Execute Spark at range 4
    const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
    const res = executeAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' }, dice);
    expect(res.type).toBe('ATTACK');

    // Ephemeral modifier is consumed on use
    expect(sorcCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(false);

    // Next Spark cannot reach distance 4 anymore
    sorcCu.currentAp = 2;
    const secondCheck = canExecuteAbility(state, 'sorcerer', SPARK, { targetUnitId: 'enemy' });
    expect(secondCheck.valid).toBe(false);
  });

  it('Task 2.7: Spell Sculpt enhances non-damaging utility/buff Mage spells', () => {
    const arena = createRadialArena(5);
    const sorcerer = createRecruit('sorcerer', 'Sorcerer', { faction: 'PLAYER' });
    const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });
    arena.setUnitPosition('sorcerer', { q: 0, r: 0 });
    arena.setUnitPosition('ally', { q: 4, r: 0 });

    const state = createCombatState(arena, [sorcerer, ally], 'sorcerer');
    const sorcCu = state.units.get('sorcerer')!;
    sorcCu.currentAp = 3;

    // Mage buff spell with range 3 and damageType: 'NONE'
    const mageBuff: Ability = {
      id: 'arcane_barrier',
      name: 'Arcane Barrier',
      description: 'Grants +2 Ward to an ally within 3 hexes',
      archetypeTag: 'MAGE',
      targetType: 'ALLY',
      defenseTarget: 'NONE',
      range: 3,
      apCost: 1,
      damageType: 'NONE',
      effects: [
        {
          type: 'WARD_BUFF',
          magnitude: 2,
          durationTurns: 2
        }
      ]
    };

    // Range 3 cannot reach ally at distance 4
    expect(canExecuteAbility(state, 'sorcerer', mageBuff, { targetUnitId: 'ally' }).valid).toBe(false);

    // Prime Spell Sculpt
    executeAbility(state, 'sorcerer', SPELL_SCULPT, {}, new MockDiceRoller());
    expect(sorcCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(true);

    // Now Arcane Barrier has effective range 4 and can target ally!
    expect(canExecuteAbility(state, 'sorcerer', mageBuff, { targetUnitId: 'ally' }).valid).toBe(true);

    // Execute Arcane Barrier at range 4
    const res = executeAbility(state, 'sorcerer', mageBuff, { targetUnitId: 'ally' });
    expect(res.type).toBe('SUPPORT');
    expect(sorcCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(false);
  });

  it('Task 2.7: Sculpted Gust affects multiple hostile units in AoE and triggers collision damage on obstacle impact', () => {
    // Radius 2 arena: outer perimeter hexes are adjacent to the map boundary (Void)
    const arena = createRadialArena(2);
    const rawSorcerer = createRecruit('sorcerer', 'Sorcerer', { faction: 'PLAYER' });
    const sorcerer: Unit = {
      ...rawSorcerer,
      baseAttributes: { force: 0, finesse: 0, focus: 3 }
    };
    const enemy1 = createRecruit('enemy1', 'Enemy 1', { faction: 'ENEMY' });
    const enemy2 = createRecruit('enemy2', 'Enemy 2', { faction: 'ENEMY' });

    // Sorcerer at (0, 0).
    // Enemy 1 at (2, 0) (distance 2, on outer perimeter).
    // Enemy 2 at (1, 1) (distance 2, on outer perimeter).
    // Hex distance between (2, 0) and (1, 1) is 1, so both are within 1-hex AoE!
    arena.setUnitPosition('sorcerer', { q: 0, r: 0 });
    arena.setUnitPosition('enemy1', { q: 2, r: 0 });
    arena.setUnitPosition('enemy2', { q: 1, r: 1 });

    const state = createCombatState(arena, [sorcerer, enemy1, enemy2], 'sorcerer');
    const sorcCu = state.units.get('sorcerer')!;
    sorcCu.currentAp = 3;

    // 1. Prime Spell Sculpt (+1 Range, +1 AoE)
    executeAbility(state, 'sorcerer', SPELL_SCULPT, {}, new MockDiceRoller());
    expect(sorcCu.abilityModifiers.some((m) => m.id === 'spell_sculpt')).toBe(true);

    // 2. Cast Gust targeting enemy1 at (2, 0)
    // Sculpted Gust has range 4 and aoeRadius 1, encompassing both enemy1 and enemy2
    const res = executeAbility(state, 'sorcerer', GUST, { targetUnitId: 'enemy1' });
    expect(res.type).toBe('SUPPORT');
    if (res.type === 'SUPPORT') {
      expect(res.targetUnitIds).toContain('enemy1');
      expect(res.targetUnitIds).toContain('enemy2');

      // Both enemies slammed into the map boundary (Void)
      const enemy1Collision = res.events.find(
        (e) => e.type === 'DAMAGE' && e.targetUnitId === 'enemy1' && (e as any).reason === 'COLLISION'
      );
      const enemy2Collision = res.events.find(
        (e) => e.type === 'DAMAGE' && e.targetUnitId === 'enemy2' && (e as any).reason === 'COLLISION'
      );
      expect(enemy1Collision).toBeDefined();
      expect(enemy2Collision).toBeDefined();

      // Collision damage scaled with Focus (1 base + 3 focus - 0 armor = 4 damage)
      expect((enemy1Collision as any).amount).toBeGreaterThanOrEqual(2);
      expect((enemy2Collision as any).amount).toBeGreaterThanOrEqual(2);
    }

    // Both enemies remained at their perimeter hexes due to map boundary collision
    expect(arena.getUnitPosition('enemy1')).toEqual({ q: 2, r: 0 });
    expect(arena.getUnitPosition('enemy2')).toEqual({ q: 1, r: 1 });
  });

  it('enforces oncePerTurn constraint on abilities', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const heroCu = state.units.get('hero')!;
    heroCu.currentAp = 3;

    const onceAbility: Ability = {
      id: 'stance_ability',
      name: 'Stance Ability',
      description: 'Can only be used once per turn',
      archetypeTag: 'FIGHTER',
      targetType: 'SELF',
      defenseTarget: 'NONE',
      range: 0,
      apCost: 1,
      damageType: 'NONE',
      oncePerTurn: true,
      effects: []
    };

    expect(canExecuteAbility(state, 'hero', onceAbility).valid).toBe(true);
    executeAbility(state, 'hero', onceAbility);

    const secondTry = canExecuteAbility(state, 'hero', onceAbility);
    expect(secondTry.valid).toBe(false);
    if (!secondTry.valid) {
      expect(secondTry.reason).toContain('once per turn');
    }

    // Ending the turn and advancing to next turn should lift the restriction
    endActiveTurn(state);
    expect(state.activeUnitId).toBe('hero');
    expect(heroCu.abilitiesUsedThisTurn).toBeUndefined();
    expect(canExecuteAbility(state, 'hero', onceAbility).valid).toBe(true);

    // Test Spell Sculpt specifically
    expect(canExecuteAbility(state, 'hero', SPELL_SCULPT).valid).toBe(true);
    executeAbility(state, 'hero', SPELL_SCULPT);
    expect(canExecuteAbility(state, 'hero', SPELL_SCULPT).valid).toBe(false);

    endActiveTurn(state);
    expect(canExecuteAbility(state, 'hero', SPELL_SCULPT).valid).toBe(true);
  });

  it('keeps STEALTH active into the next turn after ending turn, granting Advantage on next turn attack', () => {
    const arena = createRadialArena(3);
    const infiltrator = createRecruit('infiltrator', 'Infiltrator', { faction: 'PLAYER' });
    const enemy = createRecruit('enemy', 'Goblin', { faction: 'ENEMY' });
    arena.setUnitPosition('infiltrator', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createCombatState(arena, [infiltrator, enemy], 'infiltrator');
    const infCu = state.units.get('infiltrator')!;
    const enemyCu = state.units.get('enemy')!;

    // Turn 1: Infiltrator casts Smoke Veil
    executeAbility(state, 'infiltrator', SMOKE_VEIL);
    expect(infCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(true);

    // End Turn 1 (Infiltrator ends turn, passes to Enemy)
    enemyCu.initiativeGauge = 100;
    infCu.initiativeGauge = 0;
    endActiveTurn(state, 0);

    expect(state.activeUnitId).toBe('enemy');
    // Enemy cannot target stealthed infiltrator directly
    const enemyAttack: Ability = {
      id: 'slash',
      name: 'Slash',
      description: 'Melee attack',
      archetypeTag: 'FIGHTER',
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      range: 1,
      apCost: 1,
      damageType: 'PHYSICAL',
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
        }
      ]
    };
    expect(canExecuteAbility(state, 'enemy', enemyAttack, { targetUnitId: 'infiltrator' }).valid).toBe(false);

    // Enemy ends turn, passes back to Infiltrator for Turn 2
    infCu.initiativeGauge = 100;
    enemyCu.initiativeGauge = 0;
    endActiveTurn(state, 0);

    expect(state.activeUnitId).toBe('infiltrator');
    // Infiltrator STILL has STEALTH active on Turn 2!
    const stealthCondition = infCu.activeConditions.find((c) => c.type === 'STEALTH');
    expect(stealthCondition).toBeDefined();
    expect(stealthCondition?.durationTurns).toBe(1);

    // Attacking an enemy breaks stealth and consumes it
    executeAbility(state, 'infiltrator', enemyAttack, { targetUnitId: 'enemy' });
    expect(infCu.activeConditions.some((c) => c.type === 'STEALTH')).toBe(false);
  });
});
