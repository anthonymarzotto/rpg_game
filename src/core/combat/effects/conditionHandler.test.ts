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
      effects: [
        {
          type: 'DAMAGE',
          damageProfile: { count: 1, sides: 4, modifierAttribute: 'finesse' }
        },
        {
          type: 'CONDITION',
          conditionType: 'POISON',
          magnitude: 2,
          durationTurns: 3
        }
      ]
    };

    const result = conditionHandler.apply(ability.effects[1], {
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
      effects: [
        {
          type: 'CONDITION',
          conditionType: 'STEALTH',
          magnitude: 0,
          durationTurns: 1
        }
      ]
    };

    const result = conditionHandler.apply(ability.effects[0], {
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

  it('forces target to face actor when applying FORCE_FACING', () => {
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
      effects: [
        {
          type: 'FORCE_FACING'
        }
      ]
    };

    conditionHandler.apply(ability.effects[0], {
      state,
      actorCu,
      targetCu,
      ability,
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    // From (2, 0) looking at (0, 0) is WEST (direction 3)
    expect(targetCu.facing).toBe(HEX_DIRECTIONS.WEST);
  });

  it('does not force target facing when applying CHALLENGED condition without FORCE_FACING', () => {
    const arena = createRadialArena(3);
    const knight = createRecruit('knight', 'Knight');
    const enemy = createRecruit('enemy', 'Enemy');
    arena.setUnitPosition('knight', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 2, r: 0 });

    const state = createCombatState(arena, [knight, enemy], 'knight');
    const actorCu = state.units.get('knight')!;
    const targetCu = state.units.get('enemy')!;

    targetCu.facing = HEX_DIRECTIONS.EAST;

    const effect = {
      type: 'CONDITION' as const,
      conditionType: 'CHALLENGED' as const,
      durationTurns: 2
    };

    conditionHandler.apply(effect, {
      state,
      actorCu,
      targetCu,
      ability: {
        id: 'taunt',
        name: 'Taunt',
        description: 'Taunts',
        archetypeTag: 'FIGHTER',
        targetType: 'SINGLE_TARGET',
        defenseTarget: 'NONE',
        range: 3,
        apCost: 1,
        damageType: 'NONE',
        effects: []
      },
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    // Facing remains EAST because pure condition application does not manipulate spatial facing
    expect(targetCu.facing).toBe(HEX_DIRECTIONS.EAST);
    expect(targetCu.activeConditions).toHaveLength(1);
    expect(targetCu.activeConditions[0].type).toBe('CHALLENGED');
  });

  it('implements Taunt Steal (OVERRIDE_SOURCE) when CHALLENGED is applied by a new unit', () => {
    const arena = createRadialArena(3);
    const knight1 = createRecruit('knight1', 'Knight 1');
    const knight2 = createRecruit('knight2', 'Knight 2');
    const goblin = createRecruit('goblin', 'Goblin');

    arena.setUnitPosition('knight1', { q: 0, r: 0 });
    arena.setUnitPosition('knight2', { q: 1, r: 0 });
    arena.setUnitPosition('goblin', { q: 2, r: 0 });

    const state = createCombatState(arena, [knight1, knight2, goblin], 'knight1');
    const k1Cu = state.units.get('knight1')!;
    const k2Cu = state.units.get('knight2')!;
    const gobCu = state.units.get('goblin')!;

    const ability = {
      id: 'taunt',
      name: 'Taunt',
      description: 'Taunt',
      archetypeTag: 'FIGHTER',
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'NONE',
      range: 3,
      apCost: 1,
      damageType: 'NONE'
    } as Ability;

    // Knight 1 taunts goblin for 2 turns
    conditionHandler.apply(
      { type: 'CONDITION', conditionType: 'CHALLENGED', durationTurns: 2 },
      { state, actorCu: k1Cu, targetCu: gobCu, ability, hitOutcome: 'SOLID_HIT', diceRoller: new MockDiceRoller() }
    );
    expect(gobCu.activeConditions).toHaveLength(1);
    expect(gobCu.activeConditions[0].sourceUnitId).toBe('knight1');
    expect(gobCu.activeConditions[0].durationTurns).toBe(2);

    // Knight 2 taunts goblin for 3 turns (Taunt Steal)
    conditionHandler.apply(
      { type: 'CONDITION', conditionType: 'CHALLENGED', durationTurns: 3 },
      { state, actorCu: k2Cu, targetCu: gobCu, ability, hitOutcome: 'SOLID_HIT', diceRoller: new MockDiceRoller() }
    );

    // Should retain single CHALLENGED condition updated to Knight 2
    expect(gobCu.activeConditions).toHaveLength(1);
    expect(gobCu.activeConditions[0].sourceUnitId).toBe('knight2');
    expect(gobCu.activeConditions[0].durationTurns).toBe(3);
  });

  it('stacks POISON damage intensity (STACK_INTENSITY) up to maximum cap of 8', () => {
    const arena = createRadialArena(3);
    const rogue = createRecruit('rogue', 'Rogue');
    const enemy = createRecruit('enemy', 'Enemy');
    const state = createCombatState(arena, [rogue, enemy], 'rogue');
    const actorCu = state.units.get('rogue')!;
    const targetCu = state.units.get('enemy')!;

    const ability = {
      id: 'poison_dart',
      name: 'Poison Dart',
      description: 'Poison',
      archetypeTag: 'ROGUE',
      targetType: 'SINGLE_TARGET',
      defenseTarget: 'EVASION',
      range: 2,
      apCost: 1,
      damageType: 'PHYSICAL'
    } as Ability;

    // Stack 1: 3 damage, 2 turns
    conditionHandler.apply(
      { type: 'CONDITION', conditionType: 'POISON', magnitude: 3, durationTurns: 2 },
      { state, actorCu, targetCu, ability, hitOutcome: 'SOLID_HIT', diceRoller: new MockDiceRoller() }
    );
    expect(targetCu.activeConditions).toHaveLength(1);
    expect(targetCu.activeConditions[0].damagePerTurn).toBe(3);
    expect(targetCu.activeConditions[0].durationTurns).toBe(2);

    // Stack 2: 3 damage, 4 turns -> intensity becomes 6, duration becomes 4
    conditionHandler.apply(
      { type: 'CONDITION', conditionType: 'POISON', magnitude: 3, durationTurns: 4 },
      { state, actorCu, targetCu, ability, hitOutcome: 'SOLID_HIT', diceRoller: new MockDiceRoller() }
    );
    expect(targetCu.activeConditions).toHaveLength(1);
    expect(targetCu.activeConditions[0].damagePerTurn).toBe(6);
    expect(targetCu.activeConditions[0].durationTurns).toBe(4);

    // Stack 3: 4 damage -> capped at 8 max intensity
    conditionHandler.apply(
      { type: 'CONDITION', conditionType: 'POISON', magnitude: 4, durationTurns: 2 },
      { state, actorCu, targetCu, ability, hitOutcome: 'SOLID_HIT', diceRoller: new MockDiceRoller() }
    );
    expect(targetCu.activeConditions).toHaveLength(1);
    expect(targetCu.activeConditions[0].damagePerTurn).toBe(8);
    expect(targetCu.activeConditions[0].durationTurns).toBe(4);
  });
});
