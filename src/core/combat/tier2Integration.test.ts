import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { createCombatState, executeAbility, executeMove } from './resolver';
import { buildEncounterState } from './encounter';
import { MockDiceRoller } from './dice';
import { resolveAIProfile } from '../ai/heuristics';
import { decideNextAction } from '../ai/decisionEngine';
import { resolveTokenAssetPath, resolvePixelTokenBase } from '../../ui/combat/tokenAssets';
import { assembleEnemySquad, createEnemyUnit } from '../campaign/encounterGenerator';
import {
  IGNITE,
  ELUSIVE_STRIDE,
  WILD_SURGE
} from '../../data/packages';
import { getEffectiveEvasion } from './effectiveVitals';
import { endActiveTurn } from './turnClock';

describe('Task Group 4: Pre-Encounter, Triggers, AI, Tokens & Encounter Generation', () => {
  it('Task 4.1: Pre-encounter setup seeds +25 starting initiative for Tactical Vanguard', () => {
    const arena = createRadialArena(3);
    const knight = createRecruit('knight', 'Knight', {
      faction: 'PLAYER',
      loadout: {
        activeClassId: 'knight',
        wildcardAbilityIds: [],
        wildcardPassiveIds: []
      }
    });
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'ENEMY' });
    arena.setUnitPosition('knight', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const encounterDef = {
      id: 'test_encounter',
      name: 'Test Encounter',
      arenaRadius: 3,
      units: [
        { unit: knight, coord: { q: 0, r: 0 } },
        { unit: enemy, coord: { q: 2, r: 0 } }
      ]
    };

    const state = buildEncounterState(encounterDef);
    const knightCu = state.units.get('knight')!;

    // Knight with Tactical Vanguard received +25 initiative
    expect(knightCu.initiativeGauge).toBeGreaterThanOrEqual(25);
  });

  it('Task 4.2: Critical hit with magic spell triggers Wild Surge spontaneous effects', () => {
    const arena = createRadialArena(3);
    const sorcerer = createRecruit('sorcerer', 'Sorcerer', { faction: 'PLAYER' });
    const enemy1 = createRecruit('enemy1', 'Enemy 1', { faction: 'ENEMY' });
    const enemy2 = createRecruit('enemy2', 'Enemy 2', { faction: 'ENEMY' });

    arena.setUnitPosition('sorcerer', { q: 0, r: 0 });
    arena.setUnitPosition('enemy1', { q: 1, r: 0 });
    arena.setUnitPosition('enemy2', { q: 2, r: 0 });

    const state = createCombatState(arena, [sorcerer, enemy1, enemy2], 'sorcerer');
    const sorcCu = state.units.get('sorcerer')!;
    (sorcCu as any).passives = [WILD_SURGE];

    const enemy1Cu = state.units.get('enemy1')!;
    enemy1Cu.currentHp = 50;

    // Case 1: Wild surge roll = 1 (+1 AP refund)
    // D20 roll: 20 (Critical hit). Damage roll: 4. Wild Surge 1d3 roll: 1 (+1 AP).
    const dice1 = new MockDiceRoller({ d20Rolls: [20], damageRolls: [4, 1] });
    sorcCu.currentAp = 2;
    executeAbility(state, 'sorcerer', IGNITE, { targetUnitId: 'enemy1' }, dice1);

    // Initial AP was 2, IGNITE cost 1 AP -> 1 AP. Wild Surge refunded 1 AP -> back to 2 AP!
    expect(sorcCu.currentAp).toBe(2);

    // Case 2: Wild surge roll = 2 (+25 CTB gauge boost)
    const dice2 = new MockDiceRoller({ d20Rolls: [20], damageRolls: [4, 2] });
    sorcCu.currentAp = 2;
    const prevGauge = sorcCu.initiativeGauge;
    executeAbility(state, 'sorcerer', IGNITE, { targetUnitId: 'enemy1' }, dice2);
    expect(sorcCu.initiativeGauge).toBe(prevGauge + 25);

    // Case 3: Wild surge roll = 3 (2 collateral magic damage to enemy)
    const enemy2Cu = state.units.get('enemy2')!;
    const prevEnemy2Hp = enemy2Cu.currentHp;
    const dice3 = new MockDiceRoller({ d20Rolls: [20], damageRolls: [4, 3, 2] });
    sorcCu.currentAp = 2;
    executeAbility(state, 'sorcerer', IGNITE, { targetUnitId: 'enemy1' }, dice3);
    expect(enemy2Cu.currentHp).toBe(prevEnemy2Hp - 2);
  });

  it('Task 4.3: Moving with Elusive Stride grants +2 Evasion until start of next turn', () => {
    const arena = createRadialArena(3);
    const infiltrator = createRecruit('infiltrator', 'Infiltrator', { faction: 'PLAYER' });
    arena.setUnitPosition('infiltrator', { q: 0, r: 0 });

    const state = createCombatState(arena, [infiltrator], 'infiltrator');
    const infCu = state.units.get('infiltrator')!;
    (infCu as any).passives = [ELUSIVE_STRIDE];

    const baseEvasion = getEffectiveEvasion(infCu);

    // Move 1 hex
    executeMove(state, 'infiltrator', { q: 1, r: 0 });

    // Received +2 Evasion modifier
    expect(getEffectiveEvasion(infCu)).toBe(baseEvasion + 2);
    expect(infCu.activeModifiers.some((m) => m.stat === 'evasion' && m.value === 2)).toBe(true);

    // Ending turn and starting next turn clears it
    endActiveTurn(state);
    expect(infCu.activeModifiers.some((m) => m.stat === 'evasion')).toBe(false);
    expect(getEffectiveEvasion(infCu)).toBe(baseEvasion);
  });

  it('Task 4.4: AI heuristics maps Tier 2 classes and prioritizes Spell Sculpt priming', () => {
    const knight = createRecruit('knight', 'Knight', {
      loadout: { activeClassId: 'knight', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });
    const inf = createRecruit('inf', 'Infiltrator', {
      loadout: { activeClassId: 'infiltrator', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });
    const sorc = createRecruit('sorc', 'Sorcerer', {
      loadout: { activeClassId: 'sorcerer', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });

    const arena = createRadialArena(3);
    arena.setUnitPosition('knight', { q: 0, r: 0 });
    arena.setUnitPosition('inf', { q: 1, r: 0 });
    arena.setUnitPosition('sorc', { q: 2, r: 0 });

    const state = createCombatState(arena, [knight, inf, sorc], 'knight');

    expect(resolveAIProfile(state.units.get('knight')!)).toBe('SUPPORT');
    expect(resolveAIProfile(state.units.get('inf')!)).toBe('SKIRMISHER');
    expect(resolveAIProfile(state.units.get('sorc')!)).toBe('SNIPER');

    // AI Sorcerer with 3 AP and Spell Sculpt + Ignite primes Spell Sculpt first
    const enemy = createRecruit('enemy', 'Enemy', { faction: 'PLAYER' });
    arena.setUnitPosition('enemy', { q: 2, r: 1 });
    const combatState = createCombatState(arena, [sorc, enemy], 'sorc');
    const sorcCu = combatState.units.get('sorc')!;
    sorcCu.faction = 'ENEMY';
    sorcCu.currentAp = 3;

    const plannedAction = decideNextAction(combatState, 'sorc');
    expect(plannedAction.type).toBe('ABILITY');
    if (plannedAction.type === 'ABILITY') {
      expect(plannedAction.ability.id).toBe('spell_sculpt');
    }
  });

  it('Task 4.5: Resolves pixel tokens for Knight (02), Infiltrator (82), and Sorcerer (98)', () => {
    const knight = createRecruit('k1', 'Sir Knight', {
      loadout: { activeClassId: 'knight', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });
    expect(resolvePixelTokenBase(knight)).toBe('02_human_male');
    expect(resolveTokenAssetPath(knight)).toContain('/tokens/pixel/02_human_male/Idle/rotations/');

    const inf = createRecruit('i1', 'Shadow', {
      loadout: { activeClassId: 'infiltrator', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });
    expect(resolvePixelTokenBase(inf)).toBe('82_human_male');
    expect(resolveTokenAssetPath(inf)).toContain('/tokens/pixel/82_human_male/Idle/rotations/');

    const sorc = createRecruit('s1', 'Arcanist', {
      loadout: { activeClassId: 'sorcerer', wildcardAbilityIds: [], wildcardPassiveIds: [] }
    });
    expect(resolvePixelTokenBase(sorc)).toBe('98_human_male');
    expect(resolveTokenAssetPath(sorc)).toContain('/tokens/pixel/98_human_male/Idle/rotations/');
  });

  it('Task 4.6: Assemble enemy squad can spawn Tier 2 enemies at Stage 3+ with 40 threat cost', () => {
    const enemyKnight = createEnemyUnit('e1', 'knight');
    expect(enemyKnight.loadout.activeClassId).toBe('knight');
    expect(enemyKnight.progression.currentLevel).toBe(2);

    // Mock RNG to guarantee Tier 2 spawn at stage 3 with 50 threat budget
    const mockRng = () => 0.1;
    const squad = assembleEnemySquad(50, 3, mockRng);

    const hasTier2 = squad.some(
      (u) => u.loadout.activeClassId === 'knight' ||
             u.loadout.activeClassId === 'infiltrator' ||
             u.loadout.activeClassId === 'sorcerer'
    );
    expect(hasTier2).toBe(true);
  });
});
