import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../grid/templates';
import { createRecruit } from '../units/unitFactory';
import { executeAbility } from './resolver';
import { MockDiceRoller } from './dice';
import { STRIKE } from '../../data/packages';
import { CombatState, CombatUnit } from './types';
import { PassiveTrait } from '../types/passive';
import { evaluateTargetAuras } from './auras';

const MOCK_AURA_PASSIVE: PassiveTrait = {
  id: 'misfortune_ward',
  name: 'Misfortune Ward',
  description: 'Attacks targeting allies within 2 hexes suffer -2 Attack Roll',
  hook: 'ALWAYS',
  aura: {
    radius: 2,
    targetScope: 'ALLIES',
    attackRollPenalty: 2
  }
};

function createTestCombatUnit(id: string, name: string, faction: 'PLAYER' | 'ENEMY', passives: PassiveTrait[] = []): CombatUnit {
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
    abilities: [STRIKE],
    passives,
    facing: 0
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

describe('Tactical Aura System', () => {
  it('returns 0 when no units have auras', () => {
    const arena = createRadialArena(3);
    const ally = createTestCombatUnit('ally', 'Ally', 'PLAYER');
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');
    arena.setUnitPosition('ally', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createTestCombatState(arena, [ally, enemy]);
    const result = evaluateTargetAuras(ally, enemy, state);
    expect(result.attackRollPenalty).toBe(0);
    expect(result.sourceAuraNames).toEqual([]);
  });

  it('applies penalty when enemy attacks ally within aura radius (<= 2 hexes)', () => {
    const arena = createRadialArena(3);
    const witch = createTestCombatUnit('witch', 'Witch', 'PLAYER', [MOCK_AURA_PASSIVE]);
    const knight = createTestCombatUnit('knight', 'Knight', 'PLAYER');
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');

    // Witch at (0, 0), Knight at (1, 0) [dist 1], Enemy at (2, 0)
    arena.setUnitPosition('witch', { q: 0, r: 0 });
    arena.setUnitPosition('knight', { q: 1, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createTestCombatState(arena, [witch, knight, enemy]);
    const result = evaluateTargetAuras(knight, enemy, state);
    expect(result.attackRollPenalty).toBe(2);
    expect(result.sourceAuraNames).toContain('Misfortune Ward');
  });

  it('protects the aura bearer herself (self is at dist 0)', () => {
    const arena = createRadialArena(3);
    const witch = createTestCombatUnit('witch', 'Witch', 'PLAYER', [MOCK_AURA_PASSIVE]);
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');

    arena.setUnitPosition('witch', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createTestCombatState(arena, [witch, enemy]);
    const result = evaluateTargetAuras(witch, enemy, state);
    expect(result.attackRollPenalty).toBe(2);
  });

  it('does not apply penalty when ally is outside aura radius (> 2 hexes)', () => {
    const arena = createRadialArena(4);
    const witch = createTestCombatUnit('witch', 'Witch', 'PLAYER', [MOCK_AURA_PASSIVE]);
    const scout = createTestCombatUnit('scout', 'Scout', 'PLAYER');
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');

    // Witch at (0, 0), Scout at (3, 0) [dist 3], Enemy at (3, -1)
    arena.setUnitPosition('witch', { q: 0, r: 0 });
    arena.setUnitPosition('scout', { q: 3, r: 0 });
    arena.setUnitPosition('enemy', { q: 3, r: -1 });

    const state = createTestCombatState(arena, [witch, scout, enemy]);
    const result = evaluateTargetAuras(scout, enemy, state);
    expect(result.attackRollPenalty).toBe(0);
  });

  it('does not apply penalty if aura bearer is defeated', () => {
    const arena = createRadialArena(3);
    const witch = createTestCombatUnit('witch', 'Witch', 'PLAYER', [MOCK_AURA_PASSIVE]);
    witch.isDefeated = true;
    witch.currentHp = 0;
    const knight = createTestCombatUnit('knight', 'Knight', 'PLAYER');
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');

    arena.setUnitPosition('witch', { q: 0, r: 0 });
    arena.setUnitPosition('knight', { q: 1, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createTestCombatState(arena, [witch, knight, enemy]);
    const result = evaluateTargetAuras(knight, enemy, state);
    expect(result.attackRollPenalty).toBe(0);
  });

  it('integrates with executeAbility in resolver: applies -2 modifier to attack roll', () => {
    const arena = createRadialArena(3);
    const witch = createTestCombatUnit('witch', 'Witch', 'PLAYER', [MOCK_AURA_PASSIVE]);
    const knight = createTestCombatUnit('knight', 'Knight', 'PLAYER');
    const enemy = createTestCombatUnit('enemy', 'Enemy', 'ENEMY');

    arena.setUnitPosition('witch', { q: 0, r: 0 });
    arena.setUnitPosition('knight', { q: 1, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createTestCombatState(arena, [witch, knight, enemy]);
    state.activeUnitId = 'enemy';
    // Mock dice rolling 10
    const mockDice = new MockDiceRoller({ d20Rolls: [10], damageRolls: [3] });

    const actionResult = executeAbility(state, 'enemy', STRIKE, { targetUnitId: 'knight' }, mockDice);
    expect(actionResult.type).toBe('ATTACK');
    if (actionResult.type === 'ATTACK') {
      // Enemy base modifier is Force (0), aura penalty is 2, so modifier is -2
      expect(actionResult.details.modifier).toBe(-2);
      expect(actionResult.details.totalAttackScore).toBe(8); // 10 - 2
    }
    expect(state.combatLog[0].message).toContain('[Aura Penalty: -2 (Misfortune Ward)]');
  });
});
