import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { MockDiceRoller } from './dice';
import {
  BALEFUL_HEX,
  POPPET_NEEDLE,
  WITCHS_TALISMAN,
  MISFORTUNE_WARD,
  WITCH_PACKAGE
} from '../../data/packages/witch';
import { getClassPackage, getAbilityById, getPassiveById, STRIKE } from '../../data/packages';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { resolveAIProfile } from '../ai/heuristics';
import { Unit } from '../types/unit';
import { HEX_DIRECTIONS } from '../grid/hex';

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
    ward?: number;
    evasion?: number;
    resolve?: number;
    faction?: 'PLAYER' | 'ENEMY';
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
    options.ward !== undefined ||
    options.evasion !== undefined ||
    options.resolve !== undefined
  ) {
    (recruit as any).effectiveVitals = {
      ...recruit.effectiveVitals,
      maxHp: options.maxHp ?? recruit.effectiveVitals.maxHp,
      armor: options.armor ?? recruit.effectiveVitals.armor,
      ward: options.ward ?? recruit.effectiveVitals.ward,
      evasion: options.evasion ?? recruit.effectiveVitals.evasion,
      resolve: options.resolve ?? recruit.effectiveVitals.resolve
    };
  }
  return recruit;
}

describe('Tier 3 Witch Class Package Integration', () => {
  describe('Package Registration & Loadout Resolution', () => {
    it('registers WITCH_PACKAGE in catalog with SUPPORT AI profile', () => {
      const pkg = getClassPackage('witch');
      expect(pkg).toBe(WITCH_PACKAGE);
      expect(pkg?.className).toBe('Witch');
      expect(pkg?.aiProfile).toBe('SUPPORT');
      expect(pkg?.signatureAbility.id).toBe('baleful_hex');
      expect(pkg?.domainAbilities.map((a) => a.id)).toEqual(['poppet_needle', 'witchs_talisman']);
      expect(pkg?.passive.id).toBe('misfortune_ward');
      expect(pkg?.passive).toBe(MISFORTUNE_WARD);

      expect(getAbilityById('baleful_hex')).toBeDefined();
      expect(getAbilityById('poppet_needle')).toBeDefined();
      expect(getAbilityById('witchs_talisman')).toBeDefined();
      expect(getPassiveById('misfortune_ward')).toBeDefined();
    });

    it('resolves unit loadout when Witch is active class', () => {
      const unit = createCustomUnit('witch_hero', 'Morgana', {
        activeClassId: 'witch'
      });

      const resolved = resolveUnitLoadout(unit, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
        'baleful_hex',
        'poppet_needle',
        'witchs_talisman'
      ]);
      expect(resolved.activePassives.map((p) => p.id)).toEqual(['misfortune_ward']);
    });

    it('allows Witch domain abilities and passive to be equipped as wildcards on another class', () => {
      const rogue = createCustomUnit('rogue_hero', 'Shadow', {
        activeClassId: 'thief',
        wildcardAbilityIds: ['poppet_needle', 'witchs_talisman'],
        wildcardPassiveIds: ['misfortune_ward']
      });

      const resolved = resolveUnitLoadout(rogue, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('poppet_needle');
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('witchs_talisman');
      expect(resolved.activePassives.map((p) => p.id)).toContain('misfortune_ward');
    });

    it('resolves AI profile to SUPPORT', () => {
      const arena = createRadialArena(3);
      const witchUnit = createCustomUnit('witch_ai', 'Witch Bot', { activeClassId: 'witch' });
      const state = createCombatState(arena, [witchUnit], 'witch_ai');
      const witchCu = state.units.get('witch_ai')!;

      expect(resolveAIProfile(witchCu)).toBe('SUPPORT');
    });
  });

  describe('Baleful Hex Execution (Poison & CTB Delay)', () => {
    it('consumes 1 AP, deals 1d4 + Focus magical damage vs Resolve, inflicts POISON and delays CTB by 20', () => {
      const arena = createRadialArena(3);
      const witch = createCustomUnit('witch', 'Morgana', {
        activeClassId: 'witch',
        baseAttributes: { force: 0, finesse: 0, focus: 3 }
      });
      const enemy = createCustomUnit('enemy', 'Goblin', {
        faction: 'ENEMY',
        resolve: 10,
        ward: 0
      });

      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 }); // Range 2

      const state = createCombatState(arena, [witch, enemy], 'witch');
      const witchCu = state.units.get('witch')!;
      const enemyCu = state.units.get('enemy')!;
      witchCu.currentAp = 3;
      enemyCu.initiativeGauge = 50;

      // Roll 12 on d20 + 3 Focus = 15 vs 10 Resolve (SOLID_HIT), roll 3 on d4 -> 3 + 3 = 6 damage
      const dice = new MockDiceRoller({ d20Rolls: [12], damageRolls: [3] });
      const result = executeAbility(state, 'witch', BALEFUL_HEX, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(result.details.damageDealt).toBe(6);
      }
      expect(witchCu.currentAp).toBe(2);

      // Verify POISON condition applied
      const poison = enemyCu.activeConditions.find((c) => c.type === 'POISON');
      expect(poison).toBeDefined();
      expect(poison?.durationTurns).toBe(2);
      expect(poison?.damagePerTurn).toBe(2);

      // Verify CTB Delay applied: 50 - 20 = 30
      expect(enemyCu.initiativeGauge).toBe(30);
    });

    it('validates range constraints (max range 3)', () => {
      const arena = createRadialArena(4);
      const witch = createCustomUnit('witch', 'Morgana', { activeClassId: 'witch' });
      const enemy = createCustomUnit('enemy', 'Goblin', { faction: 'ENEMY' });

      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 4, r: 0 }); // Range 4 (out of range)

      const state = createCombatState(arena, [witch, enemy], 'witch');
      const validation = canExecuteAbility(state, 'witch', BALEFUL_HEX, { targetUnitId: 'enemy' });
      expect(validation.valid).toBe(false);
      if (!validation.valid) {
        expect(validation.reason).toContain('out of range');
      }
    });
  });

  describe('Poppet Needle Execution (Facing Reversal & Resolve Shred)', () => {
    it('consumes 1 AP, deals 1d6 + Focus magical damage, rotates target 180 degrees away, and shreds Resolve by -2', () => {
      const arena = createRadialArena(3);
      const witch = createCustomUnit('witch', 'Morgana', {
        activeClassId: 'witch',
        baseAttributes: { force: 0, finesse: 0, focus: 4 }
      });
      const enemy = createCustomUnit('enemy', 'Knight Foe', {
        faction: 'ENEMY',
        resolve: 10,
        ward: 1
      });

      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 }); // Range 1 (East of Witch)

      const state = createCombatState(arena, [witch, enemy], 'witch');
      const witchCu = state.units.get('witch')!;
      const enemyCu = state.units.get('enemy')!;
      witchCu.currentAp = 3;
      enemyCu.facing = HEX_DIRECTIONS.WEST; // Initially facing Witch

      // Roll 11 + 4 Focus = 15 vs 10 Resolve (SOLID_HIT), roll 4 on d6 -> (4 + 4) - 1 ward = 7 damage
      const dice = new MockDiceRoller({ d20Rolls: [11], damageRolls: [4] });
      const result = executeAbility(state, 'witch', POPPET_NEEDLE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        expect(result.details.damageDealt).toBe(7);
      }
      expect(witchCu.currentAp).toBe(2);

      // Facing reversal: direction from (1, 0) to (0, 0) is WEST (3).
      // Opposite direction is EAST (0): ((3 + 3) % 6) = 0.
      expect(enemyCu.facing).toBe(HEX_DIRECTIONS.EAST);

      // Resolve shred: -2 Resolve for 2 turns
      const mod = enemyCu.activeModifiers.find((m) => m.stat === 'resolve');
      expect(mod).toBeDefined();
      expect(mod?.value).toBe(-2);
      expect(mod?.durationTurns).toBe(2);
    });
  });

  describe("Witch's Talisman Execution (Allied Haste)", () => {
    it('consumes 1 AP, targets an ally within range 2, grants +25 CTB ticks and +2 Speed for 1 turn', () => {
      const arena = createRadialArena(3);
      const witch = createCustomUnit('witch', 'Morgana', { activeClassId: 'witch' });
      const knight = createCustomUnit('knight', 'Galahad', { activeClassId: 'knight' });

      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 2, r: 0 }); // Range 2 ally

      const state = createCombatState(arena, [witch, knight], 'witch');
      const witchCu = state.units.get('witch')!;
      const knightCu = state.units.get('knight')!;
      witchCu.currentAp = 3;
      knightCu.initiativeGauge = 10;

      const dice = new MockDiceRoller();
      const result = executeAbility(state, 'witch', WITCHS_TALISMAN, { targetUnitId: 'knight' }, dice);

      expect(result.type).toBe('BUFF');
      expect(witchCu.currentAp).toBe(2);

      // Knight gains +25 CTB ticks
      expect(knightCu.initiativeGauge).toBe(35);

      // Knight gains +2 Speed for 1 turn
      const speedMod = knightCu.activeModifiers.find((m) => m.stat === 'speed');
      expect(speedMod).toBeDefined();
      expect(speedMod?.value).toBe(2);
      expect(speedMod?.durationTurns).toBe(1);
    });
  });

  describe('Misfortune Ward (Target-Centric Protective Aura)', () => {
    it('imposes -2 penalty on enemy attack rolls targeting an ally within 2 hexes of the Witch', () => {
      const arena = createRadialArena(3);
      const witch = createCustomUnit('witch', 'Morgana', { activeClassId: 'witch' });
      const knight = createCustomUnit('knight', 'Galahad', { activeClassId: 'knight' });
      const enemy = createCustomUnit('enemy', 'Orc Archer', {
        faction: 'ENEMY',
        activeClassId: 'warrior'
      });

      // Witch at (0, 0), Knight at (1, 0) [dist 1 from Witch], Enemy at (2, 0) [dist 1 from Knight, in range for Strike]
      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [witch, knight, enemy], 'enemy');
      const enemyCu = state.units.get('enemy')!;
      enemyCu.currentAp = 3;

      // Enemy attacks Knight. Even though Enemy is 3 hexes from Witch, Knight is within 2 hexes of Witch.
      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [3] });

      const result = executeAbility(state, 'enemy', STRIKE, { targetUnitId: 'knight' }, dice);
      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        // Roll: 10 d20, base modifier 0 - 2 aura penalty = -2, total score 8
        expect(result.details.modifier).toBe(-2);
        expect(result.details.totalAttackScore).toBe(8);
      }
      const lastLog = state.combatLog[state.combatLog.length - 1];
      expect(lastLog.message).toContain('[Aura Penalty: -2 (Misfortune Ward)]');
    });

    it('protects the Witch herself from attacks', () => {
      const arena = createRadialArena(3);
      const witch = createCustomUnit('witch', 'Morgana', { activeClassId: 'witch' });
      const enemy = createCustomUnit('enemy', 'Orc Brawler', {
        faction: 'ENEMY',
        activeClassId: 'warrior'
      });

      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [witch, enemy], 'enemy');
      const enemyCu = state.units.get('enemy')!;
      enemyCu.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [3] });

      const result = executeAbility(state, 'enemy', STRIKE, { targetUnitId: 'witch' }, dice);
      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.modifier).toBe(-2);
      }
    });

    it('does not penalize attacks on allies located more than 2 hexes away', () => {
      const arena = createRadialArena(4);
      const witch = createCustomUnit('witch', 'Morgana', { activeClassId: 'witch' });
      const scout = createCustomUnit('scout', 'Ranger', { activeClassId: 'novice' });
      const enemy = createCustomUnit('enemy', 'Orc', {
        faction: 'ENEMY',
        activeClassId: 'warrior'
      });

      // Witch at (0, 0), Scout at (3, 0) [dist 3 > 2], Enemy at (3, 1) [adjacent to Scout]
      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('scout', { q: 3, r: 0 });
      arena.setUnitPosition('enemy', { q: 3, r: 1 });

      const state = createCombatState(arena, [witch, scout, enemy], 'enemy');
      const enemyCu = state.units.get('enemy')!;
      enemyCu.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [3] });

      const result = executeAbility(state, 'enemy', STRIKE, { targetUnitId: 'scout' }, dice);
      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.modifier).toBe(0); // No aura penalty
      }
    });
  });

  describe('Turn Combo Execution (3 AP Support/Offense Loop)', () => {
    it('executes Witchs Talisman on ally, Poppet Needle on enemy, and Baleful Hex on enemy in a single 3 AP turn', () => {
      const arena = createRadialArena(3);
      const witch = createCustomUnit('witch', 'Morgana', {
        activeClassId: 'witch',
        baseAttributes: { force: 0, finesse: 0, focus: 3 }
      });
      const knight = createCustomUnit('knight', 'Galahad', { activeClassId: 'knight' });
      const enemy = createCustomUnit('enemy', 'Troll', { faction: 'ENEMY', resolve: 8, maxHp: 30 });

      arena.setUnitPosition('witch', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 1, r: -1 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [witch, knight, enemy], 'witch');
      const witchCu = state.units.get('witch')!;
      witchCu.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [15, 15], damageRolls: [4, 3] });

      // Action 1: Buff knight with talisman (1 AP)
      executeAbility(state, 'witch', WITCHS_TALISMAN, { targetUnitId: 'knight' }, dice);
      expect(witchCu.currentAp).toBe(2);

      // Action 2: Poppet Needle on enemy (1 AP)
      executeAbility(state, 'witch', POPPET_NEEDLE, { targetUnitId: 'enemy' }, dice);
      expect(witchCu.currentAp).toBe(1);

      // Action 3: Baleful Hex on enemy (1 AP)
      executeAbility(state, 'witch', BALEFUL_HEX, { targetUnitId: 'enemy' }, dice);
      expect(witchCu.currentAp).toBe(0);

      // All 3 actions resolved successfully
      expect(state.combatLog.length).toBeGreaterThanOrEqual(3);
    });
  });
});
