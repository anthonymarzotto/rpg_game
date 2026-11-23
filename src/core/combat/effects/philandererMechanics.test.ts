import { describe, it, expect } from 'vitest';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState, executeAbility } from '../resolver';
import { MockDiceRoller } from '../dice';
import { Ability } from '../../types/ability';
import { UNYIELDING_STANCE } from '../../../data/packages/shieldBearer';

const TEST_PULL_ABILITY: Ability = {
  id: 'test_beckon',
  name: 'Test Beckon',
  description: 'Pulls target 1 hex toward caster.',
  archetypeTag: 'ROGUE',
  apCost: 1,
  range: 3,
  targetType: 'SINGLE_TARGET',
  defenseTarget: 'RESOLVE',
  attackModifierAttribute: 'finesse',
  damageType: 'NONE',
  effects: [
    {
      type: 'PULL',
      magnitude: 1,
      applyOn: 'HIT_OR_CRIT'
    },
    {
      type: 'FORCE_FACING',
      applyOn: 'HIT_OR_CRIT'
    },
    {
      type: 'CONDITION',
      conditionType: 'EXPOSED',
      durationTurns: 1,
      applyOn: 'HIT_OR_CRIT'
    }
  ]
};

describe('Philanderer Pull & Outcome Trigger Mechanics', () => {
  it('pulls target 1 hex toward actor on solid hit and exposes them', () => {
    const arena = createRadialArena(3);
    const actor = createRecruit('actor', 'Philanderer', { faction: 'PLAYER' });
    const target = createRecruit('target', 'Bandit', { faction: 'ENEMY' });

    arena.setUnitPosition('actor', { q: 0, r: 0 });
    arena.setUnitPosition('target', { q: 2, r: 0 });

    const state = createCombatState(arena, [actor, target], 'actor');
    const dice = new MockDiceRoller({ d20Rolls: [15] });

    executeAbility(state, 'actor', TEST_PULL_ABILITY, { targetUnitId: 'target' }, dice);

    expect(arena.getUnitPosition('target')).toEqual({ q: 1, r: 0 });
    const targetCu = state.units.get('target')!;
    expect(targetCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(true);
  });

  it('inflicts fall damage when pulling target off a high ledge (dh <= -2)', () => {
    const arena = createRadialArena(3);
    const actor = createRecruit('actor', 'Philanderer', { faction: 'PLAYER' });
    const target = createRecruit('target', 'Sniper', { faction: 'ENEMY' });

    arena.setTile({ coord: { q: 0, r: 0 }, elevation: 0, isWalkable: true });
    arena.setTile({ coord: { q: 1, r: 0 }, elevation: 0, isWalkable: true });
    arena.setTile({ coord: { q: 2, r: 0 }, elevation: 2, isWalkable: true });

    arena.setUnitPosition('actor', { q: 0, r: 0 });
    arena.setUnitPosition('target', { q: 2, r: 0 });

    const state = createCombatState(arena, [actor, target], 'actor');
    const targetCu = state.units.get('target')!;
    const initialHp = targetCu.currentHp;

    const dice = new MockDiceRoller({ d20Rolls: [18] });
    executeAbility(state, 'actor', TEST_PULL_ABILITY, { targetUnitId: 'target' }, dice);

    expect(arena.getUnitPosition('target')).toEqual({ q: 1, r: 0 });
    // dh = -2 => 8 fall damage
    expect(targetCu.currentHp).toBe(initialHp - 8);
  });

  it('respects displacement immunity on pull while still applying non-displacement effects', () => {
    const arena = createRadialArena(3);
    const actor = createRecruit('actor', 'Philanderer', { faction: 'PLAYER' });
    const target = createRecruit('target', 'Shield-bearer', { faction: 'ENEMY' });

    arena.setUnitPosition('actor', { q: 0, r: 0 });
    arena.setUnitPosition('target', { q: 2, r: 0 });

    const state = createCombatState(arena, [actor, target], 'actor');
    const targetCu = state.units.get('target')!;
    (targetCu as { passives: typeof targetCu.passives }).passives = [UNYIELDING_STANCE];

    const dice = new MockDiceRoller({ d20Rolls: [15] });
    executeAbility(state, 'actor', TEST_PULL_ABILITY, { targetUnitId: 'target' }, dice);

    // Did not move due to Unyielding Stance
    expect(arena.getUnitPosition('target')).toEqual({ q: 2, r: 0 });
    // Still exposed
    expect(targetCu.activeConditions.some((c) => c.type === 'EXPOSED')).toBe(true);
  });
});
