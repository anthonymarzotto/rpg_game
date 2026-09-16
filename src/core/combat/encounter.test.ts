import { describe, it, expect } from 'vitest';
import { buildEncounterState, EncounterDefinition } from './encounter';
import { createRecruit } from '../units/unitFactory';

describe('Encounter Builder System', () => {
  it('instantiates a CombatState with placed units and tile overrides', () => {
    const hero = createRecruit('hero', 'Hero');
    const goblin = createRecruit('goblin', 'Goblin');

    const encounter: EncounterDefinition = {
      id: 'test-skirmish',
      name: 'Test Skirmish',
      arenaRadius: 2,
      tileOverrides: [
        { coord: { q: 0, r: 1 }, isWalkable: false, elevation: 3 }
      ],
      units: [
        { unit: hero, coord: { q: 0, r: 0 } },
        { unit: goblin, coord: { q: 1, r: 0 } }
      ],
      initialActiveUnitId: 'hero'
    };

    const state = buildEncounterState(encounter);

    expect(state.activeUnitId).toBe('hero');
    expect(state.units.size).toBe(2);

    // Units positioned correctly
    expect(state.arena.getUnitPosition('hero')).toEqual({ q: 0, r: 0 });
    expect(state.arena.getUnitPosition('goblin')).toEqual({ q: 1, r: 0 });

    // Tile override applied
    const obstacleTile = state.arena.getTile({ q: 0, r: 1 });
    expect(obstacleTile?.isWalkable).toBe(false);
    expect(obstacleTile?.elevation).toBe(3);

    // Active unit has 3 AP initialized
    const heroCu = state.units.get('hero');
    expect(heroCu?.currentAp).toBe(3);
  });

  it('defaults to radius 3 and advances clock if no initialActiveUnitId is given', () => {
    const unitA = createRecruit('unitA', 'Unit A');
    const unitB = createRecruit('unitB', 'Unit B');

    const encounter: EncounterDefinition = {
      id: 'default-arena',
      name: 'Default Arena',
      units: [
        { unit: unitA, coord: { q: 0, r: 0 } },
        { unit: unitB, coord: { q: 1, r: 0 } }
      ]
    };

    const state = buildEncounterState(encounter);
    // Radius 3 tile exists
    expect(state.arena.getTile({ q: 3, r: 0 })).toBeDefined();
    expect(state.arena.getTile({ q: 4, r: 0 })).toBeUndefined();

    // Clock advanced to first active unit
    expect(state.activeUnitId.length).toBeGreaterThan(0);
    expect(state.turnNumber).toBeGreaterThan(0);
  });
});
