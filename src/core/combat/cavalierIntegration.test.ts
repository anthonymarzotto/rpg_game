import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { MockDiceRoller } from './dice';
import { HEX_DIRECTIONS } from '../grid/hex';
import {
  LANCE_CHARGE,
  RIDE_THROUGH,
  FLAMBOYANT_FLOURISH,
  CAVALIER_PACKAGE
} from '../../data/packages/cavalier';
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

describe('Tier 3 Cavalier Class Package Integration', () => {
  describe('Package Registration & Loadout Resolution', () => {
    it('registers CAVALIER_PACKAGE in catalog with BRAWLER AI profile', () => {
      const pkg = getClassPackage('cavalier');
      expect(pkg).toBe(CAVALIER_PACKAGE);
      expect(pkg?.className).toBe('Cavalier');
      expect(pkg?.aiProfile).toBe('BRAWLER');
      expect(pkg?.signatureAbility.id).toBe('lance_charge');
      expect(pkg?.domainAbilities.map((a) => a.id)).toEqual(['ride_through', 'flamboyant_flourish']);
      expect(pkg?.passive.id).toBe('impact_velocity');

      expect(getAbilityById('lance_charge')).toBeDefined();
      expect(getAbilityById('ride_through')).toBeDefined();
      expect(getAbilityById('flamboyant_flourish')).toBeDefined();
      expect(getPassiveById('impact_velocity')).toBeDefined();
    });

    it('resolves unit loadout when Cavalier is active class', () => {
      const unit = createCustomUnit('cavalier_hero', 'Sir Lancelot', {
        activeClassId: 'cavalier'
      });

      const resolved = resolveUnitLoadout(unit, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toEqual([
        'lance_charge',
        'ride_through',
        'flamboyant_flourish'
      ]);
      expect(resolved.activePassives.map((p) => p.id)).toEqual(['impact_velocity']);
    });

    it('allows Cavalier domain abilities and passive to be equipped as wildcards on another class', () => {
      const warrior = createCustomUnit('warrior_hero', 'Gareth', {
        activeClassId: 'warrior',
        wildcardAbilityIds: ['ride_through', 'flamboyant_flourish'],
        wildcardPassiveIds: ['impact_velocity']
      });

      const resolved = resolveUnitLoadout(warrior, testLoadoutProviders);
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('ride_through');
      expect(resolved.combatAbilities.map((a) => a.id)).toContain('flamboyant_flourish');
      expect(resolved.activePassives.map((p) => p.id)).toContain('impact_velocity');
    });

    it('resolves Cavalier pixel sprite assets across all 6 hex directions', () => {
      const unit = createCustomUnit('cavalier_male', 'Roland', {
        activeClassId: 'cavalier'
      });

      expect(resolvePixelTokenBase(unit)).toBe('01_human_male');
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.EAST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/east.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.NORTHEAST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/north-east.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.NORTHWEST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/north-west.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.WEST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/west.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.SOUTHWEST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/south-west.png'
      );
      expect(resolveTokenAssetPath(unit, HEX_DIRECTIONS.SOUTHEAST)).toBe(
        '/assets/tokens/pixel/01_human_male/Idle/rotations/south-east.png'
      );
    });
  });

  describe('Lance Charge Execution & Validation', () => {
    it('validates straight-line rush distance requirements (2-3 hexes)', () => {
      const arena = createRadialArena(4);
      const cavalier = createCustomUnit('cav', 'Cavalier', { activeClassId: 'cavalier' });
      const enemy = createCustomUnit('enemy', 'Target');

      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 }); // dist 1

      const state = createCombatState(arena, [cavalier, enemy], 'cav');
      const cavCu = state.units.get('cav')!;
      cavCu.currentAp = 3;

      // Distance 1: Rejected
      const checkDist1 = canExecuteAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'enemy' });
      expect(checkDist1.valid).toBe(false);
      if (!checkDist1.valid) {
        expect(checkDist1.reason).toContain('at least 2 hexes of charging distance');
      }

      // Distance 2 straight line: Valid
      arena.setUnitPosition('enemy', { q: 2, r: 0 });
      const checkDist2 = canExecuteAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'enemy' });
      expect(checkDist2.valid).toBe(true);

      // Distance 3 straight line: Valid
      arena.setUnitPosition('enemy', { q: 3, r: 0 });
      const checkDist3 = canExecuteAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'enemy' });
      expect(checkDist3.valid).toBe(true);

      // Distance 4: Out of range
      arena.setUnitPosition('enemy', { q: 4, r: 0 });
      const checkDist4 = canExecuteAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'enemy' });
      expect(checkDist4.valid).toBe(false);
      if (!checkDist4.valid) {
        expect(checkDist4.reason).toContain('Target out of range');
      }

      // Distance 2 non-straight line: e.g. (1, 1) -> q diff 1, r diff 1
      arena.setUnitPosition('enemy', { q: 1, r: 1 });
      const checkDiagonal = canExecuteAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'enemy' });
      expect(checkDiagonal.valid).toBe(false);
      if (!checkDiagonal.valid) {
        expect(checkDiagonal.reason).toContain('unobstructed straight hex ray');
      }
    });

    it('rejects Lance Charge if trajectory is blocked by an intermediate obstacle or unit', () => {
      const arena = createRadialArena(4);
      const cavalier = createCustomUnit('cav', 'Cavalier', { activeClassId: 'cavalier' });
      const intermediate = createCustomUnit('blocker', 'Blocker');
      const enemy = createCustomUnit('enemy', 'Target');

      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('blocker', { q: 1, r: 0 });
      arena.setUnitPosition('enemy', { q: 3, r: 0 });

      const state = createCombatState(arena, [cavalier, intermediate, enemy], 'cav');
      state.units.get('cav')!.currentAp = 3;

      const checkBlocked = canExecuteAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'enemy' });
      expect(checkBlocked.valid).toBe(false);
      if (!checkBlocked.valid) {
        expect(checkBlocked.reason).toContain('obstructed by a unit');
      }
    });

    it('executes distance 3 Lance Charge: advances actor to penultimate hex, strikes, and knocks back target', () => {
      const arena = createRadialArena(5);
      const cavalier = createCustomUnit('cav', 'Cavalier', {
        activeClassId: 'cavalier',
        baseAttributes: { force: 2, finesse: 1, focus: 0 }
      });
      const enemy = createCustomUnit('enemy', 'Target', {
        maxHp: 30,
        armor: 1,
        evasion: 10
      });

      // Cav at (0, 0), enemy at (3, 0)
      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 3, r: 0 });

      const state = createCombatState(arena, [cavalier, enemy], 'cav');
      const cavCu = state.units.get('cav')!;
      const enemyCu = state.units.get('enemy')!;
      cavCu.currentAp = 3;

      // D20 roll: 15 (Hit). 1d8 damage roll: 5. Force = +2, Armor = 1 -> Damage = 5 + 2 - 1 = 6.
      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [5] });

      const result = executeAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      // AP cost deducted
      expect(cavCu.currentAp).toBe(1);

      // Cav rushed from (0, 0) to penultimate hex (2, 0)
      expect(arena.getUnitPosition('cav')).toEqual({ q: 2, r: 0 });
      expect(cavCu.hexesMovedThisTurn).toBe(2);
      expect(cavCu.facing).toBe(HEX_DIRECTIONS.EAST);

      // Enemy hit and knocked back 1 hex away: from (3, 0) to (4, 0)
      expect(arena.getUnitPosition('enemy')).toEqual({ q: 4, r: 0 });
      expect(enemyCu.currentHp).toBe(30 - 6);

      // Enemy facing turns to face the attack origin (2, 0) -> facing WEST
      expect(enemyCu.facing).toBe(HEX_DIRECTIONS.WEST);

      // Check combat events
      if (result.type === 'ATTACK') {
        const displacements = result.details.events.filter((e) => e.type === 'DISPLACEMENT');
        expect(displacements).toHaveLength(2); // 1 for rush charge, 1 for knockback
        expect(displacements[0]).toMatchObject({
          unitId: 'cav',
          fromCoord: { q: 0, r: 0 },
          toCoord: { q: 2, r: 0 },
          kind: 'CHARGE'
        });
        expect(displacements[1]).toMatchObject({
          unitId: 'enemy',
          fromCoord: { q: 3, r: 0 },
          toCoord: { q: 4, r: 0 },
          kind: 'KNOCKBACK'
        });
      }
    });
  });

  describe('Ride-Through Execution & Penetration', () => {
    it('executes Ride-Through and displaces actor through target to rear hex when clear', () => {
      const arena = createRadialArena(4);
      const cavalier = createCustomUnit('cav', 'Cavalier', {
        activeClassId: 'cavalier',
        baseAttributes: { force: 1, finesse: 3, focus: 0 }
      });
      const enemy = createCustomUnit('enemy', 'Target', {
        maxHp: 20,
        armor: 0,
        evasion: 10
      });

      // Cav at (0, 0), enemy at (1, 0) (adjacent)
      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [cavalier, enemy], 'cav');
      const cavCu = state.units.get('cav')!;
      const enemyCu = state.units.get('enemy')!;
      cavCu.currentAp = 2;

      // D20: 16 (Hit). 1d4 damage roll: 3. Finesse: +3 -> Damage = 6.
      const dice = new MockDiceRoller({ d20Rolls: [16], damageRolls: [3] });

      const result = executeAbility(state, 'cav', RIDE_THROUGH, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      expect(cavCu.currentAp).toBe(1);

      // Cav penetrates through enemy at (1, 0) into rear hex (2, 0)
      expect(arena.getUnitPosition('cav')).toEqual({ q: 2, r: 0 });
      expect(cavCu.facing).toBe(HEX_DIRECTIONS.EAST);
      expect(cavCu.hexesMovedThisTurn).toBe(2);

      // Enemy remains at (1, 0) and took damage
      expect(arena.getUnitPosition('enemy')).toEqual({ q: 1, r: 0 });
      expect(enemyCu.currentHp).toBe(20 - 6);

      // Enemy turned to face the attack origin (0, 0) -> facing WEST
      // Consequently, Cav at (2, 0) is now positioned directly in the enemy's rear!
      expect(enemyCu.facing).toBe(HEX_DIRECTIONS.WEST);
    });

    it('resolves attack but keeps actor stationary when rear exit hex is blocked', () => {
      const arena = createRadialArena(4);
      const cavalier = createCustomUnit('cav', 'Cavalier', {
        activeClassId: 'cavalier',
        baseAttributes: { force: 1, finesse: 2, focus: 0 }
      });
      const enemy = createCustomUnit('enemy', 'Target', { maxHp: 20 });
      const bystander = createCustomUnit('bystander', 'Bystander');

      // Cav at (0, 0), enemy at (1, 0), bystander blocking exit hex at (2, 0)
      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });
      arena.setUnitPosition('bystander', { q: 2, r: 0 });

      const state = createCombatState(arena, [cavalier, enemy, bystander], 'cav');
      const cavCu = state.units.get('cav')!;
      const enemyCu = state.units.get('enemy')!;
      cavCu.currentAp = 2;

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [2] });
      const result = executeAbility(state, 'cav', RIDE_THROUGH, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('ATTACK');
      // Damage was dealt
      expect(enemyCu.currentHp).toBeLessThan(20);

      // Cav remained stationary at (0, 0) because (2, 0) was blocked
      expect(arena.getUnitPosition('cav')).toEqual({ q: 0, r: 0 });
    });
  });

  describe('Flamboyant Flourish Execution', () => {
    it('applies CHALLENGED to target (2 turns) and +2 Evasion to self (1 turn) without attack roll', () => {
      const arena = createRadialArena(3);
      const cavalier = createCustomUnit('cav', 'Cavalier', { activeClassId: 'cavalier' });
      const enemy = createCustomUnit('enemy', 'Target');

      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('enemy', { q: 1, r: 0 });

      const state = createCombatState(arena, [cavalier, enemy], 'cav');
      const cavCu = state.units.get('cav')!;
      const enemyCu = state.units.get('enemy')!;
      cavCu.currentAp = 2;

      const dice = new MockDiceRoller();
      const result = executeAbility(state, 'cav', FLAMBOYANT_FLOURISH, { targetUnitId: 'enemy' }, dice);

      expect(result.type).toBe('BUFF');
      expect(cavCu.currentAp).toBe(1);

      // Target received CHALLENGED for 2 turns
      const challenged = enemyCu.activeConditions.find((c) => c.type === 'CHALLENGED');
      expect(challenged).toBeDefined();
      expect(challenged?.durationTurns).toBe(2);
      expect(challenged?.sourceUnitId).toBe('cav');

      // Actor received +2 Evasion modifier for 1 turn
      const evasionMod = cavCu.activeModifiers.find((m) => m.stat === 'evasion' && m.value === 2);
      expect(evasionMod).toBeDefined();
      expect(evasionMod?.durationTurns).toBe(1);
    });
  });

  describe('Impact Velocity Passive & Collision Damage', () => {
    it('adds +2 collision damage on wall-slam compared to unit without Impact Velocity', () => {
      const arena = createRadialArena(2);
      // Unit on border of radius 2: enemy at (2, 0), actor at (1, 0)
      const cavalier = createCustomUnit('cav', 'Cavalier', {
        activeClassId: 'cavalier',
        baseAttributes: { force: 2, finesse: 0, focus: 0 }
      });
      const normalFighter = createCustomUnit('fighter', 'Fighter', {
        activeClassId: 'warrior',
        baseAttributes: { force: 2, finesse: 0, focus: 0 }
      });
      const enemyA = createCustomUnit('enemyA', 'Target A', { maxHp: 30, armor: 0 });
      const enemyB = createCustomUnit('enemyB', 'Target B', { maxHp: 30, armor: 0 });

      // Test 1: Cavalier charges at distance 2 -> rush to (1, 0), enemy at (2, 0) knocked into boundary
      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('enemyA', { q: 2, r: 0 });

      const stateCav = createCombatState(arena, [cavalier, enemyA], 'cav');
      stateCav.units.get('cav')!.currentAp = 3;

      // Attack roll 15 (Hit), base damage 4.
      // Wall slam math: base 1 + Force 2 + Impact Velocity 2 - Armor 0 = 5 wall slam damage.
      const diceCav = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const resCav = executeAbility(stateCav, 'cav', LANCE_CHARGE, { targetUnitId: 'enemyA' }, diceCav);

      expect(resCav.type).toBe('ATTACK');
      if (resCav.type === 'ATTACK') {
        expect(resCav.details.knockbackResult?.isCollided).toBe(true);
        expect(resCav.details.wallSlamDamage).toBe(5);
      }

      // Test 2: Normal Fighter (no Impact Velocity) executing Lance Charge (e.g. via wildcard)
      // Base 1 + Force 2 + Passive 0 - Armor 0 = 3 wall slam damage.
      const arena2 = createRadialArena(2);
      arena2.setUnitPosition('fighter', { q: 0, r: 0 });
      arena2.setUnitPosition('enemyB', { q: 2, r: 0 });

      const stateFighter = createCombatState(arena2, [normalFighter, enemyB], 'fighter');
      stateFighter.units.get('fighter')!.currentAp = 3;

      const diceFighter = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const resFighter = executeAbility(stateFighter, 'fighter', LANCE_CHARGE, { targetUnitId: 'enemyB' }, diceFighter);

      expect(resFighter.type).toBe('ATTACK');
      if (resFighter.type === 'ATTACK') {
        expect(resFighter.details.knockbackResult?.isCollided).toBe(true);
        expect(resFighter.details.wallSlamDamage).toBe(3);
      }

      // Verify the exact +2 difference
      if (resCav.type === 'ATTACK' && resFighter.type === 'ATTACK') {
        expect(resCav.details.wallSlamDamage! - resFighter.details.wallSlamDamage!).toBe(2);
      }
    });

    it('adds +2 collision damage when knocking target into another unit', () => {
      const arena = createRadialArena(4);
      const cavalier = createCustomUnit('cav', 'Cavalier', {
        activeClassId: 'cavalier',
        baseAttributes: { force: 2, finesse: 0, focus: 0 }
      });
      const target = createCustomUnit('target', 'Target', { maxHp: 30, armor: 1 });
      const bystander = createCustomUnit('bystander', 'Bystander');

      // Cav at (0, 0), Target at (2, 0), Bystander at (3, 0)
      // Cav charges target, rushing to (1, 0). Target knocked from (2, 0) into bystander at (3, 0).
      arena.setUnitPosition('cav', { q: 0, r: 0 });
      arena.setUnitPosition('target', { q: 2, r: 0 });
      arena.setUnitPosition('bystander', { q: 3, r: 0 });

      const state = createCombatState(arena, [cavalier, target, bystander], 'cav');
      state.units.get('cav')!.currentAp = 3;

      const dice = new MockDiceRoller({ d20Rolls: [15], damageRolls: [4] });
      const result = executeAbility(state, 'cav', LANCE_CHARGE, { targetUnitId: 'target' }, dice);

      expect(result.type).toBe('ATTACK');
      if (result.type === 'ATTACK') {
        expect(result.details.knockbackResult?.isCollided).toBe(true);
        expect(result.details.knockbackResult?.collidingUnitId).toBe('bystander');
        // Base 1 + Force 2 + Passive 2 - Armor 1 = 4
        expect(result.details.wallSlamDamage).toBe(4);
      }
    });
  });
});
