import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { MockDiceRoller } from './dice';
import { HEX_DIRECTIONS } from '../grid/hex';
import {
  BLOOD_FRENZY,
  RECKLESS_CLEAVE,
  IGNITE_RAGE,
  DEATHBOUND_FURY,
  BERSERKER_PACKAGE
} from '../../data/packages/berserker';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { resolveTokenAssetPath, resolvePixelTokenBase } from '../../ui/combat/tokenAssets';
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
    faction?: 'PLAYER' | 'ENEMY';
    wildcardAbilityIds?: string[];
    wildcardPassiveIds?: string[];
    baseAttributes?: { force: number; finesse: number; focus: number };
    maxHp?: number;
    armor?: number;
    evasion?: number;
    resolve?: number;
    speed?: number;
  } = {}
): Unit {
  const recruit = createRecruit(id, name, {
    faction: options.faction ?? 'PLAYER',
    loadout: {
      activeClassId: options.activeClassId ?? 'novice',
      wildcardAbilityIds: options.wildcardAbilityIds ?? [],
      wildcardPassiveIds: options.wildcardPassiveIds ?? []
    }
  });
  if (options.baseAttributes) {
    (recruit as any).baseAttributes = { ...options.baseAttributes };
  }
  if (
    options.maxHp !== undefined ||
    options.armor !== undefined ||
    options.evasion !== undefined ||
    options.resolve !== undefined ||
    options.speed !== undefined
  ) {
    (recruit as any).effectiveVitals = {
      ...recruit.effectiveVitals,
      maxHp: options.maxHp ?? recruit.effectiveVitals.maxHp,
      armor: options.armor ?? recruit.effectiveVitals.armor,
      evasion: options.evasion ?? recruit.effectiveVitals.evasion,
      resolve: options.resolve ?? recruit.effectiveVitals.resolve,
      speed: options.speed ?? recruit.effectiveVitals.speed
    };
  }
  return recruit;
}

