import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { defaultEffectRegistry } from './effects';
import { MockDiceRoller } from './dice';
import { STRIKE, SHIELD_BASH, SKIRMISH } from '../../data/abilities';

describe('Displacement, Knockback & Secondary Effect Pipeline', () => {
  describe('Knockback & Wall-Slam Damage', () => {
    it('displaces target 1 hex on clear hit', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('goblin', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Roll 15 (Hit)
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'goblin' }, dice);

      // Goblin knocked from (1, 0) to (2, 0)
      expect(arena.getUnitPosition('goblin')).toEqual({ q: 2, r: 0 });
      expect(state.combatLog[0].message).toContain('Knockback: Pushed to (2, 0)');
    });

    it('triggers wall-slam collision damage when knocked into map border', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Alden');
      const goblin = createRecruit('goblin', 'Goblin');

      // Goblin is on outer perimeter of radius 2
      arena.setUnitPosition('hero', { q: 1, r: 0 });
      arena.setUnitPosition('goblin', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, goblin], 'hero');

      // Hit roll. Base bash deals 3 damage. Collision deals 1 + Force(0) = 1 damage.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      const result = executeAbility(
        state,
        'hero',
        SHIELD_BASH,
        { targetUnitId: 'goblin' },
        dice
      );

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.knockbackResult?.isCollided).toBe(true);
        expect(result.details.wallSlamDamage).toBe(1);
      }

      const goblinCu = state.units.get('goblin')!;
      // Total HP lost = 3 (bash) + 1 (slam) = 4
      expect(goblinCu.currentHp).toBe(goblin.effectiveVitals.maxHp - 4);
      // Goblin remained at (2, 0)
      expect(arena.getUnitPosition('goblin')).toEqual({ q: 2, r: 0 });
      expect(state.combatLog[0].message).toContain('Knockback Collision: Slammed into Map Boundary');
    });

    it('logs bystander collision and damages both units when knocked into another unit', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const dummyA = createRecruit('dummyA', 'Dummy A');
      const dummyB = createRecruit('dummyB', 'Dummy B');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('dummyA', { q: 1, r: 0 });
      arena.setUnitPosition('dummyB', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, dummyA, dummyB], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'dummyA' }, dice);

      expect(state.combatLog[0].message).toContain('Knockback Collision: Slammed into Dummy B');
      expect(state.combatLog[0].message).toContain('Dummy B took +1 collateral damage');
    });
  });

  describe('Extensible Effect Pipeline & Atomic Combat Events', () => {
    it('emits typed DAMAGE and DISPLACEMENT events on Knockback with collision', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const dummyA = createRecruit('dummyA', 'Dummy A');
      const dummyB = createRecruit('dummyB', 'Dummy B');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('dummyA', { q: 1, r: 0 });
      arena.setUnitPosition('dummyB', { q: 2, r: 0 });

      const state = createCombatState(arena, [hero, dummyA, dummyB], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });

      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'dummyA' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.events).toHaveLength(4);

        const [primaryDmg, collision, wallSlamDmg, collateralDmg] = result.details.events;
        expect(primaryDmg).toEqual({
          type: 'DAMAGE',
          targetUnitId: 'dummyA',
          amount: 3,
          damageType: 'PHYSICAL',
          reason: 'ATTACK',
          sourceUnitId: 'hero',
          isCrit: false
        });
        expect(collision).toEqual({
          type: 'COLLISION',
          unitId: 'dummyA',
          collisionType: 'UNIT',
          collidingUnitId: 'dummyB'
        });
        expect(wallSlamDmg).toEqual({
          type: 'DAMAGE',
          targetUnitId: 'dummyA',
          amount: 1,
          damageType: 'PHYSICAL',
          reason: 'COLLISION',
          sourceUnitId: 'hero'
        });
        expect(collateralDmg).toEqual({
          type: 'DAMAGE',
          targetUnitId: 'dummyB',
          amount: 1,
          damageType: 'PHYSICAL',
          reason: 'COLLATERAL',
          sourceUnitId: 'hero'
        });
      }
    });

    it('emits DISPLACEMENT event on retreat step (Skirmish)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const dummy = createRecruit('dummy', 'Dummy');

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('dummy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, dummy], 'hero');
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });

      const result = executeAbility(state, 'hero', SKIRMISH, { targetUnitId: 'dummy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        const displacementEvent = result.details.events.find((e) => e.type === 'DISPLACEMENT');
        expect(displacementEvent).toEqual({
          type: 'DISPLACEMENT',
          unitId: 'hero',
          fromCoord: { q: 0, r: 0 },
          toCoord: { q: -1, r: 0 },
          kind: 'RETREAT'
        });
        expect(arena.getUnitPosition('hero')).toEqual({ q: -1, r: 0 });
      }
    });

    it('allows dynamic registration of custom effect handlers without modifying resolver', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      arena.setUnitPosition('hero', { q: 0, r: 0 });

      const state = createCombatState(arena, [hero], 'hero');

      defaultEffectRegistry.register('CRIT_BOOST', {
        apply: (_effect, ctx) => ({
          events: [
            {
              type: 'STATUS_APPLIED',
              targetUnitId: ctx.actorCu.unit.id,
              modifier: { stat: 'speed', value: 5, durationTurns: 1 }
            }
          ],
          logDetail: ' ⚡ [Custom Speed Surge!]'
        })
      });

      const customAbility = {
        ...STRIKE,
        id: 'surge_strike',
        name: 'Surge Strike',
        effect: { type: 'CRIT_BOOST' as const, magnitude: 1 }
      };

      const dummy = createRecruit('dummy', 'Dummy');
      arena.setUnitPosition('dummy', { q: 1, r: 0 });
      state.units.set('dummy', {
        unit: dummy,
        currentHp: 20,
        currentAp: 0,
        initiativeGauge: 0,
        isDefeated: false,
        inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
        activeModifiers: [],
        abilities: [],
        passives: [],
        facing: 0
      });

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', customAbility, { targetUnitId: 'dummy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(state.combatLog[0].message).toContain('⚡ [Custom Speed Surge!]');
        expect(state.units.get('hero')!.activeModifiers).toContainEqual({
          stat: 'speed',
          value: 5,
          durationTurns: 1
        });
      }
    });
  });
});
