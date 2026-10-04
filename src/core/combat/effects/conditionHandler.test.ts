import { describe, it, expect } from 'vitest';
import { conditionHandler } from './conditionHandler';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState } from '../resolver';
import { MockDiceRoller } from '../dice';
import { Ability } from '../../types/ability';
import { HEX_DIRECTIONS } from '../../grid/hex';

describe('conditionHandler', () => {
  it('applies POISON to target with sourceUnitId attribution and damagePerTurn', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero');
    const enemy = createRecruit('enemy', 'Enemy');
    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');
    const actorCu = state.units.get('hero')!;
    const targetCu = state.units.get('enemy')!;

    const ability: Ability = {
      id: 'toxic_shiv',
      name: 'Toxic Shiv',
      description: 'Poisons target',
      archetypeTag: 'ROGUE',
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      range: 1,
      apCost: 2,
      damageType: 'PHYSICAL',
      damageProfile: { count: 1, sides: 4, modifierAttribute: 'finesse' },
      effect: {
        type: 'CONDITION',
        conditionType: 'POISON',
        magnitude: 2,
        durationTurns: 3
      }
    };

    const result = conditionHandler.apply(ability.effect!, {
      state,
      actorCu,
      targetCu,
      ability,
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    expect(targetCu.activeConditions).toHaveLength(1);
    expect(targetCu.activeConditions[0]).toEqual({
      type: 'POISON',
      durationTurns: 3,
      sourceUnitId: 'hero',
      damagePerTurn: 2
    });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      type: 'STATUS_APPLIED',
      targetUnitId: 'enemy',
      condition: {
        type: 'POISON',
        durationTurns: 3,
        sourceUnitId: 'hero',
        damagePerTurn: 2
      }
    });
  });

  it('applies STEALTH to self when conditionType is STEALTH', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero');
    arena.setUnitPosition('hero', { q: 0, r: 0 });

    const state = createCombatState(arena, [hero], 'hero');
    const actorCu = state.units.get('hero')!;

    const ability: Ability = {
      id: 'smoke_veil',
      name: 'Smoke Veil',
      description: 'Vanishes into smoke',
      archetypeTag: 'ROGUE',
      targetType: 'SELF',
      defenseTarget: 'NONE',
      range: 0,
      apCost: 1,
      damageType: 'NONE',
      effect: {
        type: 'CONDITION',
        conditionType: 'STEALTH',
        magnitude: 0,
        durationTurns: 1
      }
    };

    const result = conditionHandler.apply(ability.effect!, {
      state,
      actorCu,
      ability,
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    expect(actorCu.activeConditions).toHaveLength(1);
    expect(actorCu.activeConditions[0]).toEqual({
      type: 'STEALTH',
      durationTurns: 1,
      sourceUnitId: 'hero'
    });
    expect(result.events[0]).toEqual({
      type: 'STATUS_APPLIED',
      targetUnitId: 'hero',
      condition: {
        type: 'STEALTH',
        durationTurns: 1,
        sourceUnitId: 'hero'
      }
    });
  });

  it('forces target to face actor when applying CHALLENGED', () => {
    const arena = createRadialArena(3);
    const knight = createRecruit('knight', 'Knight');
    const enemy = createRecruit('enemy', 'Enemy');
    // Knight at (0, 0), Enemy at (2, 0).
    arena.setUnitPosition('knight', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [knight, enemy], 'knight');
    const actorCu = state.units.get('knight')!;
    const targetCu = state.units.get('enemy')!;

    // Initial enemy facing EAST (away from knight at (0, 0))
    targetCu.facing = HEX_DIRECTIONS.EAST;

    const ability: Ability = {
      id: 'challenging_shout',
      name: 'Challenging Shout',
      description: 'Taunts enemy',
      archetypeTag: 'FIGHTER',
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'NONE',
      range: 3,
      apCost: 2,
      damageType: 'NONE',
      effect: {
        type: 'CONDITION',
        conditionType: 'CHALLENGED',
        magnitude: 0,
        durationTurns: 2
      }
    };

    conditionHandler.apply(ability.effect!, {
      state,
      actorCu,
      targetCu,
      ability,
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    expect(targetCu.activeConditions).toContainEqual({
      type: 'CHALLENGED',
      durationTurns: 2,
      sourceUnitId: 'knight'
    });
    // From (2, 0) looking at (0, 0) is WEST (direction 3)
    expect(targetCu.facing).toBe(HEX_DIRECTIONS.WEST);
  });
});
