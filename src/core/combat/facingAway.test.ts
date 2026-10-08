import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { executeAbility } from './resolver';
import { MockDiceRoller } from './dice';
import { Ability } from '../types/ability';
import { CombatState, CombatUnit } from './types';
import { HEX_DIRECTIONS } from '../grid/hex';

const NORMAL_ATTACK: Ability = {
  id: 'test_normal_strike',
  name: 'Normal Strike',
  description: 'Attacks and turns target to face origin',
  apCost: 1,
  range: 2,
  targetType: 'SINGLE_TARGET',
  damageType: 'PHYSICAL',
  defenseTarget: 'EVASION',
  attackModifierAttribute: 'force',
  effects: [
    {
      type: 'DAMAGE',
      applyOn: 'HIT_OR_CRIT',
      flatDamage: 3
    }
  ]
};

const POPPET_STRIKE: Ability = {
  id: 'test_poppet_strike',
  name: 'Poppet Strike',
  description: 'Attacks and turns target 180 degrees away',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  damageType: 'MAGICAL',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'focus',
  effects: [
    {
      type: 'DAMAGE',
      applyOn: 'HIT_OR_CRIT',
      flatDamage: 4
    },
    {
      type: 'FORCE_FACING_AWAY',
      applyOn: 'HIT_OR_CRIT'
    }
  ]
};

function createTestCombatUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY', abilities: Ability[] = []): CombatUnit {
  const recruit = createRecruit(id, name, { faction });
  return {
    unit: recruit,
    faction,
    currentHp: recruit.effectiveVitals.maxHp,
    currentAp: 4,
    initiativeGauge: 0,
    isDefeated: false,
    inBattleXp: { fighter: 0, rogue: 0, mage: 0 },
    activeModifiers: [],
    activeConditions: [],
    abilityModifiers: [],
    abilities,
    passives: [],
    facing: HEX_DIRECTIONS.EAST
  };
}

function createTestCombatState(arena: CombatState['arena'], cus: CombatUnit[]): CombatState {
  const map = new Map<string, CombatUnit>();
  for (const cu of cus) {
    map.set(cu.unit.id, cu);
  }
  return {
    arena,
    units: map,
    activeUnitId: cus[0]?.unit.id ?? '',
    turnNumber: 1,
    combatLog: [],
    outcome: 'IN_PROGRESS',
    objectives: []
  };
}

describe('Facing Reversal (FORCE_FACING_AWAY)', () => {
  it('normal attack turns target to face the attacker', () => {
    const arena = createRadialArena(3);
    const hero = createTestCombatUnit('hero', 'Hero', 'PLAYER', [NORMAL_ATTACK]);
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');

    // Hero at (0, 0), Enemy at (1, 0) (East of Hero).
    // Enemy initially facing NORTH (or EAST).
    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });
    enemy.facing = HEX_DIRECTIONS.EAST;

    const state = createTestCombatState(arena, [hero, enemy]);
    state.activeUnitId = 'hero';
    const mockDice = new MockDiceRoller({ d20Rolls: [15] });

    executeAbility(state, 'hero', NORMAL_ATTACK, { targetUnitId: 'enemy' }, mockDice);

    // Direction from (1, 0) to (0, 0) is WEST (3). Normal attack forces target to face attacker.
    expect(enemy.facing).toBe(HEX_DIRECTIONS.WEST);
  });

  it('FORCE_FACING_AWAY rotates target facing 180 degrees opposite the attacker', () => {
    const arena = createRadialArena(3);
    const witch = createTestCombatUnit('witch', 'Witch', 'PLAYER', [POPPET_STRIKE]);
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');

    // Witch at (0, 0), Enemy at (1, 0).
    arena.setUnitPosition('witch', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });
    enemy.facing = HEX_DIRECTIONS.WEST;

    const state = createTestCombatState(arena, [witch, enemy]);
    state.activeUnitId = 'witch';
    const mockDice = new MockDiceRoller({ d20Rolls: [15] });

    executeAbility(state, 'witch', POPPET_STRIKE, { targetUnitId: 'enemy' }, mockDice);

    // Direction from (1, 0) to (0, 0) is WEST (3).
    // Opposite (180 degrees) is EAST (0): ((3 + 3) % 6) = 0.
    expect(enemy.facing).toBe(HEX_DIRECTIONS.EAST);
  });
});
