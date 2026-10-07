import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { MockDiceRoller } from './dice';
import {
  ELDRITCH_BLAST,
  PACT_BLADE,
  HELLFIRE_BRAND,
  SOUL_CARAPACE,
  WARLOCK_PACKAGE
} from '../../data/packages/warlock';
import { getClassPackage, getAbilityById, getPassiveById, POWER_STRIKE } from '../../data/packages';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { resolveAIProfile } from '../ai/heuristics';
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
    ward?: number;
    evasion?: number;
    resolve?: number;
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

describe('Tier 3 Warlock Class Package Integration', () => {
  describe('Package Registration & Loadout Resolution', () => {
    it('registers WARLOCK_PACKAGE in catalog with SNIPER AI profile', () => {
      const pkg = getClassPackage('warlock');
      expect(pkg).toBe(WARLOCK_PACKAGE);
      expect(pkg?.className).toBe('Warlock');
      expect(pkg?.aiProfile).toBe('SNIPER');
      expect(pkg?.signatureAbility.id).toBe('eldritch_blast');
      expect(pkg?.domainAbilities.map((a) => a.id)).toEqual(['pact_blade', 'hellfire_brand']);
      expect(pkg?.passive.id).toBe('soul_carapace');
      expect(pkg?.passive).toBe(SOUL_CARAPACE);

      expect(getAbilityById('eldritch_blast')).toBeDefined();
      expect(getAbilityById('pact_blade')).toBeDefined();
      expect(getAbilityById('hellfire_brand')).toBeDefined();
      expect(getPassiveById('soul_carapace')).toBeDefined();
    });

    it('resolves unit loadout when Warlock is active class', () => {
      const unit = createCustomUnit('warlock_hero', 'Malakor', {
        activeClassId: 'warlock'
      });

      const resolved = resolveUnitLoadout(unit, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
        'eldritch_blast',
        'pact_blade',
        'hellfire_brand'
      ]);
      expect(resolved.activePassives.map((p) => p.id)).toEqual(['soul_carapace']);
    });

    it('allows Warlock domain abilities and passive to be equipped as wildcards on another class', () => {
      const wizard = createCustomUnit('wizard_hero', 'Elminster', {
        activeClassId: 'wizard',
        wildcardAbilityIds: ['pact_blade', 'hellfire_brand'],
        wildcardPassiveIds: ['soul_carapace']
      });

      const resolved = resolveUnitLoadout(wizard, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('pact_blade');
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('hellfire_brand');
      expect(resolved.activePassives.map((p) => p.id)).toContain('soul_carapace');
    });

    it('resolves AI profile to SNIPER', () => {
      const arena = createRadialArena(3);
      const warlockUnit = createCustomUnit('warlock_ai', 'Warlock Bot', { activeClassId: 'warlock' });
      const state = createCombatState(arena, [warlockUnit], 'warlock_ai');
      const warlockCu = state.units.get('warlock_ai')!;

      expect(resolveAIProfile(warlockCu)).toBe('SNIPER');
    });
  });

  describe('Eldritch Blast Execution', () => {
    it('validates execution at distance 1, 2, and 3, but rejects at distance 4', () => {
      const arena = createRadialArena(5);
      const warlock = createCustomUnit('warlock', 'Warlock', { activeClassId: 'warlock' });
      const enemy1 = createCustomUnit('enemy1', 'Target 1');
      const enemy2 = createCustomUnit('enemy2', 'Target 2');
      const enemy3 = createCustomUnit('enemy3', 'Target 3');
      const enemy4 = createCustomUnit('enemy4', 'Target 4');

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('enemy1', { q: 1, r: 0 }); // dist 1
      arena.setUnitPosition('enemy2', { q: 0, r: 2 }); // dist 2
      arena.setUnitPosition('enemy3', { q: -3, r: 0 }); // dist 3
      arena.setUnitPosition('enemy4', { q: 0, r: 4 }); // dist 4

      const state = createCombatState(arena, [warlock, enemy1, enemy2, enemy3, enemy4], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      expect(canExecuteAbility(state, 'warlock', ELDRITCH_BLAST, { targetUnitId: 'enemy1' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'warlock', ELDRITCH_BLAST, { targetUnitId: 'enemy2' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'warlock', ELDRITCH_BLAST, { targetUnitId: 'enemy3' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'warlock', ELDRITCH_BLAST, { targetUnitId: 'enemy4' }).valid).toBe(false);
    });

    it('executes Eldritch Blast dealing 1d8 + Focus magical damage and knocking target back 1 hex', () => {
      const arena = createRadialArena(4);
      const warlock = createCustomUnit('warlock', 'Warlock', {
        activeClassId: 'warlock',
        baseAttributes: { force: 0, finesse: 0, focus: 3 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { resolve: 10, ward: 0 });

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 }); // Distance 2

      const state = createCombatState(arena, [warlock, enemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      // d20 = 15 (+3 Focus vs 10 Resolve -> Solid Hit), 1d8 damage roll = 6
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [6] });
      const result = executeAbility(state, 'warlock', ELDRITCH_BLAST, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        // 6 (rolled 1d8) + 3 (Focus) - 0 (Ward) = 9
        expect(result.details.damageDealt).toBe(9);
      }

      // Check AP consumption: 3 - 2 = 1 AP
      expect(warlockCu.currentAp).toBe(1);

      // Target should be knocked back 1 hex along line from (0,0) to (2,0) -> (3,0)
      const targetPos = arena.getUnitPosition('enemy');
      expect(targetPos).toEqual({ q: 3, r: 0 });
    });

    it('inflicts wall-slam collision damage with Focus scaling when target collides with perimeter', () => {
      const arena = createRadialArena(2); // Radius 2 boundary
      const warlock = createCustomUnit('warlock', 'Warlock', {
        activeClassId: 'warlock',
        baseAttributes: { force: 0, finesse: 0, focus: 3 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { resolve: 10, ward: 0, armor: 0 });

      arena.setUnitPosition('warlock', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 }); // On the perimeter

      const state = createCombatState(arena, [warlock, enemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 2;

      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [5] });
      const result = executeAbility(state, 'warlock', ELDRITCH_BLAST, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.wallSlamDamage).toBeDefined();
        // Wall slam base damage (1) + Focus (3) - Armor (0) = 4
        expect(result.details.wallSlamDamage).toBe(4);
        const collisionEvent = result.details.events.find((e) => e.type === 'COLLISION');
        expect(collisionEvent).toBeDefined();
      }
    });
  });

  describe('Pact Blade Execution', () => {
    it('validates execution at melee range 1 and rejects at range 2', () => {
      const arena = createRadialArena(3);
      const warlock = createCustomUnit('warlock', 'Warlock', { activeClassId: 'warlock' });
      const adjacentEnemy = createCustomUnit('adj', 'Adjacent');
      const distantEnemy = createCustomUnit('dist', 'Distant');

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('adj', { q: 1, r: 0 }); // Range 1
      arena.setUnitPosition('dist', { q: 2, r: 0 }); // Range 2

      const state = createCombatState(arena, [warlock, adjacentEnemy, distantEnemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      expect(canExecuteAbility(state, 'warlock', PACT_BLADE, { targetUnitId: 'adj' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'warlock', PACT_BLADE, { targetUnitId: 'dist' }).valid).toBe(false);
    });

    it('bypasses target physical armor and mitigates against Ward', () => {
      const arena = createRadialArena(3);
      const warlock = createCustomUnit('warlock', 'Warlock', {
        activeClassId: 'warlock',
        baseAttributes: { force: 0, finesse: 0, focus: 2 }
      });
      // Heavily armored enemy (5 Armor) with 1 Ward
      const armoredEnemy = createCustomUnit('knight', 'Knight', {
        resolve: 10,
        armor: 5,
        ward: 1
      });

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('knight', { q: 1, r: 0 });

      const state = createCombatState(arena, [warlock, armoredEnemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      // d20 = 15, 1d6 damage roll = 4
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const result = executeAbility(state, 'warlock', PACT_BLADE, { targetUnitId: 'knight' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        // Raw damage: 4 (1d6) + 2 (Focus) = 6
        // Mitigation: 1 Ward (5 Armor is completely ignored!)
        // Damage dealt: 6 - 1 = 5
        expect(result.details.damageDealt).toBe(5);
      }
      expect(warlockCu.currentAp).toBe(2); // 3 - 1 = 2
    });
  });

  describe('Hellfire Brand Execution', () => {
    it('validates execution up to range 2 and rejects at range 3', () => {
      const arena = createRadialArena(4);
      const warlock = createCustomUnit('warlock', 'Warlock', { activeClassId: 'warlock' });
      const enemy2 = createCustomUnit('e2', 'Dist 2');
      const enemy3 = createCustomUnit('e3', 'Dist 3');

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('e2', { q: 2, r: 0 });
      arena.setUnitPosition('e3', { q: 3, r: 0 });

      const state = createCombatState(arena, [warlock, enemy2, enemy3], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      expect(canExecuteAbility(state, 'warlock', HELLFIRE_BRAND, { targetUnitId: 'e2' }).valid).toBe(true);
      expect(canExecuteAbility(state, 'warlock', HELLFIRE_BRAND, { targetUnitId: 'e3' }).valid).toBe(false);
    });

    it('deals 1d4 + Focus magical damage and applies BURN condition for 2 turns', () => {
      const arena = createRadialArena(3);
      const warlock = createCustomUnit('warlock', 'Warlock', {
        activeClassId: 'warlock',
        baseAttributes: { force: 0, finesse: 0, focus: 2 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { resolve: 10, ward: 0 });

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 2, r: 0 });

      const state = createCombatState(arena, [warlock, enemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [14], damageRolls: [3] });
      const result = executeAbility(state, 'warlock', HELLFIRE_BRAND, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
        // 3 (1d4) + 2 (Focus) = 5
        expect(result.details.damageDealt).toBe(5);

        const burnEvent = result.details.events.find(
          (e) => e.type === 'STATUS_APPLIED' && (e as any).condition?.type === 'BURN'
        );
        expect(burnEvent).toBeDefined();
      }

      // Target should have BURN condition
      const enemyCu = state.units.get('enemy')!;
      const burnCondition = enemyCu.activeConditions.find((c) => c.type === 'BURN');
      expect(burnCondition).toBeDefined();
      expect(burnCondition?.durationTurns).toBe(2);
    });
  });

  describe('Soul Carapace Passive Trait', () => {
    it('grants self +1 Armor and +1 Ward for 1 turn upon scoring a magical attack hit', () => {
      const arena = createRadialArena(3);
      const warlock = createCustomUnit('warlock', 'Warlock', {
        activeClassId: 'warlock',
        baseAttributes: { force: 0, finesse: 0, focus: 2 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { resolve: 10, ward: 0 });

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [warlock, enemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      // Execute Pact Blade with a Solid Hit
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const result = executeAbility(state, 'warlock', PACT_BLADE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
      }

      // Warlock should have received +1 Armor and +1 Ward active modifiers
      const armorMod = warlockCu.activeModifiers.find((m) => m.stat === 'armor' && m.value === 1);
      const wardMod = warlockCu.activeModifiers.find((m) => m.stat === 'ward' && m.value === 1);

      expect(armorMod).toBeDefined();
      expect(armorMod?.durationTurns).toBe(1);
      expect(wardMod).toBeDefined();
      expect(wardMod?.durationTurns).toBe(1);
    });

    it('does not trigger Soul Carapace when magical attack misses', () => {
      const arena = createRadialArena(3);
      const warlock = createCustomUnit('warlock', 'Warlock', {
        activeClassId: 'warlock',
        baseAttributes: { force: 0, finesse: 0, focus: 0 }
      });
      const highResolveEnemy = createCustomUnit('boss', 'High Resolve Boss', { resolve: 25 });

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('boss', { q: 1, r: 0 });

      const state = createCombatState(arena, [warlock, highResolveEnemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      // Natural 1 -> Miss
      const dice = new MockDiceRoller({ d20Rolls: [1] });
      const result = executeAbility(state, 'warlock', PACT_BLADE, { targetUnitId: 'boss' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('MISS');
      }

      // No active modifiers should be applied to Warlock
      const armorMod = warlockCu.activeModifiers.find((m) => m.stat === 'armor');
      const wardMod = warlockCu.activeModifiers.find((m) => m.stat === 'ward');
      expect(armorMod).toBeUndefined();
      expect(wardMod).toBeUndefined();
    });

    it('does not trigger Soul Carapace on physical attacks', () => {
      const arena = createRadialArena(3);
      // Warlock with wildcard Power Strike (PHYSICAL attack)
      const warlock = createCustomUnit('warlock', 'Warlock', {
        activeClassId: 'warlock',
        wildcardAbilityIds: ['power_strike'],
        baseAttributes: { force: 3, finesse: 0, focus: 0 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { evasion: 10, armor: 0 });

      arena.setUnitPosition('warlock', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [warlock, enemy], 'warlock');
      const warlockCu = state.units.get('warlock')!;
      warlockCu.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [6] });
      const result = executeAbility(state, 'warlock', POWER_STRIKE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.hitOutcome).toBe('SOLID_HIT');
      }

      // Soul Carapace triggerFilter requires MAGICAL damageType, so it must not trigger on Power Strike
      const armorMod = warlockCu.activeModifiers.find((m) => m.stat === 'armor');
      const wardMod = warlockCu.activeModifiers.find((m) => m.stat === 'ward');
      expect(armorMod).toBeUndefined();
      expect(wardMod).toBeUndefined();
    });
  });
});
