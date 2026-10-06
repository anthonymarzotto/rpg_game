import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { MockDiceRoller } from './dice';
import {
  POINT_BLANK_BUCKSHOT,
  STAND_AND_DELIVER,
  GALLANT_FLOURISH,
  HIGHWAY_TOLL,
  HIGHWAYMAN_PACKAGE
} from '../../data/packages/highwayman';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { Unit } from '../types/unit';

const testLoadoutProviders: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

function createCustomUnit(
  id: string,
  name: string,
  options: {
    activeClassId?: string;
    wildcardAbilityIds?: string[];
    wildcardPassiveIds?: string[];
    baseAttributes?: { force: number; finesse: number; focus: number };
    maxHp?: number;
    armor?: number;
    evasion?: number;
  } = {}
): Unit {
  const recruit = createRecruit(id, name, {
    loadout: {
      activeClassId: options.activeClassId ?? 'novice',
      wildcardAbilityIds: options.wildcardAbilityIds ?? [],
      wildcardPassiveIds: options.wildcardPassiveIds ?? []
    }
  });
  if (options.baseAttributes) {
    (recruit as any).baseAttributes = { ...options.baseAttributes };
  }
  if (options.maxHp !== undefined || options.armor !== undefined || options.evasion !== undefined) {
    (recruit as any).effectiveVitals = {
      ...recruit.effectiveVitals,
      maxHp: options.maxHp ?? recruit.effectiveVitals.maxHp,
      armor: options.armor ?? recruit.effectiveVitals.armor,
      evasion: options.evasion ?? recruit.effectiveVitals.evasion
    };
  }
  return recruit;
}

