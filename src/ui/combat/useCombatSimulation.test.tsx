import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCombatSimulation } from './useCombatSimulation';
import { EncounterDefinition } from '../../core/combat/encounter';
import { createRecruit } from '../../core/units/unitFactory';

describe('useCombatSimulation movePreview & fall hazard detection', () => {
  function createElevatedTestEncounter(): EncounterDefinition {
    const player = createRecruit('p1', 'Alden', { faction: 'PLAYER' });
    const enemy = createRecruit('e1', 'Goblin', { faction: 'ENEMY' });

    return {
      id: 'test-elevation-encounter',
      name: 'Cliff Trial',
      arenaRadius: 3,
      tileOverrides: [
        { coord: { q: 0, r: 0 }, elevation: 2 },
        { coord: { q: 0, r: 1 }, elevation: 0 }
      ],
      units: [
        { unit: player, coord: { q: 0, r: 0 } },
        { unit: enemy, coord: { q: 2, r: 0 } }
      ]
    };
  }

  it('provides null movePreview in IDLE mode', () => {
    let capturedHook: ReturnType<typeof useCombatSimulation> | null = null;
    function Harness() {
      capturedHook = useCombatSimulation({ encounter: createElevatedTestEncounter() });
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(capturedHook).not.toBeNull();
    expect(capturedHook!.actionMode).toBe('IDLE');
    expect(capturedHook!.movePreview).toBeNull();
  });

  it('includes distance 4 tiles and candidate targets when player has high ground vantage', () => {
    const player = createRecruit('p1', 'Alden', { faction: 'PLAYER' });
    const enemy = createRecruit('e1', 'Goblin', { faction: 'ENEMY' });

    const ability = {
      id: 'test_spark',
      name: 'Spark',
      description: 'Arcane spark',
      range: 3,
      apCost: 1,
      targetType: 'SINGLE_TARGET' as const,
      damageType: 'MAGICAL' as const,
      defenseTarget: 'RESOLVE' as const,
      effects: []
    };

    const vantageEncounter: EncounterDefinition = {
      id: 'vantage-encounter',
      name: 'Vantage Encounter',
      arenaRadius: 5,
      initialActiveUnitId: 'p1',
      tileOverrides: [
        { coord: { q: 0, r: 0 }, elevation: 2 },
        { coord: { q: 4, r: 0 }, elevation: 0 }
      ],
      units: [
        { unit: player, coord: { q: 0, r: 0 } },
        { unit: enemy, coord: { q: 4, r: 0 } }
      ]
    };

    let capturedHook: ReturnType<typeof useCombatSimulation> | null = null;
    function Harness() {
      capturedHook = useCombatSimulation({
        encounter: vantageEncounter,
        initialActionMode: 'ABILITY',
        initialSelectedAbility: ability
      });
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(capturedHook).not.toBeNull();
    expect(capturedHook!.actionMode).toBe('ABILITY');

    const hasTileInRange = capturedHook!.abilityRangeCoords.some(
      (c) => c.q === 4 && c.r === 0
    );
    expect(hasTileInRange).toBe(true);

    const hasEnemyAsCandidate = capturedHook!.candidateTargetCoords.some(
      (c) => c.q === 4 && c.r === 0
    );
    expect(hasEnemyAsCandidate).toBe(true);
  });
});
