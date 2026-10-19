import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { TrialErrorBoundary } from './TrialErrorBoundary';
import { createRadialArena } from '../../core/grid/templates';
import { createCombatState } from '../../core/combat/resolver';
import { Unit } from '../../core/types/unit';

function createMockUnit(id: string, name: string): Unit {
  return {
    id,
    name,
    gender: 'male',
    race: 'human',
    faction: 'PLAYER',
    progression: {
      unitId: id,
      currentLevel: 1,
      archetypePoints: { fighter: 1, rogue: 0, mage: 0 },
      constellation: [],
      milestoneSelections: {}
    },
    baseAttributes: { force: 10, finesse: 10, focus: 10 },
    effectiveVitals: {
      maxHp: 30,
      maxAp: 4,
      armor: 2,
      ward: 1,
      speed: 10,
      move: 3,
      evasion: 10,
      resolve: 10
    },
    loadout: {
      activeClassId: 'novice',
      wildcardAbilityIds: [],
      wildcardPassiveIds: []
    },
    starterAbilityIds: []
  };
}

function NormalChild() {
  return <div data-testid="normal-child">Active Arena Running</div>;
}

describe('TrialErrorBoundary', () => {
  it('Task 5.2: renders children normally when no exception occurs', () => {
    const arena = createRadialArena(2);
    const hero = createMockUnit('hero', 'Valen');
    const state = createCombatState(arena, [hero], hero.id);

    const html = renderToStaticMarkup(
      <TrialErrorBoundary state={state}>
        <NormalChild />
      </TrialErrorBoundary>
    );

    expect(html).toContain('Active Arena Running');
    expect(html).not.toContain('Trial Interrupted by Error');
  });

  it('Task 5.2: catches render exception and renders diagnostic error fallback card', () => {
    const arena = createRadialArena(2);
    const hero = createMockUnit('hero', 'Valen');
    const state = createCombatState(arena, [hero], hero.id);

    // Suppress console.error in test runner output for expected test error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // In renderToStaticMarkup, exceptions bubble unless caught by the component instance or static helper
    // We can verify static getDerivedStateFromError directly and the error UI rendering:
    const errorState = TrialErrorBoundary.getDerivedStateFromError(new Error('Explosion during unit rendering'));
    expect(errorState.hasError).toBe(true);
    expect(errorState.error?.message).toBe('Explosion during unit rendering');

    const boundary = new TrialErrorBoundary({
      children: <NormalChild />,
      state,
      encounterName: 'Danger Trial',
      onReset: vi.fn()
    });
    // Set simulated error state
    (boundary as any).state = {
      hasError: true,
      error: new Error('Explosion during unit rendering'),
      copyFeedback: null
    };

    const rendered = boundary.render() as ReactElement;
    const html = renderToStaticMarkup(rendered);

    expect(html).toContain('Trial Interrupted by Error');
    expect(html).toContain('Explosion during unit rendering');
    expect(html).toContain('Copy Crash Report &amp; State');
    expect(html).toContain('Download State JSON');
    expect(html).toContain('Reset Trial');

    consoleSpy.mockRestore();
  });
});
