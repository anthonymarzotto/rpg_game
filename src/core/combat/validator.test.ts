import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState } from './resolver';
import { canMove, canExecuteAbility } from './validator';
import { Ability } from '../types/ability';

const STRIKE: Ability = {
  id: 'strike',
  name: 'Strike',
  description: 'A basic physical strike.',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  damageType: 'PHYSICAL',
  defenseTarget: 'EVASION',
  damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' },
  archetypeTag: 'FIGHTER'
};

const HEAL_ALLY: Ability = {
  id: 'heal_ally',
  name: 'Mend',
  description: 'A healing spell for allies.',
  apCost: 1,
  range: 2,
  targetType: 'ALLY',
  damageType: 'NONE',
  defenseTarget: 'RESOLVE',
  damageProfile: { count: 1, sides: 4, modifierAttribute: 'focus' },
  archetypeTag: 'MAGE'
};

const SELF_BUFF: Ability = {
  id: 'self_buff',
  name: 'Focus',
  description: 'Concentrate on self-enhancement.',
  apCost: 1,
  range: 0,
  targetType: 'SELF',
  damageType: 'NONE',
  defenseTarget: 'RESOLVE',
  damageProfile: { count: 1, sides: 4, modifierAttribute: 'focus' },
  archetypeTag: 'MAGE'
};

describe('Combat Validator', () => {
  describe('canMove', () => {
    it('permits movement to an adjacent valid tile when unit has AP and is active', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [hero], 'hero');

      const result = canMove(state, 'hero', { q: 1, r: 0 });
      expect(result.valid).toBe(true);
    });

    it('rejects movement if actor is not the active unit', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 1 });
      const state = createCombatState(arena, [hero, enemy], 'hero');

      const result = canMove(state, 'enemy', { q: 1, r: 0 });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('not currently active');
      }
    });

    it('rejects movement if unit has 0 AP', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [hero], 'hero');
      state.units.get('hero')!.currentAp = 0;

      const result = canMove(state, 'hero', { q: 1, r: 0 });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Insufficient AP');
      }
    });

    it('rejects movement if destination is out of movement reach', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [hero], 'hero');

      const result = canMove(state, 'hero', { q: 0, r: 3 });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('not reachable');
      }
    });

    it('rejects movement if unit is defeated', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [hero], 'hero');
      state.units.get('hero')!.isDefeated = true;

      const result = canMove(state, 'hero', { q: 1, r: 0 });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('defeated');
      }
    });
  });

  describe('canExecuteAbility', () => {
    it('permits valid single-target damaging attack against enemy in range with LoS', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });
      const state = createCombatState(arena, [hero, enemy], 'hero');

      const result = canExecuteAbility(state, 'hero', STRIKE, {
        coord: { q: 1, r: 0 },
        targetUnitId: 'enemy'
      });
      expect(result.valid).toBe(true);
    });

    it('rejects ability if actor has insufficient AP', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });
      const state = createCombatState(arena, [hero, enemy], 'hero');
      state.units.get('hero')!.currentAp = 0;

      const result = canExecuteAbility(state, 'hero', STRIKE, {
        coord: { q: 1, r: 0 },
        targetUnitId: 'enemy'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Insufficient AP');
      }
    });

    it('rejects attacking a friendly unit with damaging attack', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });
      const state = createCombatState(arena, [hero, ally], 'hero');

      const result = canExecuteAbility(state, 'hero', STRIKE, {
        coord: { q: 1, r: 0 },
        targetUnitId: 'ally'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Cannot attack a friendly unit');
      }
    });

    it('rejects targeting self with single-target damaging ability', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [hero], 'hero');

      const result = canExecuteAbility(state, 'hero', STRIKE, {
        coord: { q: 0, r: 0 },
        targetUnitId: 'hero'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Cannot target self');
      }
    });

    it('permits SELF target type unconditionally if active and has AP', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      const state = createCombatState(arena, [hero], 'hero');

      const result = canExecuteAbility(state, 'hero', SELF_BUFF);
      expect(result.valid).toBe(true);
    });

    it('rejects casting ally ability on an enemy', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });
      const state = createCombatState(arena, [hero, enemy], 'hero');

      const result = canExecuteAbility(state, 'hero', HEAL_ALLY, {
        coord: { q: 1, r: 0 },
        targetUnitId: 'enemy'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Cannot cast an ally ability on an enemy unit');
      }
    });

    it('rejects targeting enemy beyond range', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });
      const state = createCombatState(arena, [hero, enemy], 'hero');

      // STRIKE has range 1, enemy is at distance 2
      const result = canExecuteAbility(state, 'hero', STRIKE, {
        coord: { q: 2, r: 0 },
        targetUnitId: 'enemy'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Target out of range');
      }
    });

    it('rejects targeting enemy when Line of Sight is blocked by an intervening obstacle', () => {
      const arena = createRadialArena(3);
      // Place an elevation 2 wall obstacle between (0, 0) and (2, 0) at (1, 0)
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: false, label: 'WALL' });

      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });
      const state = createCombatState(arena, [hero, enemy], 'hero');

      const RANGED_ATTACK: Ability = {
        ...STRIKE,
        range: 3
      };

      const result = canExecuteAbility(state, 'hero', RANGED_ATTACK, {
        coord: { q: 2, r: 0 },
        targetUnitId: 'enemy'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Line-of-Sight is blocked');
      }
    });

    it('prevents ranged execution when an intervening unit blocks Line-of-Sight (unit screening)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const intervening = createRecruit('intervening', 'Intervening', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('intervening', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, intervening, enemy], 'hero');

      const RANGED_ATTACK: Ability = {
        ...STRIKE,
        range: 3
      };

      const result = canExecuteAbility(state, 'hero', RANGED_ATTACK, {
        coord: { q: 2, r: 0 },
        targetUnitId: 'enemy'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Line-of-Sight is blocked');
      }
    });

    it('enforces ALLY targeting: allows self, default self, and allies, while rejecting enemies', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 0, r: 1 });

      const state = createCombatState(arena, [hero, ally, enemy], 'hero');

      // Ally ability on self explicitly
      expect(canExecuteAbility(state, 'hero', HEAL_ALLY, { targetUnitId: 'hero' }).valid).toBe(true);

      // Ally ability on self default (omitted target)
      expect(canExecuteAbility(state, 'hero', HEAL_ALLY).valid).toBe(true);

      // Ally ability on Ally
      expect(canExecuteAbility(state, 'hero', HEAL_ALLY, { targetUnitId: 'ally' }).valid).toBe(true);

      // Ally ability on Enemy -> rejected
      const enemyTarget = canExecuteAbility(state, 'hero', HEAL_ALLY, { targetUnitId: 'enemy' });
      expect(enemyTarget.valid).toBe(false);
      if (!enemyTarget.valid) {
        expect(enemyTarget.reason).toContain('Cannot cast an ally ability on an enemy unit');
      }
    });
  });
});