describe('Tier 3 Highwayman Class Package Integration', () => {
  describe('Package Registration & Loadout Resolution', () => {
    it('registers HIGHWAYMAN_PACKAGE in catalog with SKIRMISHER AI profile', () => {
      const pkg = getClassPackage('highwayman');
      expect(pkg).toBe(HIGHWAYMAN_PACKAGE);
      expect(pkg?.className).toBe('Highwayman');
      expect(pkg?.aiProfile).toBe('SKIRMISHER');
      expect(pkg?.signatureAbility.id).toBe('point_blank_buckshot');
      expect(pkg?.domainAbilities.map((a) => a.id)).toEqual(['stand_and_deliver', 'gallant_flourish']);
      expect(pkg?.passive.id).toBe('highway_toll');
      expect(pkg?.passive).toBe(HIGHWAY_TOLL);

      expect(getAbilityById('point_blank_buckshot')).toBeDefined();
      expect(getAbilityById('stand_and_deliver')).toBeDefined();
      expect(getAbilityById('gallant_flourish')).toBeDefined();
      expect(getPassiveById('highway_toll')).toBeDefined();
    });

    it('resolves unit loadout when Highwayman is active class', () => {
      const unit = createCustomUnit('highwayman_hero', 'Swift Nick', {
        activeClassId: 'highwayman'
      });

      const resolved = resolveUnitLoadout(unit, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
        'point_blank_buckshot',
        'stand_and_deliver',
        'gallant_flourish'
      ]);
      expect(resolved.activePassives.map((p) => p.id)).toEqual(['highway_toll']);
    });

    it('allows Highwayman domain abilities and passive to be equipped as wildcards on another class', () => {
      const thief = createCustomUnit('thief_hero', 'Shadow', {
        activeClassId: 'thief',
        wildcardAbilityIds: ['stand_and_deliver', 'gallant_flourish'],
        wildcardPassiveIds: ['highway_toll']
      });

      const resolved = resolveUnitLoadout(thief, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('stand_and_deliver');
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('gallant_flourish');
      expect(resolved.activePassives.map((p) => p.id)).toContain('highway_toll');
    });
  });

  describe('Point-Blank Buckshot Execution', () => {
    it('validates execution at distance 1 and 2, but rejects at distance 3', () => {
      const arena = createRadialArena(4);
      const hwm = createCustomUnit('hwm', 'Highwayman', { activeClassId: 'highwayman' });
      const enemy1 = createCustomUnit('enemy1', 'Target 1');
      const enemy2 = createCustomUnit('enemy2', 'Target 2');
      const enemy3 = createCustomUnit('enemy3', 'Target 3');

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('enemy1', { q: 1, r: 0 }); // dist 1
      arena.setUnitPosition('enemy2', { q: 0, r: 2 }); // dist 2
      arena.setUnitPosition('enemy3', { q: 0, r: 3 }); // dist 3

      const state = createCombatState(arena, [hwm, enemy1, enemy2, enemy3], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      hwmCu.currentAp = 3;

      expect(canExecuteAbility(state, 'hwm', POINT_BLANK_BUCKSHOT, { targetUnitId: 'enemy1' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'hwm', POINT_BLANK_BUCKSHOT, { targetUnitId: 'enemy2' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'hwm', POINT_BLANK_BUCKSHOT, { targetUnitId: 'enemy3' }).valid).toBe(false);
    });

    it('executes buckshot dealing 1d8 + Finesse and knocking target back 1 hex', () => {
      const arena = createRadialArena(4);
      const hwm = createCustomUnit('hwm', 'Highwayman', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 0, finesse: 3, focus: 0 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { evasion: 10, armor: 0 });

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hwm, enemy], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      hwmCu.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [6] });
      const result = executeAbility(state, 'hwm', POINT_BLANK_BUCKSHOT, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        // 6 (rolled 1d8) + 3 (Finesse) - 0 (Armor) = 9
        expect(result.details.damageDealt).toBe(9);
      }

      // Check AP consumption
      expect(hwmCu.currentAp).toBe(1); // 3 - 2 = 1

      // Target should be knocked back 1 hex to (2, 0)
      const targetPos = arena.getUnitPosition('enemy');
      expect(targetPos).toEqual({ q: 2, r: 0 });
    });

    it('inflicts wall-slam collision damage when target collides with perimeter wall', () => {
      const arena = createRadialArena(2); // Radius 2 perimeter
      const hwm = createCustomUnit('hwm', 'Highwayman', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 0, finesse: 2, focus: 0 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { evasion: 10, armor: 0 });

      arena.setUnitPosition('hwm', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 }); // On the arena perimeter boundary

      const state = createCombatState(arena, [hwm, enemy], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      hwmCu.currentAp = 2;

      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [5] });
      const result = executeAbility(state, 'hwm', POINT_BLANK_BUCKSHOT, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.wallSlamDamage).toBeDefined();
        expect(result.details.wallSlamDamage).toBeGreaterThan(0);
        const collisionEvent = result.details.events.find((e) => e.type === 'COLLISION');
        expect(collisionEvent).toBeDefined();
      }
    });
  });

  describe('Stand and Deliver! Execution', () => {
    it('inflicts 30 CTB delay and -2 Armor debuff without requiring an attack roll', () => {
      const arena = createRadialArena(3);
      const hwm = createCustomUnit('hwm', 'Highwayman', { activeClassId: 'highwayman' });
      const knight = createCustomUnit('knight', 'Armored Knight', { armor: 2 });

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 2, r: 0 }); // Range 2

      const state = createCombatState(arena, [hwm, knight], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      const knightCu = state.units.get('knight')!;
      hwmCu.currentAp = 3;
      knightCu.initiativeGauge = 50;

      const result = executeAbility(state, 'hwm', STAND_AND_DELIVER, { targetUnitId: 'knight' });

      expect(result.type).toBe('BUFF');
      expect(hwmCu.currentAp).toBe(2); // 3 - 1 = 2

      // CTB delay check: 50 - 30 = 20
      expect(knightCu.initiativeGauge).toBe(20);

      // Armor modifier check: -2 Armor for 2 turns
      const armorMod = knightCu.activeModifiers.find((m) => m.stat === 'armor');
      expect(armorMod).toBeDefined();
      expect(armorMod?.value).toBe(-2);
      expect(armorMod?.durationTurns).toBe(2);
    });

    it('rejects execution when target is beyond range 2', () => {
      const arena = createRadialArena(4);
      const hwm = createCustomUnit('hwm', 'Highwayman', { activeClassId: 'highwayman' });
      const target = createCustomUnit('target', 'Distant Foe');

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 3, r: 0 });

      const state = createCombatState(arena, [hwm, target], 'hwm');
      const valid = canExecuteAbility(state, 'hwm', STAND_AND_DELIVER, { targetUnitId: 'target' });
      expect(valid.valid).toBe(false);
    });
  });

  describe('Gallant Flourish Execution', () => {
    it('deals 1d4 + Finesse melee damage and grants self +2 Evasion for 1 turn', () => {
      const arena = createRadialArena(3);
      const hwm = createCustomUnit('hwm', 'Highwayman', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 0, finesse: 2, focus: 0 }
      });
      const enemy = createCustomUnit('enemy', 'Foe', { evasion: 10, armor: 0 });

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 }); // Melee contact

      const state = createCombatState(arena, [hwm, enemy], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      hwmCu.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [3] });
      const result = executeAbility(state, 'hwm', GALLANT_FLOURISH, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        // 3 (rolled 1d4) + 2 (Finesse) = 5
        expect(result.details.damageDealt).toBe(5);
      }

      // Check self evasion buff
      const evasionMod = hwmCu.activeModifiers.find((m) => m.stat === 'evasion');
      expect(evasionMod).toBeDefined();
      expect(evasionMod?.value).toBe(2);
      expect(evasionMod?.durationTurns).toBe(1);
    });

    it('rejects execution when target is beyond melee range 1', () => {
      const arena = createRadialArena(3);
      const hwm = createCustomUnit('hwm', 'Highwayman', { activeClassId: 'highwayman' });
      const enemy = createCustomUnit('enemy', 'Foe');

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 }); // Distance 2

      const state = createCombatState(arena, [hwm, enemy], 'hwm');
      const valid = canExecuteAbility(state, 'hwm', GALLANT_FLOURISH, { targetUnitId: 'enemy' });
      expect(valid.valid).toBe(false);
    });
  });

  describe('Highway Toll Passive Trait', () => {
    it('adds +2 flat physical damage when target has effective Armor >= 1', () => {
      const arena = createRadialArena(3);
      const hwm = createCustomUnit('hwm', 'Highwayman', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 0, finesse: 2, focus: 0 }
      });
      const armoredEnemy = createCustomUnit('armoredEnemy', 'Knight', { evasion: 10, armor: 2 });

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('armoredEnemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hwm, armoredEnemy], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      hwmCu.currentAp = 3;

      // Gallant Flourish: 1d4(3) + 2 Finesse + 2 Highway Toll = 7 raw.
      // 2 Armor mitigation. Dealt: 7 - 2 = 5.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hwm', GALLANT_FLOURISH, { targetUnitId: 'armoredEnemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.rawDamage).toBe(7);
        expect(result.details.mitigation).toBe(2);
        expect(result.details.damageDealt).toBe(5);
        expect(result.details.damageBreakdown).toContain('+4'); // 2 attr + 2 flat bonus
      }
    });

    it('does not add damage bonus when target has 0 Armor', () => {
      const arena = createRadialArena(3);
      const hwm = createCustomUnit('hwm', 'Highwayman', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 0, finesse: 2, focus: 0 }
      });
      const unarmoredEnemy = createCustomUnit('unarmoredEnemy', 'Peasant', { evasion: 10, armor: 0 });

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('unarmoredEnemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [hwm, unarmoredEnemy], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      hwmCu.currentAp = 3;

      // Gallant Flourish: 1d4(3) + 2 Finesse = 5 raw.
      // 0 Armor mitigation. Dealt: 5.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      const result = executeAbility(state, 'hwm', GALLANT_FLOURISH, { targetUnitId: 'unarmoredEnemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.rawDamage).toBe(5);
        expect(result.details.damageDealt).toBe(5);
      }
    });
  });

  describe('Action Economy Rotation (Full 3-AP Turn)', () => {
    it('executes Stand and Deliver! (1 AP) followed by Point-Blank Buckshot (2 AP) seamlessly', () => {
      const arena = createRadialArena(4);
      const hwm = createCustomUnit('hwm', 'Highwayman', {
        activeClassId: 'highwayman',
        baseAttributes: { force: 0, finesse: 3, focus: 0 }
      });
      // Enemy with 2 Armor
      const enemy = createCustomUnit('enemy', 'Plate Vanguard', { evasion: 10, armor: 2 });

      arena.setUnitPosition('hwm', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 }); // Range 2

      const state = createCombatState(arena, [hwm, enemy], 'hwm');
      const hwmCu = state.units.get('hwm')!;
      const enemyCu = state.units.get('enemy')!;
      hwmCu.currentAp = 3;
      enemyCu.initiativeGauge = 80;

      // Action 1: Stand and Deliver! (1 AP)
      const res1 = executeAbility(state, 'hwm', STAND_AND_DELIVER, { targetUnitId: 'enemy' });
      expect(res1.type).toBe('BUFF');
      expect(hwmCu.currentAp).toBe(2);
      expect(enemyCu.initiativeGauge).toBe(50); // 80 - 30 = 50
      // Armor reduced from 2 to 0
      const armorMod = enemyCu.activeModifiers.find((m) => m.stat === 'armor');
      expect(armorMod?.value).toBe(-2);

      // Action 2: Point-Blank Buckshot (2 AP)
      // At range 2, target is still valid for Buckshot
      const dice = new MockDiceRoller({ d20Rolls: [16], damageRolls: [7] });
      const res2 = executeAbility(state, 'hwm', POINT_BLANK_BUCKSHOT, { targetUnitId: 'enemy' }, dice);
      expect(res2.type).toBe('ATTACK');
      expect(hwmCu.currentAp).toBe(0); // 3 AP fully spent

      if (res2.type === 'ATTACK') {
        // Target armor is now 2 - 2 = 0!
        // 7 (rolled) + 3 (Finesse) = 10 raw damage. 0 mitigation!
        expect(res2.details.damageDealt).toBe(10);
      }

      // Target was knocked back 1 hex to (3, 0)
      expect(arena.getUnitPosition('enemy')).toEqual({ q: 3, r: 0 });
    });
  });
});
