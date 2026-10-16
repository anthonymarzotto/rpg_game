import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CombatArena } from './CombatArena';
import { createNoviceSandboxEncounter } from '../../data/encounters/noviceSandbox';

describe('CombatArena', () => {
  it('Task 5.3: renders Export Trial button, encounter header, and is protected by TrialErrorBoundary', () => {
    const encounter = createNoviceSandboxEncounter();

    const html = renderToStaticMarkup(
      <CombatArena
        encounter={encounter}
        onExit={vi.fn()}
      />
    );

    // Header & controls
    expect(html).toContain('Astral Trial');
    expect(html).toContain('Novice Astral Trial');
    expect(html).toContain('Export Trial');
    expect(html).toContain('data-testid="btn-open-trial-export"');
    expect(html).toContain('Reset Trial');

    // Arena container & canvas
    expect(html).toContain('combat-arena-container');
    expect(html).toContain('testbed-top-bar');
  });
});
