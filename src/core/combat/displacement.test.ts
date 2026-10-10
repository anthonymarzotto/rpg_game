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

    it('inflicts unmitigated fall impact damage when knockback plunges target down a ledge (delta h <= -2)', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const target = createRecruit('target', 'Target');

      // Hero and target on ridge (elevation 2), landing hex in valley (elevation 0)
      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, target], 'hero');
      const targetCu = state.units.get('target')!;
      // Give target 2 Armor to verify fall damage is unmitigated
      targetCu.activeModifiers.push({ stat: 'armor', value: 2, durationTurns: 2 });

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'target' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(arena.getUnitPosition('target')).toEqual({ q: 2, r: 0 });
        // Target took 3 - 2 = 1 attack damage, PLUS exactly 8 unmitigated fall damage (|-2| * 4)
        expect(result.details.fallDamage).toBe(8);
        const fallEvent = result.details.events.find((e) => e.type === 'DAMAGE' && (e as any).reason === 'FALL');
        expect(fallEvent).toBeDefined();
        expect((fallEvent as any).amount).toBe(8);

        // Armor soaked 2 attack damage (3 - 2 = 1), but zero of the 8 fall damage
        expect(targetCu.currentHp).toBe(target.effectiveVitals.maxHp - 1 - 8);
        expect(state.combatLog[0].message).toContain('Plunged from ledge: Took +8 Fall Impact Damage!');
      }
    });

    it('negates fall impact damage when target has immuneToFallDamage trait', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const acrobat = createRecruit('acrobat', 'Acrobat');

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 2, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: true });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('acrobat', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, acrobat], 'hero');
      const acrobatCu = state.units.get('acrobat')!;
      (acrobatCu as any).passives = [
        {
          id: 'feline_grace',
          name: 'Feline Grace',
          description: 'Immune to fall damage',
          hook: 'ALWAYS',
          immuneToFallDamage: true
        }
      ];

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'acrobat' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(arena.getUnitPosition('acrobat')).toEqual({ q: 2, r: 0 });
        // Fall damage was negated (0)
        expect(result.details.fallDamage).toBe(0);
        const fallEvent = result.details.events.find((e) => e.type === 'DAMAGE' && (e as any).reason === 'FALL');
        expect(fallEvent).toBeUndefined();
        // Only attack damage (3) applied
        expect(acrobatCu.currentHp).toBe(acrobat.effectiveVitals.maxHp - 3);
        expect(state.combatLog[0].message).toContain('Plunged from ledge: Fall Damage Negated!');
      }
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
        effects: [
          ...STRIKE.effects,
          { type: 'CRIT_BOOST' as const, magnitude: 1 }
        ]
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
        activeConditions: [],
        abilityModifiers: [],
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

    it('vaults onto cliff top instead of colliding when target has canVaultOnKnockback', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const acrobat = createRecruit('acrobat', 'Acrobat');

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('acrobat', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, acrobat], 'hero');
      const acrobatCu = state.units.get('acrobat')!;
      (acrobatCu as any).passives = [
        {
          id: 'feline_grace',
          name: 'Feline Grace',
          description: 'Rebounds onto cliff tops',
          hook: 'ALWAYS',
          canVaultOnKnockback: true,
          immuneToCollisionDamage: true
        }
      ];

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'acrobat' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(arena.getUnitPosition('acrobat')).toEqual({ q: 2, r: 0 });
        expect(result.details.wallSlamDamage).toBeUndefined();
        const collisionEvent = result.details.events.find((e) => e.type === 'COLLISION');
        expect(collisionEvent).toBeUndefined();
      }
    });

    it('vaults over 1-hex obstacle instead of colliding when target has canVaultOnKnockback', () => {
      const arena = createRadialArena(3);
      const hero = createRecruit('hero', 'Alden');
      const acrobat = createRecruit('acrobat', 'Acrobat');

      arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });
      arena.setTile({ coord: { q: 2, r: 0 }, elevation: 0, isWalkable: false, terrainType: 'OBSTACLE' });
      arena.setTile({ coord: { q: 3, r: 0 }, elevation: 0, isWalkable: true });

      arena.setUnitPosition('hero', { q: 0, r: 0 });
      arena.setUnitPosition('acrobat', { q: 1, r: 0 });

      const state = createCombatState(arena, [hero, acrobat], 'hero');
      const acrobatCu = state.units.get('acrobat')!;
      (acrobatCu as any).passives = [
        {
          id: 'feline_grace',
          name: 'Feline Grace',
          description: 'Vaults over obstacles',
          hook: 'ALWAYS',
          canVaultOnKnockback: true
        }
      ];

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'acrobat' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(arena.getUnitPosition('acrobat')).toEqual({ q: 3, r: 0 });
        expect(result.details.wallSlamDamage).toBeUndefined();
      }
    });

    it('negates collision damage when target has immuneToCollisionDamage and hits perimeter wall', () => {
      const arena = createRadialArena(2);
      const hero = createRecruit('hero', 'Alden');
      const acrobat = createRecruit('acrobat', 'Acrobat');

      arena.setUnitPosition('hero', { q: 1, r: 0 });
      arena.setUnitPosition('acrobat', { q: 2, r: 0 }); // Boundary edge

      const state = createCombatState(arena, [hero, acrobat], 'hero');
      const acrobatCu = state.units.get('acrobat')!;
      (acrobatCu as any).passives = [
        {
          id: 'feline_grace',
          name: 'Feline Grace',
          description: 'Immune to collision damage',
          hook: 'ALWAYS',
          immuneToCollisionDamage: true
        }
      ];

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hero', SHIELD_BASH, { targetUnitId: 'acrobat' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(arena.getUnitPosition('acrobat')).toEqual({ q: 2, r: 0 });
        expect(result.details.wallSlamDamage).toBe(0);
        const collisionDmgEvent = result.details.events.find(
          (e) => e.type === 'DAMAGE' && (e as any).reason === 'COLLISION'
        );
        expect(collisionDmgEvent).toBeUndefined();
        expect(state.combatLog[0].message).toContain('Collision Damage Negated');
      }
    });
  });
});
