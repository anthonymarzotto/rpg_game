import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState } from './resolver';
import { canMove, canExecuteAbility, getAbilityRangeCoords, getAbilityCastLockoutReason } from './validator';
import { applyConditionToUnit } from './effects/conditionHandler';
import { Ability } from '../types/ability';
import { CHALLENGING_SHOUT } from '../../data/packages/knight';

const STRIKE: Ability = {
  id: 'strike',
  name: 'Strike',
  description: 'A basic physical strike.',
  apCost: 1,
  range: 1,
  targetType: 'SINGLE_TARGET',
  damageType: 'PHYSICAL',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'finesse',
  effects: [
    {
      type: 'DAMAGE',
      damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
    }
  ],
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
  attackModifierAttribute: 'focus',
  effects: [],
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
  attackModifierAttribute: 'focus',
  effects: [],
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

    it('rejects targeting a friendly ally with non-damaging single-target ability (Challenging Shout - B.12)', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const ally = createRecruit('ally', 'Ally', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 0, r: 1 });
      const state = createCombatState(arena, [hero, ally, enemy], 'hero');

      const allyResult = canExecuteAbility(state, 'hero', CHALLENGING_SHOUT, {
        coord: { q: 1, r: 0 },
        targetUnitId: 'ally'
      });
      expect(allyResult.valid).toBe(false);
      if (!allyResult.valid) {
        expect(allyResult.reason).toContain('Cannot attack a friendly unit');
      }

      const enemyResult = canExecuteAbility(state, 'hero', CHALLENGING_SHOUT, {
        coord: { q: 0, r: 1 },
        targetUnitId: 'enemy'
      });
      expect(enemyResult.valid).toBe(true);
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
        expect(result.reason).toContain('screened by Intervening at (1, 0)');
      }
    });

    it('allows ranged execution when an intervening unit has STEALTH (stealth bypasses unit screening)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const intervening = createRecruit('intervening', 'Intervening', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('intervening', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, intervening, enemy], 'hero');
      state.units.get('intervening')!.activeConditions = [
        { type: 'STEALTH', durationTurns: 1, sourceUnitId: 'intervening' }
      ];

      const RANGED_ATTACK: Ability = {
        ...STRIKE,
        range: 3
      };

      const result = canExecuteAbility(state, 'hero', RANGED_ATTACK, {
        coord: { q: 2, r: 0 },
        targetUnitId: 'enemy'
      });
      expect(result.valid).toBe(true);
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

    it('rejects single-target ability against a unit with STEALTH', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const rogue = createRecruit('rogue', 'Rogue', { faction: 'ENEMY' });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('rogue', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, rogue], 'hero');
      state.units.get('rogue')!.activeConditions.push({
        type: 'STEALTH',
        durationTurns: 1,
        sourceUnitId: 'rogue'
      });

      const result = canExecuteAbility(state, 'hero', STRIKE, {
        targetUnitId: 'rogue'
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Cannot target a stealthed unit');
      }
    });

    it('permits melee attack across 1-level elevation difference (|dh| <= 1)', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const result = canExecuteAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' });
      expect(result.valid).toBe(true);
    });

    it('rejects melee attack across 2-level elevation difference (|dh| >= 2) as out of reach', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });
      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, enemy], 'hero');
      const result = canExecuteAbility(state, 'hero', STRIKE, { targetUnitId: 'enemy' });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Target is vertically out of reach');
      }
    });

    it('extends effective range for ranged attack fired from high ground (+1 range per positive elevation delta)', () => {
      const arena = createRadialArena(4);
      const hero = createRecruit('hero', 'Hero', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });

      // Range 2 ability (HEAL_ALLY or custom ranged attack)
      const RANGED_DART: Ability = {
        ...STRIKE,
        id: 'ranged_dart',
        range: 2
      };

      // Hero at (0, 0) on plateau (h=2), enemy at (4, 0) in valley (h=0) - distance is 4 hexes
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 1, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 3, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 4, r: 0 }, elevation: 0, isWalkable: true });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 4, r: 0 });

      const state = createCombatState(arena, [hero, enemy], 'hero');

      // Base range 2 + elevation delta (2 - 0 = 2) = effective range 4!
      const highGroundResult = canExecuteAbility(state, 'hero', RANGED_DART, { targetUnitId: 'enemy' });
      expect(highGroundResult.valid).toBe(true);

      // Now flatten hero elevation to 0: distance 4 > range 2, so it should be rejected!
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      const flatGroundResult = canExecuteAbility(state, 'hero', RANGED_DART, { targetUnitId: 'enemy' });
      expect(flatGroundResult.valid).toBe(false);
      if (!flatGroundResult.valid) {
        expect(flatGroundResult.reason).toContain('Target out of range');
      }
    });
    it('validates damaging HEX AoE ability on both occupied and unoccupied hexes within range', () => {
      const arena = createRadialArena(4);
      const wizard = createRecruit('wizard', 'Wizard', { faction: 'PLAYER' });
      const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
      arena.setUnitPosition('wizard', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });
      const state = createCombatState(arena, [wizard, enemy], 'wizard');

      const HEX_BLAST: Ability = {
        id: 'hex_blast',
        name: 'Hex Blast',
        description: 'Blast',
        apCost: 1,
        range: 3,
        aoeRadius: 1,
        targetType: 'HEX',
        damageType: 'MAGICAL',
        defenseTarget: 'RESOLVE',
        effects: [{ type: 'DAMAGE', damageProfile: { count: 1, sides: 4, modifierAttribute: 'focus' } }]
      };

      // Occupied hex (enemy at 2, 0)
      expect(canExecuteAbility(state, 'wizard', HEX_BLAST, { coord: { q: 2, r: 0 } }).valid).toBe(true);

      // Unoccupied hex (ground at 2, -1)
      expect(canExecuteAbility(state, 'wizard', HEX_BLAST, { coord: { q: 2, r: -1 } }).valid).toBe(true);

      // Out of range (at 4, 0)
      expect(canExecuteAbility(state, 'wizard', HEX_BLAST, { coord: { q: 4, r: 0 } }).valid).toBe(false);

      // LoS blocked by high hill at (1, 0)
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 3, isWalkable: true });
      const losResult = canExecuteAbility(state, 'wizard', HEX_BLAST, { coord: { q: 2, r: 0 } });
      expect(losResult.valid).toBe(false);
      if (!losResult.valid) {
        expect(losResult.reason).toContain('Line-of-Sight is blocked');
      }
    });

    it('clamps effective maximum range to 1 hex when actor is afflicted with BLINDED', () => {
      const arena = createRadialArena(4);
      const archer = createRecruit('archer', 'Archer', { faction: 'PLAYER' });
      const nearEnemy = createRecruit('near', 'Near Enemy', { faction: 'ENEMY' });
      const farEnemy = createRecruit('far', 'Far Enemy', { faction: 'ENEMY' });

      arena.setUnitPosition('archer', { q: 0, r: 0 });
      arena.setUnitPosition('near', { q: 1, r: 0 });
      arena.setUnitPosition('far', { q: 0, r: 2 });

      const state = createCombatState(arena, [archer, nearEnemy, farEnemy], 'archer');
      const archerCu = state.units.get('archer')!;

      const RANGED_SHOT: Ability = {
        ...STRIKE,
        id: 'ranged_shot',
        range: 3
      };

      // Unblinded: can target both distance 1 and distance 2
      expect(canExecuteAbility(state, 'archer', RANGED_SHOT, { targetUnitId: 'far' }).valid).toBe(true);

      // Apply BLINDED: max range clamped to 1
      applyConditionToUnit(archerCu, 'BLINDED', 1, 'phil');

      expect(canExecuteAbility(state, 'archer', RANGED_SHOT, { targetUnitId: 'near' }).valid).toBe(true);
      const farCheck = canExecuteAbility(state, 'archer', RANGED_SHOT, { targetUnitId: 'far' });
      expect(farCheck.valid).toBe(false);
      if (!farCheck.valid) {
        expect(farCheck.reason).toContain('out of range');
      }

      const rangeCoords = getAbilityRangeCoords(arena, { q: 0, r: 0 }, RANGED_SHOT, archerCu, state);
      expect(rangeCoords.some((c) => c.q === 0 && c.r === 2)).toBe(false);
      expect(rangeCoords.some((c) => c.q === 1 && c.r === 0)).toBe(true);
    });

    it('enforces maxActivePerSource (strict single-vessel lockout), clears on vessel defeat, and enforces blockedByTargetConditions (MORTAL_EBB)', () => {
      const arena = createRadialArena(3);
      const theurge = createRecruit('theurge', 'Theurge', { faction: 'PLAYER' });
      const allyA = createRecruit('allyA', 'Ally A', { faction: 'PLAYER' });
      const allyB = createRecruit('allyB', 'Ally B', { faction: 'PLAYER' });

      arena.setUnitPosition('theurge', { q: 0, r: 0 });
      arena.setUnitPosition('allyA', { q: 1, r: 0 });
      arena.setUnitPosition('allyB', { q: 0, r: 1 });

      const state = createCombatState(arena, [theurge, allyA, allyB], 'theurge');
      const theurgeCu = state.units.get('theurge')!;
      const allyACu = state.units.get('allyA')!;

      const HENOSIS_ABILITY: Ability = {
        id: 'henosis',
        name: 'Henosis',
        description: 'Channel divine union.',
        archetypeTag: 'MAGE',
        apCost: 2,
        range: 3,
        targetType: 'ALLY',
        defenseTarget: 'NONE',
        damageType: 'NONE',
        effects: [
          {
            type: 'CONDITION',
            conditionType: 'HENOSIS',
            durationTurns: 2
          }
        ]
      };

      // Initially valid on self, allyA, and allyB
      expect(canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'theurge' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'allyA' }).valid).toBe(true);

      // Apply HENOSIS from theurge to allyA -> maxActivePerSource: 1 locks out Henosis
      applyConditionToUnit(allyACu, 'HENOSIS', 2, 'theurge');
      const lockedCheck = canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'allyB' });
      expect(lockedCheck.valid).toBe(false);
      if (!lockedCheck.valid) {
        expect(lockedCheck.reason).toContain('already active');
      }
      expect(getAbilityRangeCoords(arena, { q: 0, r: 0 }, HENOSIS_ABILITY, theurgeCu, state)).toHaveLength(0);

      // When allyA is defeated, lockout clears immediately
      allyACu.isDefeated = true;
      allyACu.currentHp = 0;
      arena.removeUnit('allyA');
      expect(canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'allyB' }).valid).toBe(true);

      // Revive allyA with MORTAL_EBB instead of HENOSIS: allyA is blocked by MORTAL_EBB, while allyB and self are valid
      allyACu.isDefeated = false;
      allyACu.currentHp = 10;
      allyACu.activeConditions = [];
      arena.setUnitPosition('allyA', { q: 1, r: 0 });
      applyConditionToUnit(allyACu, 'MORTAL_EBB', 1, 'theurge');

      const ebbBlocked = canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'allyA' });
      expect(ebbBlocked.valid).toBe(false);
      if (!ebbBlocked.valid) {
        expect(ebbBlocked.reason).toContain('MORTAL_EBB');
      }
      expect(canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'allyB' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'theurge' }).valid).toBe(true);
    });

    it('keeps Henosis locked out for its caster when the active vessel is CHARMED and reports lockout reasons via getAbilityCastLockoutReason', () => {
      const arena = createRadialArena(3);
      const theurge = createRecruit('theurge', 'Iamblichus', { faction: 'PLAYER' });
      const allyA = createRecruit('allyA', 'Alden', { faction: 'PLAYER' });
      const allyB = createRecruit('allyB', 'Lyra', { faction: 'PLAYER' });
      const enemyPhil = createRecruit('enemyPhil', 'Philanderer', { faction: 'ENEMY' });
      arena.setUnitPosition('theurge', { q: 0, r: 0 });
      arena.setUnitPosition('allyA', { q: 1, r: 0 });
      arena.setUnitPosition('allyB', { q: 0, r: 1 });
      arena.setUnitPosition('enemyPhil', { q: 2, r: 0 });

      const state = createCombatState(arena, [theurge, allyA, allyB, enemyPhil], 'theurge');
      const theurgeCu = state.units.get('theurge')!;
      const allyACu = state.units.get('allyA')!;
      theurgeCu.currentAp = 3;

      const HENOSIS_ABILITY: Ability = {
        id: 'henosis',
        name: 'Henosis',
        description: 'Divine vessel ascension.',
        archetypeTag: 'MAGE',
        apCost: 2,
        range: 3,
        targetType: 'ALLY',
        defenseTarget: 'NONE',
        damageType: 'NONE',
        effects: [
          {
            type: 'CONDITION',
            conditionType: 'HENOSIS',
            durationTurns: 2,
            applyOn: 'ALWAYS'
          }
        ]
      };

      const ONCE_PER_TURN_ABILITY: Ability = {
        id: 'spell_sculpt',
        name: 'Spell Sculpt',
        description: 'Once per turn primer.',
        archetypeTag: 'MAGE',
        apCost: 1,
        range: 0,
        targetType: 'SELF',
        defenseTarget: 'NONE',
        damageType: 'NONE',
        oncePerTurn: true,
        effects: []
      };

      // Castable initially
      expect(getAbilityCastLockoutReason(state, theurgeCu, HENOSIS_ABILITY)).toBeUndefined();
      expect(getAbilityCastLockoutReason(state, theurgeCu, ONCE_PER_TURN_ABILITY)).toBeUndefined();

      // Apply HENOSIS to allyA -> locked out naming Alden
      applyConditionToUnit(allyACu, 'HENOSIS', 2, 'theurge');
      expect(getAbilityCastLockoutReason(state, theurgeCu, HENOSIS_ABILITY)).toBe('Henosis is already active on Alden.');

      // Enemy charms Alden (flips active faction to ENEMY) -> Henosis MUST remain locked out for theurge
      applyConditionToUnit(allyACu, 'CHARMED', 1, 'enemyPhil', undefined, 'ENEMY');
      expect(allyACu.faction).toBe('ENEMY');
      const charmedLocked = canExecuteAbility(state, 'theurge', HENOSIS_ABILITY, { targetUnitId: 'allyB' });
      expect(charmedLocked.valid).toBe(false);
      if (!charmedLocked.valid) {
        expect(charmedLocked.reason).toBe('Henosis is already active on Alden.');
      }
      expect(getAbilityCastLockoutReason(state, theurgeCu, HENOSIS_ABILITY)).toBe('Henosis is already active on Alden.');

      // Once-per-turn lockout
      theurgeCu.abilitiesUsedThisTurn = ['spell_sculpt'];
      expect(getAbilityCastLockoutReason(state, theurgeCu, ONCE_PER_TURN_ABILITY)).toBe(
        'Spell Sculpt can only be used once per turn.'
      );

      // Insufficient AP reason when no other lockout applies
      allyACu.activeConditions = [];
      theurgeCu.currentAp = 1;
      expect(getAbilityCastLockoutReason(state, theurgeCu, HENOSIS_ABILITY)).toBe('Requires 2 AP (have 1).');
    });
  });
});


