import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility } from './resolver';
import { canExecuteAbility } from './validator';
import { endActiveTurn } from './turnClock';
import { MockDiceRoller } from './dice';
import {
  BALLISTICIAN_PACKAGE,
  SIEGE_BARRAGE,
  SHRAPNEL_CANISTER,
  SIGHTING_BOLT,
  ZEROED_IN
} from '../../data/packages/ballistician';
import { getClassPackage, getAbilityById, getPassiveById } from '../../data/packages';
import { resolveUnitLoadout, LoadoutLookupProviders } from '../units/loadout';
import { Unit } from '../types/unit';

const testLoadoutProviders: LoadoutLookupProviders = {
  getPackage: getClassPackage,
  getAbility: getAbilityById,
  getPassive: getPassiveById
};

function createBallisticianUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY' = 'PLAYER'): Unit {
  const recruit = createRecruit(id, name, {
    faction,
    loadout: {
      activeClassId: 'ballistician',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    }
  });
  (recruit as any).baseAttributes = { force: 1, finesse: 3, focus: 0 };
  (recruit as any).unlockedNodes = ['thief', 'infiltrator', 'highwayman', 'ballistician'];
  return recruit;
}

describe('Tier 4 Ballistician Integration', () => {
  it('resolves Ballistician active class package and allows equipping domain abilities as wildcards', () => {
    const ball = createBallisticianUnit('b1', 'Siege Engineer');
    const resolved = resolveUnitLoadout(ball, testLoadoutProviders);
    expect(resolved.combatAbilities.map((a) => a.id)).toEqual(['siege_barrage', 'shrapnel_canister', 'sighting_bolt']);
    expect(resolved.activePassives.some((p) => p.id === ZEROED_IN.id)).toBe(true);

    const highwaymanWithWildcards: Unit = {
      ...ball,
      loadout: {
        activeClassId: 'highwayman',
        wildcardAbilityIds: ['shrapnel_canister', 'sighting_bolt'],
        wildcardPassiveIds: ['zeroed_in']
      }
    };
    const resolvedWildcard = resolveUnitLoadout(highwaymanWithWildcards, testLoadoutProviders);
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('shrapnel_canister');
    expect(resolvedWildcard.combatAbilities.map((a) => a.id)).toContain('sighting_bolt');
    expect(resolvedWildcard.activePassives.map((p) => p.id)).toContain('zeroed_in');
  });

  it('enforces minRange 2 deadzone across all three Ballistician abilities', () => {
    const arena = createRadialArena(5);
    const ball = createBallisticianUnit('ball', 'Ballistician', 'PLAYER');
    const adjEnemy = createRecruit('adj', 'Adjacent Foe', { faction: 'ENEMY' });
    arena.setUnitPosition('ball', { q: 0, r: 0 });
    arena.setUnitPosition('adj', { q: 1, r: 0 });

    const state = createCombatState(arena, [ball, adjEnemy], 'ball');

    expect(canExecuteAbility(state, 'ball', SIEGE_BARRAGE, { coord: { q: 1, r: 0 } }).valid).toBe(false);
    expect(canExecuteAbility(state, 'ball', SHRAPNEL_CANISTER, { coord: { q: 1, r: 0 } }).valid).toBe(false);
    expect(canExecuteAbility(state, 'ball', SIGHTING_BOLT, { targetUnitId: 'adj' }).valid).toBe(false);
  });

  it('Sighting Bolt applies EXPOSED and TELEMETRY on Solid Hit, but NOT on Graze', () => {
    const arena = createRadialArena(5);
    const ball = createBallisticianUnit('ball', 'Ballistician', 'PLAYER');
    const enemy = createRecruit('enemy', 'Target', { faction: 'ENEMY' });
    (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, evasion: 14, armor: 0 };

    arena.setUnitPosition('ball', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 3, r: 0 });

    const state = createCombatState(arena, [ball, enemy], 'ball');
    const enemyCu = state.units.get('enemy')!;
    enemyCu.currentHp = 30;

    // 1. Graze: finesse = 3, d20 = 9 -> total 12 vs Evasion 14 (within graze margin 2) -> GRAZE
    const grazeRoller = new MockDiceRoller({ d20Rolls: [9], damageRolls: [4] });
    const grazeRes = executeAbility(state, 'ball', SIGHTING_BOLT, { targetUnitId: 'enemy' }, grazeRoller);
    expect(grazeRes.type).toBe('ATTACK');
    if (grazeRes.type === 'ATTACK') {
      expect(grazeRes.details.hitOutcome).toBe('GRAZE');
    }
    expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(false);
    expect(enemyCu.activeConditions.some((c) => c.type === 'TELEMETRY')).toBe(false);

    // 2. Solid Hit: finesse = 3, d20 = 12 -> total 15 vs Evasion 14 -> SOLID_HIT
    const hitRoller = new MockDiceRoller({ d20Rolls: [12], damageRolls: [3] });
    const hitRes = executeAbility(state, 'ball', SIGHTING_BOLT, { targetUnitId: 'enemy' }, hitRoller);
    expect(hitRes.type).toBe('ATTACK');
    if (hitRes.type === 'ATTACK') {
      expect(hitRes.details.hitOutcome).toBe('SOLID_HIT');
    }
    expect(enemyCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(true);
    expect(enemyCu.activeConditions.some((c) => c.type === 'TELEMETRY')).toBe(true);
  });

  it('executes full stationary 3-AP Shrapnel Canister + Siege Barrage rotation and gains Zeroed In stack', () => {
    const arena = createRadialArena(5);
    const ball = createBallisticianUnit('ball', 'Ballistician', 'PLAYER');
    const enemy = createRecruit('enemy', 'Target', { faction: 'ENEMY' });
    (enemy as any).effectiveVitals = { ...enemy.effectiveVitals, maxHp: 30, speed: 5 };
    arena.setUnitPosition('ball', { q: -3, r: 0 });
    arena.setUnitPosition('enemy', { q: 0, r: 0 });

    const state = createCombatState(arena, [ball, enemy], 'ball');
    const ballCu = state.units.get('ball')!;
    expect(ballCu.passives.some((p) => p.id === ZEROED_IN.id)).toBe(true);
    expect(BALLISTICIAN_PACKAGE.aiProfile).toBe('SNIPER');

    // 1 AP Shrapnel Canister + 2 AP Siege Barrage = 3 AP stationary turn
    executeAbility(state, 'ball', SHRAPNEL_CANISTER, { coord: { q: 0, r: 0 } });
    executeAbility(state, 'ball', SIEGE_BARRAGE, { coord: { q: 0, r: 0 } });
    expect(ballCu.currentAp).toBe(0);
    expect(state.hexHazards).toHaveLength(1);
    expect(state.pendingBombardments).toHaveLength(1);

    // End turn without moving -> gains 1 Zeroed In stack
    endActiveTurn(state);
    expect(ballCu.zeroedInStacks).toBe(1);
  });
});
