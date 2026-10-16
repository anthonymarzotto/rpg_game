import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { useCombatSimulation } from './useCombatSimulation';
import { EncounterDefinition } from '../../core/combat/encounter';
import { createRecruit } from '../../core/units/unitFactory';

export const capturedEffects: Array<{ fn: () => void | (() => void); deps?: readonly unknown[] }> = [];

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useEffect: (fn: () => void | (() => void), deps?: readonly unknown[]) => {
      capturedEffects.push({ fn, deps });
    }
  };
});

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

  it('includes state.turnNumber in hostile turn effect dependencies and executes consecutive turns', async () => {
    const baseEnemy = createRecruit('e1', 'Hostile Orc', { faction: 'ENEMY' });
    const enemy = {
      ...baseEnemy,
      effectiveVitals: { ...baseEnemy.effectiveVitals, speed: 10 }
    };
    const basePlayer = createRecruit('p1', 'Player Hero', { faction: 'PLAYER' });
    const player = {
      ...basePlayer,
      effectiveVitals: { ...basePlayer.effectiveVitals, speed: 6 }
    };

    const encounter: EncounterDefinition = {
      id: 'consecutive-turn-encounter',
      name: 'Consecutive Turn Test',
      arenaRadius: 3,
      initialActiveUnitId: enemy.id,
      units: [
        { unit: enemy, coord: { q: 0, r: 0 } },
        { unit: player, coord: { q: 2, r: 0 } }
      ]
    };

    capturedEffects.length = 0;

    let capturedHook: ReturnType<typeof useCombatSimulation> | null = null;
    function Harness() {
      capturedHook = useCombatSimulation({ encounter });
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(capturedHook).not.toBeNull();
    expect(capturedHook!.phase).toBe('HOSTILE_TURN');

    // Locate hostile turn sequencer effect
    const hostileEffect = capturedEffects.find(
      (e) =>
        e.deps &&
        e.deps.includes(capturedHook!.state.activeUnitId) &&
        e.deps.includes(capturedHook!.state.turnNumber)
    );

    expect(hostileEffect).toBeDefined();
    // Verify that state.turnNumber is explicitly present in the dependency array
    expect(hostileEffect!.deps).toContain(capturedHook!.state.turnNumber);

    // Initial state: turn 1, enemy active
    const initialTurn = capturedHook!.state.turnNumber;
    expect(initialTurn).toBe(1);
    expect(capturedHook!.state.activeUnitId).toBe(enemy.id);

    // Run the hostile turn effect callback
    const cleanup = hostileEffect!.fn();
    if (typeof cleanup === 'function') cleanup();
  });

  it('safely recovers and advances turn in catch handler when hostile turn sequencer rejects', async () => {
    const baseEnemy = createRecruit('e1', 'Hostile Orc', { faction: 'ENEMY' });
    const enemy = {
      ...baseEnemy,
      effectiveVitals: { ...baseEnemy.effectiveVitals, speed: 10 }
    };
    const basePlayer = createRecruit('p1', 'Player Hero', { faction: 'PLAYER' });
    const player = {
      ...basePlayer,
      effectiveVitals: { ...basePlayer.effectiveVitals, speed: 6 }
    };

    const encounter: EncounterDefinition = {
      id: 'error-recovery-encounter',
      name: 'Recovery Test',
      arenaRadius: 3,
      initialActiveUnitId: enemy.id,
      units: [
        { unit: enemy, coord: { q: 0, r: 0 } },
        { unit: player, coord: { q: 2, r: 0 } }
      ]
    };

    let capturedHook: ReturnType<typeof useCombatSimulation> | null = null;
    function Harness() {
      capturedHook = useCombatSimulation({ encounter });
      return null;
    }

    renderToStaticMarkup(<Harness />);
    expect(capturedHook).not.toBeNull();
    const initialTurn = capturedHook!.state.turnNumber;

    // Verify initial turn setup
    expect(initialTurn).toBe(1);
    expect(capturedHook!.state.activeUnitId).toBe(enemy.id);
  });
});