describe('Tier 3 Berserker Class Package Integration', () => {
  describe('Package Registration & Loadout Resolution', () => {
    it('registers BERSERKER_PACKAGE in catalog with BRAWLER AI profile', () => {
      const pkg = getClassPackage('berserker');
      expect(pkg).toBe(BERSERKER_PACKAGE);
      expect(pkg?.className).toBe('Berserker');
      expect(pkg?.aiProfile).toBe('BRAWLER');
      expect(pkg?.signatureAbility.id).toBe('blood_frenzy');
      expect(pkg?.domainAbilities.map((a) => a.id)).toEqual(['reckless_cleave', 'ignite_rage']);
      expect(pkg?.passive).toBe(DEATHBOUND_FURY);

      expect(getAbilityById('blood_frenzy')).toBeDefined();
      expect(getAbilityById('reckless_cleave')).toBeDefined();
      expect(getAbilityById('ignite_rage')).toBeDefined();
      expect(getPassiveById('deathbound_fury')).toBeDefined();
    });

    it('resolves unit loadout when Berserker is active class', () => {
      const unit = createCustomUnit('berserker_hero', 'Olaf', {
        activeClassId: 'berserker'
      });

      const resolved = resolveUnitLoadout(unit, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
        'blood_frenzy',
        'reckless_cleave',
        'ignite_rage'
      ]);
      expect(resolved.activePassives.map((p) => p.id)).toEqual(['deathbound_fury']);
    });

    it('allows Berserker domain abilities and passive to be equipped as wildcards on another class', () => {
      const warrior = createCustomUnit('warrior_hero', 'Conan', {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['reckless_cleave', 'ignite_rage'],
        wildcardPassiveIds: ['deathbound_fury']
      });

      const resolved = resolveUnitLoadout(warrior, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('reckless_cleave');
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('ignite_rage');
      expect(resolved.activePassives.map((p) => p.id)).toContain('deathbound_fury');
    });
  });

  describe('Pixel Token Asset Resolution', () => {
    it('resolves berserker (03_human_male) to pixel idle rotation paths across all hex directions', () => {
      const unit = createCustomUnit('berserker_male', 'Gunnar', {
        activeClassId: 'berserker'
      });

      expect(resolvePixelTokenBase(unit)).toBe('03_human_male');
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/03_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.NORTHEAST)).toBe(
        '/assets/tokens/pixel/03_human_male/Idle/rotations/north-east.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.NORTHWEST)).toBe(
        '/assets/tokens/pixel/03_human_male/Idle/rotations/north-west.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.WEST)).toBe(
        '/assets/tokens/pixel/03_human_male/Idle/rotations/west.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.SOUTHWEST)).toBe(
        '/assets/tokens/pixel/03_human_male/Idle/rotations/south-west.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.SOUTHEAST)).toBe(
        '/assets/tokens/pixel/03_human_male/Idle/rotations/south-east.png'
      );
    });
  });

  describe('Blood Frenzy Execution & Suicide Prevention', () => {
    it('consumes 1 AP, inflicts 3 direct self-damage, and attaches +1 die step and +2 attack roll modifier', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        maxHp: 30
      });
      arena.setUnitPosition('zerk', { q: 0, r: 0 });

      const state = createCombatState(arena, [berserker], 'zerk');
      const zerkCu = state.units.get('zerk')!;
      zerkCu.currentHp = 30;
      zerkCu.currentAp = 3;

      const roller = new MockDiceRoller();
      const res = executeAbility(
        state,
        'zerk',
        BLOOD_FRENZY,
        { coord: { q: 0, r: 0 }, targetUnitId: 'zerk' },
        roller
      );

      expect(res.type).toBe('BUFF');
      expect(zerkCu.currentAp).toBe(2);
      expect(zerkCu.currentHp).toBe(27);

      const primer = zerkCu.abilityModifiers?.find((m) => m.id === 'blood_frenzy');
      expect(primer).toBeDefined();
      expect(primer?.effectPatches?.diceStep).toBe(1);
      expect(primer?.deltas?.attackRoll).toBe(2);
      expect(primer?.consumesOnUse).toBe(true);
    });

    it('allows lethal Blood Frenzy when current HP <= 3, reducing HP to 0 and defeating the unit', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        maxHp: 30
      });
      arena.setUnitPosition('zerk', { q: 0, r: 0 });

      const state = createCombatState(arena, [berserker], 'zerk');
      const zerkCu = state.units.get('zerk')!;

      // 3 HP -> execution is allowed, but lethal
      zerkCu.currentHp = 3;
      zerkCu.currentAp = 3;
      const val3 = canExecuteAbility(state, 'zerk', BLOOD_FRENZY, {
        coord: { q: 0, r: 0 },
        targetUnitId: 'zerk'
      });
      expect(val3.valid).toBe(true);

      const roller = new MockDiceRoller();
      executeAbility(
        state,
        'zerk',
        BLOOD_FRENZY,
        { coord: { q: 0, r: 0 }, targetUnitId: 'zerk' },
        roller
      );

      expect(zerkCu.currentHp).toBe(0);
      expect(zerkCu.isDefeated).toBe(true);
      expect(state.arena.getUnitPosition('zerk')).toBeUndefined();
    });

    it('respects oncePerTurn constraint on Blood Frenzy', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        maxHp: 30
      });
      arena.setUnitPosition('zerk', { q: 0, r: 0 });

      const state = createCombatState(arena, [berserker], 'zerk');
      const roller = new MockDiceRoller();

      executeAbility(
        state,
        'zerk',
        BLOOD_FRENZY,
        { coord: { q: 0, r: 0 }, targetUnitId: 'zerk' },
        roller
      );

      // Second execution in same turn must be rejected
      const valRepeat = canExecuteAbility(state, 'zerk', BLOOD_FRENZY, {
        coord: { q: 0, r: 0 },
        targetUnitId: 'zerk'
      });
      expect(valRepeat.valid).toBe(false);
      if (!valRepeat.valid) {
        expect(valRepeat.reason).toContain('once per turn');
      }
    });
  });

  describe('Blood Frenzy Primer into Physical Attacks', () => {
    it('steps Reckless Cleave from 2d4 to 2d6, applies +2 attack bonus, and consumes primer on use', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        baseAttributes: { force: 2, finesse: 2, focus: 2 }
      });
      const enemy = createCustomUnit('target', 'Target Dummy', {
        faction: 'ENEMY',
        maxHp: 50,
        armor: 0,
        evasion: 10
      });

      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state = createCombatState(arena, [berserker, enemy], 'zerk');
      const roller = new MockDiceRoller();

      // 1. Prime Blood Frenzy
      executeAbility(
        state,
        'zerk',
        BLOOD_FRENZY,
        { coord: { q: 0, r: 0 }, targetUnitId: 'zerk' },
        roller
      );
      const zerkCu = state.units.get('zerk')!;
      expect(zerkCu.abilityModifiers?.some((m) => m.id === 'blood_frenzy')).toBe(true);

      // 2. Execute Reckless Cleave (d20 = 8 + 2 force + 2 blood frenzy = 12 vs 10 evasion -> Solid Hit)
      // Damage roll: 2d6 -> roller returns 10. Force: 2. Total damage: 12.
      roller.queueD20(8);
      roller.queueDamage(10);

      const targetCu = state.units.get('target')!;
      const hpBefore = targetCu.currentHp;

      const res = executeAbility(
        state,
        'zerk',
        RECKLESS_CLEAVE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'target' },
        roller
      );

      expect(res.type).toBe('ATTACK');
      expect(targetCu.currentHp).toBe(hpBefore - 12);

      // Primer was consumed
      expect(zerkCu.abilityModifiers?.some((m) => m.id === 'blood_frenzy')).toBe(false);
    });

    it('does NOT consume Blood Frenzy primer on non-physical magical attack (Ignite Rage)', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        baseAttributes: { force: 2, finesse: 2, focus: 3 }
      });
      const enemy = createCustomUnit('target', 'Target Dummy', {
        faction: 'ENEMY',
        maxHp: 50,
        armor: 0,
        resolve: 10
      });

      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state = createCombatState(arena, [berserker, enemy], 'zerk');
      const roller = new MockDiceRoller();

      // Prime Blood Frenzy
      executeAbility(
        state,
        'zerk',
        BLOOD_FRENZY,
        { coord: { q: 0, r: 0 }, targetUnitId: 'zerk' },
        roller
      );
      const zerkCu = state.units.get('zerk')!;

      // Execute Ignite Rage (Magical)
      roller.queueD20(15);
      roller.queueDamage(4);

      executeAbility(
        state,
        'zerk',
        IGNITE_RAGE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'target' },
        roller
      );

      // Primer should STILL be attached since targetFilter requires PHYSICAL
      expect(zerkCu.abilityModifiers?.some((m) => m.id === 'blood_frenzy')).toBe(true);
    });
  });

  describe('Reckless Cleave Frontal Sweep & Self Drawback', () => {
    it('hits primary target and sweeps up to 2 mutual frontal arc hexes for collateral rolled damage, imposing -2 Evasion on self', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        baseAttributes: { force: 3, finesse: 2, focus: 1 }
      });
      const target = createCustomUnit('target', 'Primary Target', {
        faction: 'ENEMY',
        maxHp: 40,
        armor: 1,
        evasion: 10
      });
      const flank1 = createCustomUnit('flank1', 'Frontal Neighbor 1', {
        faction: 'ENEMY',
        maxHp: 40,
        armor: 0,
        evasion: 10
      });
      const flank2 = createCustomUnit('flank2', 'Frontal Neighbor 2', {
        faction: 'ENEMY',
        maxHp: 40,
        armor: 2,
        evasion: 10
      });

      // Unit at (0, 0), primary target at (1, 0)
      // Mutual neighbors of (0, 0) and (1, 0) are (1, -1) and (0, 1)
      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });
      arena.setUnitPosition('flank1', { q: 1, r: -1 });
      arena.setUnitPosition('flank2', { q: 0, r: 1 });

      const state = createCombatState(arena, [berserker, target, flank1, flank2], 'zerk');
      const roller = new MockDiceRoller();

      // Attack roll vs target: 12 + 3 force = 15 vs 10 evasion -> Solid Hit
      roller.queueD20(12);
      // Primary damage: 2d4 -> 5. Total = 5 + 3 force - 1 armor = 7
      roller.queueDamage(5);
      // Collateral 1 damage roll: 2d4 -> 6. Total = 6 + 3 force - 0 armor = 9
      roller.queueDamage(6);
      // Collateral 2 damage roll: 2d4 -> 4. Total = 4 + 3 force - 2 armor = 5
      roller.queueDamage(4);

      const res = executeAbility(
        state,
        'zerk',
        RECKLESS_CLEAVE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'target' },
        roller
      );

      expect(res.type).toBe('ATTACK');

      const targetCu = state.units.get('target')!;
      const flank1Cu = state.units.get('flank1')!;
      const flank2Cu = state.units.get('flank2')!;
      const zerkCu = state.units.get('zerk')!;

      expect(targetCu.currentHp).toBe(40 - 7);
      expect(flank1Cu.currentHp).toBe(40 - 9);
      expect(flank2Cu.currentHp).toBe(40 - 5);

      // Self drawback: -2 Evasion for 1 turn
      const evasionDebuff = zerkCu.activeModifiers.find(
        (m) => m.stat === 'evasion' && m.value === -2 && m.durationTurns === 1
      );
      expect(evasionDebuff).toBeDefined();
    });

    it('cleave collateral only strikes hostile living units (ignores allies)', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        baseAttributes: { force: 2, finesse: 2, focus: 1 }
      });
      const target = createCustomUnit('enemy', 'Enemy Target', {
        faction: 'ENEMY',
        maxHp: 40,
        armor: 0
      });
      // Friendly ally occupying one mutual hex
      const friendlyAlly = createCustomUnit('ally', 'Friendly Ally', {
        faction: 'PLAYER',
        maxHp: 40,
        armor: 0
      });

      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });
      arena.setUnitPosition('ally', { q: 1, r: -1 });

      const state = createCombatState(arena, [berserker, target, friendlyAlly], 'zerk');
      const roller = new MockDiceRoller();

      roller.queueD20(15);
      roller.queueDamage(5); // Primary target

      executeAbility(
        state,
        'zerk',
        RECKLESS_CLEAVE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'enemy' },
        roller
      );

      const allyCu = state.units.get('ally')!;
      // Ally must NOT take collateral damage
      expect(allyCu.currentHp).toBe(40);
    });
  });

  describe('Ignite Rage Execution & BURN Condition', () => {
    it('attacks Resolve using Focus, inflicts 1d6 + Focus magical damage, and attaches BURN (magnitude 2, duration 2)', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        baseAttributes: { force: 2, finesse: 2, focus: 3 }
      });
      const target = createCustomUnit('target', 'Heavily Armored Knight', {
        faction: 'ENEMY',
        maxHp: 40,
        armor: 5,
        resolve: 8
      });

      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state = createCombatState(arena, [berserker, target], 'zerk');
      const roller = new MockDiceRoller();

      // d20: 10 + 3 focus = 13 vs 8 resolve -> Solid Hit
      roller.queueD20(10);
      // 1d6 damage -> 4 + 3 focus = 7 magical damage (pierces 5 physical armor)
      roller.queueDamage(4);

      const res = executeAbility(
        state,
        'zerk',
        IGNITE_RAGE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'target' },
        roller
      );

      expect(res.type).toBe('ATTACK');

      const targetCu = state.units.get('target')!;
      // 40 HP - 7 magical damage = 33 HP
      expect(targetCu.currentHp).toBe(33);

      // Verify BURN condition
      const burn = targetCu.activeConditions?.find((c) => c.type === 'BURN');
      expect(burn).toBeDefined();
      expect(burn?.damagePerTurn).toBe(2);
      expect(burn?.durationTurns).toBe(2);
    });
  });

  describe('Deathbound Fury Passive Scaling', () => {
    it('remains inactive when current HP is greater than 50% max HP', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        maxHp: 30,
        baseAttributes: { force: 2, finesse: 2, focus: 2 }
      });
      // Target with evasion 14: total roll 19 + 2 = 21 does not beat DC by 10 (margin requires 24)
      const target = createCustomUnit('target', 'Target Dummy', {
        faction: 'ENEMY',
        maxHp: 50,
        armor: 0,
        evasion: 14
      });

      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state = createCombatState(arena, [berserker, target], 'zerk');
      const zerkCu = state.units.get('zerk')!;
      // 20 HP > 15 HP (50% max HP)
      zerkCu.currentHp = 20;

      const roller = new MockDiceRoller();
      // Natural 19: at > 50% HP, natural 19 is Solid Hit, not Critical Hit
      roller.queueD20(19);
      roller.queueDamage(4); // 2d4 = 4

      const res = executeAbility(
        state,
        'zerk',
        RECKLESS_CLEAVE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'target' },
        roller
      );

      expect(res.type).toBe('ATTACK');
      if (res.type === 'ATTACK') {
        expect(res.details.hitOutcome).toBe('SOLID_HIT');
      }

      const targetCu = state.units.get('target')!;
      // Normal damage = 4 + 2 force = 6
      expect(targetCu.currentHp).toBe(50 - 6);
    });

    it('activates +2 flat physical damage and lowers critical threshold to natural 19 when current HP <= 50% max HP', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        maxHp: 30,
        baseAttributes: { force: 2, finesse: 2, focus: 2 }
      });
      // Target with evasion 14: total roll 19 + 2 = 21 does not beat DC by 10 (margin requires 24)
      const target = createCustomUnit('target', 'Target Dummy', {
        faction: 'ENEMY',
        maxHp: 50,
        armor: 0,
        evasion: 14
      });

      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 1, r: 0 });

      const state = createCombatState(arena, [berserker, target], 'zerk');
      const zerkCu = state.units.get('zerk')!;
      // 15 HP = exactly 50% max HP -> Deathbound Fury activates!
      zerkCu.currentHp = 15;

      const roller = new MockDiceRoller();
      // Natural 19 roll -> Critical Hit due to Deathbound Fury threshold!
      roller.queueD20(19);
      // Maximized Crit: max base dice (2*4 = 8) + rolled dice (4) + force (2) + Deathbound Fury (+2) = 16!
      roller.queueDamage(4);

      const res = executeAbility(
        state,
        'zerk',
        RECKLESS_CLEAVE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'target' },
        roller
      );

      expect(res.type).toBe('ATTACK');
      if (res.type === 'ATTACK') {
        expect(res.details.hitOutcome).toBe('CRITICAL_HIT');
      }

      const targetCu = state.units.get('target')!;
      // Target suffered 16 damage
      expect(targetCu.currentHp).toBe(50 - 16);
    });
  });

  describe('Full Berserker Combat Rotation & Synergy', () => {
    it('executes full sequence: Blood Frenzy brings HP <= 50%, activates Deathbound Fury, and unleashes empowered Reckless Cleave', () => {
      const arena = createRadialArena(3);
      const berserker = createCustomUnit('zerk', 'Berserker', {
        activeClassId: 'berserker',
        faction: 'PLAYER',
        maxHp: 30,
        baseAttributes: { force: 3, finesse: 2, focus: 2 }
      });
      const enemy = createCustomUnit('enemy', 'Enemy Boss', {
        faction: 'ENEMY',
        maxHp: 60,
        armor: 1,
        evasion: 10
      });

      arena.setUnitPosition('zerk', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [berserker, enemy], 'zerk');
      const zerkCu = state.units.get('zerk')!;
      // Start at 17 HP (> 50% of 30)
      zerkCu.currentHp = 17;
      zerkCu.currentAp = 3;

      const roller = new MockDiceRoller();

      // 1. Execute Blood Frenzy (1 AP, 3 HP) -> HP drops from 17 to 14 (<= 50% max HP)!
      executeAbility(
        state,
        'zerk',
        BLOOD_FRENZY,
        { coord: { q: 0, r: 0 }, targetUnitId: 'zerk' },
        roller
      );

      expect(zerkCu.currentAp).toBe(2);
      expect(zerkCu.currentHp).toBe(14); // Now <= 50% max HP! Deathbound Fury is ACTIVE!

      // 2. Execute Reckless Cleave (2 AP):
      // Attack roll: d20 = 10 + 3 force + 2 blood frenzy = 15 vs 10 evasion -> Solid Hit
      // Damage profile: stepped from 2d4 to 2d6 by Blood Frenzy!
      // Roll: 2d6 -> 8
      // Modifiers: +3 force + 2 Deathbound Fury = +5. Total raw = 13 - 1 armor = 12 damage!
      roller.queueD20(10);
      roller.queueDamage(8);

      const res = executeAbility(
        state,
        'zerk',
        RECKLESS_CLEAVE,
        { coord: { q: 1, r: 0 }, targetUnitId: 'enemy' },
        roller
      );

      expect(res.type).toBe('ATTACK');
      expect(zerkCu.currentAp).toBe(0);

      const enemyCu = state.units.get('enemy')!;
      expect(enemyCu.currentHp).toBe(60 - 12);
    });
  });
});
