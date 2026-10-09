import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { MockDiceRoller } from './dice';
import { STRIKE, SHIELD_BASH } from '../../data/abilities';
import { Ability } from '../types/ability';

describe('Phase 6.2 Elevation Combat Modifiers & Plunging Knockback Integration', () => {
  const RANGED_VOLLEY: Ability = {
    ...STRIKE,
    id: 'ranged_volley',
    name: 'Ranged Volley',
    range: 2,
    targetType: 'SINGLE_TARGET',
    damageType: 'PHYSICAL',
    effects: [
      {
        type: 'DAMAGE',
        damageProfile: { count: 1, sides: 6, modifierAttribute: 'finesse' }
      }
    ]
  };

  describe('Ranged Elevation Vantage', () => {
    it('extends effective range for ranged attacks by +1 hex per positive elevation difference', () => {
      const arena = createRadialArena(4);
      const sniper = createRecruit('sniper', 'Sniper');
      const grunt = createRecruit('grunt', 'Grunt', { faction: 'ENEMY' });

      // Sniper at elevation 3, Grunt at elevation 0 -> +3 range extension! Base 2 + 3 = 5 range!
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 3, isWalkable: true });
      arena.setTile({ coord: { q: 5, r: 0 }, elevation: 0, isWalkable: true });
      arena.setUnitPosition('sniper', { q: 0, r: 0 });
      arena.setUnitPosition('grunt', { q: 5, r: 0 });

      const state = createCombatState(arena, [sniper, grunt], 'sniper');

      // Distance is 5 hexes. Range 2 + 3 = 5 -> Valid!
      const canCast = canExecuteAbility(state, 'sniper', RANGED_VOLLEY, { targetUnitId: 'grunt' });
      expect(canCast.valid).toBe(true);
    });

    it('does not extend range when firing upward or across flat terrain', () => {
      const arena = createRadialArena(4);
      const sniper = createRecruit('sniper', 'Sniper');
      const grunt = createRecruit('grunt', 'Grunt', { faction: 'ENEMY' });

      // Sniper at 0, Grunt at 2, distance = 3
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 3, r: 0 }, elevation: 2, isWalkable: true });
      arena.setUnitPosition('sniper', { q: 0, r: 0 });
      arena.setUnitPosition('grunt', { q: 3, r: 0 });

      const state = createCombatState(arena, [sniper, grunt], 'sniper');

      // Base range 2, distance 3 -> Out of range!
      const canCast = canExecuteAbility(state, 'sniper', RANGED_VOLLEY, { targetUnitId: 'grunt' });
      expect(canCast.valid).toBe(false);
      if (!canCast.valid) {
        expect(canCast.reason).toContain('Target out of range');
      }
    });
  });

  describe('Vertical Attack Roll Modifiers', () => {
    it('applies +2 to attack roll for downward strike (dh = 1)', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 1, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      // d20 = 8, Finesse = 0. With +2 bonus: 10 vs Evasion 10 -> SOLID_HIT!
      const dice = new MockDiceRoller({ d20Rolls: [8], damageRolls: [3] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.modifier).toBe(2);
        expect(result.details.totalAttackScore).toBe(10);
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
      }
    });

    it('applies Advantage for downward strike across 2+ elevation levels (dh >= 2)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      // Advantage rolls [4, 16] -> takes 16!
      const dice = new MockDiceRoller({ d20Rolls: [4, 16], damageRolls: [5] });
      const result = executeAbility(state, 'hero', RANGED_VOLLEY, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(16);
      }
    });

    it('applies -2 to attack roll for upward strike (dh = -1)', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      // d20 = 10. With -2 penalty: 8 vs Evasion 10 -> GRAZE!
      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [4] });
      const result = executeAbility(state, 'hero', STRIKE, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.modifier).toBe(-2);
        expect(result.details.totalAttackScore).toBe(8);
        expect(result.details.hitOutcome).toBe('GRAZE');
      }
    });

    it('applies Disadvantage for upward strike across 2+ elevation levels (dh <= -2)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      // Disadvantage rolls [19, 7] -> takes 7!
      const dice = new MockDiceRoller({ d20Rolls: [19, 7], damageRolls: [3] });
      const result = executeAbility(state, 'hero', RANGED_VOLLEY, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.d20Roll).toBe(7);
      }
    });
  });

  describe('Melee Elevation Reach Constraints', () => {
    it('permits melee strikes across |dh| <= 1', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      expect(canExecuteAbility(state, 'hero', STRIKE, { targetUnitId: 'foe' }).valid).toBe(true);
    });

    it('rejects melee strikes across |dh| >= 2 as vertically out of reach', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      const res = canExecuteAbility(state, 'hero', STRIKE, { targetUnitId: 'foe' });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.reason).toContain('Target is vertically out of reach');
      }
    });
  });

  describe('Kinetic Plunging Knockback & Cliff-Slam', () => {
    it('halts and triggers Cliff collision when target is pushed into cliff face (dh >= 2)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true }); // Cliff face!

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.knockbackResult?.isCollided).toBe(true);
        expect(result.details.knockbackResult?.collisionType).toBe('CLIFF');
        expect(arena.getUnitPosition('foe')).toEqual({ q: 1, r: 0 });
        expect(state.combatLog[0].message).toContain('Knockback Collision: Slammed into Cliff!');
      }
    });

    it('ascends terrace cleanly without collision when pushed onto dh = 1', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 1, isWalkable: true }); // Step terrace

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.knockbackResult?.isCollided).toBe(false);
        expect(arena.getUnitPosition('foe')).toEqual({ q: 2, r: 0 });
        expect(result.details.fallDamage).toBeUndefined();
      }
    });

    it('inflicts unmitigated Fall Impact Damage when pushed off a 2-level cliff (dh <= -2)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true }); // 2-level drop!

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      const foeCu = state.units.get('foe')!;
      foeCu.activeModifiers.push({ stat: 'armor', value: 4, durationTurns: 1 }); // Heavy armor!

      // Base bash damage: 3. Armor soaks it completely (3 - 4 <= 0 -> min 1 dmg)
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(arena.getUnitPosition('foe')).toEqual({ q: 2, r: 0 });
        // Fall damage: |-2| * 4 = 8, strictly unmitigated by the 4 Armor
        expect(result.details.fallDamage).toBe(8);
        expect(foeCu.currentHp).toBe(foe.effectiveVitals.maxHp - 1 - 8);
        expect(state.combatLog[0].message).toContain('Plunged from ledge: Took +8 Fall Impact Damage!');
      }
    });

    it('inflicts 12 unmitigated Fall Impact Damage when pushed off a 3-level cliff (dh = -3)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero');
      const foe = createRecruit('foe', 'Foe', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 3, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 3, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true }); // 3-level drop!

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('foe', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, foe], 'hero');
      const foeCu = state.units.get('foe')!;

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [2] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'foe' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        // Fall damage: |-3| * 4 = 12 lethal damage defeats recruit (12 HP - 2 attack - 12 fall <= 0)
        expect(result.details.fallDamage).toBe(12);
        expect(foeCu.currentHp).toBe(0);
        expect(foeCu.isDefeated).toBe(true);
        expect(state.combatLog[0].message).toContain('Plunged from ledge: Took +12 Fall Impact Damage!');
      }
    });
  });
});
