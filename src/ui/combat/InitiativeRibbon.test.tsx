import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { InitiativeRibbon } from './InitiativeRibbon';
import { createRadialArena } from '../../core/grid/templates';
import { createRecruit } from '../../core/units/unitFactory';
import { createCombatState } from '../../core/combat/resolver';

describe('InitiativeRibbon Component', () => {
  function setupTestState() {
    const arena = createRadialArena(3);
    const hero = createRecruit('hero-1', 'Alden', { faction: 'PLAYER' });
    const bandit = createRecruit('bandit-1', 'Bandit A', { faction: 'ENEMY' });

    arena.setUnitPosition('hero-1', { q: -1, r: 0 });
    arena.setUnitPosition('bandit-1', { q: 1, r: 0 });

    const state = createCombatState(arena, [hero, bandit], 'hero-1');
    return { state, hero, bandit };
  }

  it('renders minimalist hourglass anchor without redundant TURN QUEUE text', () => {
    const { state } = setupTestState();

    const html = renderToStaticMarkup(
      <InitiativeRibbon state={state} />
    );

    expect(html).toContain('initiative-ribbon-container');
    expect(html).toContain('initiative-label-box');
    expect(html).toContain('⏳');
    expect(html).not.toContain('TURN QUEUE');
  });

  it('renders projected turns with active NOW badge, turn numbers, and full names without truncation', () => {
    const { state } = setupTestState();

    const html = renderToStaticMarkup(
      <InitiativeRibbon state={state} />
    );

    expect(html).toContain('chip-active');
    expect(html).toContain('NOW');
    expect(html).toContain('chip-turn-index');
    expect(html).toContain('chip-player');
    expect(html).toContain('chip-enemy');
    expect(html).toContain('Alden');
    expect(html).toContain('Bandit A');
  });

  it('applies chip-highlighted class when highlightedUnitId matches', () => {
    const { state } = setupTestState();

    const html = renderToStaticMarkup(
      <InitiativeRibbon
        state={state}
        highlightedUnitId="bandit-1"
        onHoverUnit={vi.fn()}
      />
    );

    expect(html).toContain('chip-enemy chip-highlighted');
    expect(html).not.toContain('chip-player chip-highlighted');
  });

  it('does not apply chip-highlighted when highlightedUnitId is null', () => {
    const { state } = setupTestState();

    const html = renderToStaticMarkup(
      <InitiativeRibbon
        state={state}
        highlightedUnitId={null}
        onHoverUnit={vi.fn()}
      />
    );

    expect(html).not.toContain('chip-highlighted');
  });

  it('renders informative chip tooltip with name, level, class, and HP without raw CTB initiative', () => {
    const { state } = setupTestState();

    const html = renderToStaticMarkup(
      <InitiativeRibbon state={state} />
    );

    // Hero tooltip: Alden • Level 0 Novice • HP: 12/12
    expect(html).toContain('Alden • Level 0 Novice • HP: 12/12');
    expect(html).not.toContain('(Initiative:');
    expect(html).not.toContain('CTB');
  });
});
