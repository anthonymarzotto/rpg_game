import { describe, it, expect } from 'vitest';
import { ctbDelayHandler } from './ctbDelayHandler';
import { createRadialArena } from '../../grid/templates';
import { createRecruit } from '../../units/unitFactory';
import { createCombatState } from '../resolver';
import { MockDiceRoller } from '../dice';
import { Ability } from '../../types/ability';

describe('ctbDelayHandler', () => {
  const dummyAbility: Ability = {
    id: 'pommel_strike',
    name: 'Pommel Strike',
    description: 'Delays enemy initiative',
    archetypeTag: 'FIGHTER',
    targetType: 'SINGLE_TARGET',
    defenseTarget: 'EVASION',
    range: 1,
    apCost: 2,
    damageType: 'PHYSICAL',
    effects: [
      {
        type: 'DAMAGE',
        damageProfile: { count: 1, sides: 6, modifierAttribute: 'force' }
      },
      {
        type: 'CTB_DELAY',
        magnitude: 25
      }
    ]
  };

  it('reduces target initiativeGauge by magnitude and dispatches CTB_DELAY event', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero');
    const enemy = createRecruit('enemy', 'Enemy');
    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');
    const targetCu = state.units.get('enemy')!;
    targetCu.initiativeGauge = 60;

    const result = ctbDelayHandler.apply(dummyAbility.effects[1], {
      state,
      actorCu: state.units.get('hero')!,
      targetCu,
      ability: dummyAbility,
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    expect(targetCu.initiativeGauge).toBe(35);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toEqual({
      type: 'CTB_DELAY',
      targetUnitId: 'enemy',
      amount: 25
    });
  });

  it('floors target initiativeGauge at 0 when delay exceeds current gauge', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero');
    const enemy = createRecruit('enemy', 'Enemy');
    arena.setUnitPosition('hero', { q: 0, r: 0 });
    arena.setUnitPosition('enemy', { q: 1, r: 0 });

    const state = createCombatState(arena, [hero, enemy], 'hero');
    const targetCu = state.units.get('enemy')!;
    targetCu.initiativeGauge = 10;

    const result = ctbDelayHandler.apply(dummyAbility.effects[1], {
      state,
      actorCu: state.units.get('hero')!,
      targetCu,
      ability: dummyAbility,
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    expect(targetCu.initiativeGauge).toBe(0);
    expect(result.events[0]).toEqual({
      type: 'CTB_DELAY',
      targetUnitId: 'enemy',
      amount: 25
    });
  });

  it('returns empty events if targetCu is undefined', () => {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero', 'Hero');
    const state = createCombatState(arena, [hero], 'hero');

    const result = ctbDelayHandler.apply(dummyAbility.effects[1], {
      state,
      actorCu: state.units.get('hero')!,
      targetCu: undefined,
      ability: dummyAbility,
      hitOutcome: 'SOLID_HIT',
      diceRoller: new MockDiceRoller()
    });

    expect(result.events).toEqual([]);
  });
});
