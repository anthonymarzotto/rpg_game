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
});
