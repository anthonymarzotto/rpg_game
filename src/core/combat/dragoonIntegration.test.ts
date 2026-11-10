import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { MockDiceRoller } from './dice';
import {
  DRAGON_DIVE,
  PIERCING_THRUST,
  WYRMFLAME_BREATH,
  DRAGOON_PACKAGE
} from '../../data/packages/dragoon';
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

describe('Tier 4 Dragoon Class Package Integration', () => {
  describe('Package Registration & Loadout Resolution', () => {
    it('registers DRAGOON_PACKAGE in catalog with BRAWLER AI profile', () => {
      const pkg = getClassPackage('dragoon');
      expect(pkg).toBe(DRAGOON_PACKAGE);
      expect(pkg?.className).toBe('Dragoon');
      expect(pkg?.aiProfile).toBe('BRAWLER');
      expect(pkg?.signatureAbility.id).toBe('dragon_dive');
      expect(pkg?.domainAbilities.map((a) => a.id)).toEqual(['piercing_thrust', 'wyrmflame_breath']);
      expect(pkg?.passive.id).toBe('coiled_apex');

      expect(getAbilityById('dragon_dive')).toBeDefined();
      expect(getAbilityById('piercing_thrust')).toBeDefined();
      expect(getAbilityById('wyrmflame_breath')).toBeDefined();
      expect(getPassiveById('coiled_apex')).toBeDefined();
    });

    it('resolves unit loadout when Dragoon is active class', () => {
      const unit = createCustomUnit('dragoon_hero', 'Valerius', {
        activeClassId: 'dragoon'
      });

      const resolved = resolveUnitLoadout(unit, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
        'dragon_dive',
        'piercing_thrust',
        'wyrmflame_breath'
      ]);
      expect(resolved.activePassives.map((p) => p.id)).toEqual(['coiled_apex']);
    });

    it('allows equipping Dragoon abilities and passive as wildcards on other classes', () => {
      const warriorWithDragoonWildcards = createCustomUnit('warrior_dragoon', 'Boran', {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['piercing_thrust', 'wyrmflame_breath'],
        wildcardPassiveIds: ['coiled_apex']
      });

      const resolved = resolveUnitLoadout(warriorWithDragoonWildcards, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('power_strike'); // Warrior signature
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('piercing_thrust'); // Dragoon wildcard
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('wyrmflame_breath'); // Dragoon wildcard
      expect(resolved.activePassives.map((p) => p.id)).toContain('coiled_apex'); // Dragoon passive
    });
  });

  describe('Combat Execution & Archetype In-Battle XP', () => {
    it('awards Fighter XP on Dragon Dive and Piercing Thrust, and Mage XP on Wyrmflame Breath', () => {
      const arena = createRadialArena(3);
      const dragoon = createCustomUnit('dragoon_unit', 'Valerius', {
        activeClassId: 'dragoon',
        faction: 'PLAYER'
      });
      const enemy = createCustomUnit('enemy_unit', 'Target Dummy', {
        activeClassId: 'novice',
        faction: 'ENEMY'
      });

      arena.setUnitPosition('dragoon_unit', { q: 0, r: 0 });
      arena.setUnitPosition('enemy_unit', { q: 2, r: 0 });

      const state = createCombatState(arena, [dragoon, enemy], 'dragoon_unit');
      const dragoonCu = state.units.get('dragoon_unit')!;

      // 1. Dragon Dive costs 2 AP -> awards 2 Fighter XP
      dragoonCu.currentAp = 2;
      const dice1 = new MockDiceRoller({ d20Rolls: [18], damageRolls: [6] });
      executeAbility(state, 'dragoon_unit', DRAGON_DIVE, { targetUnitId: 'enemy_unit' }, dice1);
      expect(state.partyXpPool.fighter).toBe(2);
      expect(dragoonCu.inBattleXp.fighter).toBe(2);

      // Reset positions for next test
      state.arena.setUnitPosition('dragoon_unit', { q: 0, r: 0 });
      state.arena.setUnitPosition('enemy_unit', { q: 1, r: 0 });

      // 2. Piercing Thrust costs 1 AP -> awards 1 Fighter XP
      dragoonCu.currentAp = 1;
      const dice2 = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      executeAbility(state, 'dragoon_unit', PIERCING_THRUST, { targetUnitId: 'enemy_unit' }, dice2);
      expect(state.partyXpPool.fighter).toBe(3);
      expect(dragoonCu.inBattleXp.fighter).toBe(3);

      // 3. Wyrmflame Breath costs 1 AP -> awards 1 Mage XP
      dragoonCu.currentAp = 1;
      const dice3 = new MockDiceRoller({ d20Rolls: [15], damageRolls: [3] });
      executeAbility(state, 'dragoon_unit', WYRMFLAME_BREATH, { coord: { q: 1, r: 0 } }, dice3);
      expect(state.partyXpPool.mage).toBe(1);
      expect(dragoonCu.inBattleXp.mage).toBe(1);
    });
  });
});
