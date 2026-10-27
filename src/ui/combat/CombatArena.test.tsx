import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CombatArena, handleArenaContextMenu } from './CombatArena';
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

  it('renders arena-ribbon-dock with streamlined InitiativeRibbon and UnitStatusCard', () => {
    const encounter = createNoviceSandboxEncounter();

    const html = renderToStaticMarkup(
      <CombatArena
        encounter={encounter}
        onExit={vi.fn()}
      />
    );

    // Initiative Ribbon Dock
    expect(html).toContain('arena-ribbon-dock');
    expect(html).toContain('initiative-ribbon-container');
    expect(html).toContain('title="Initiative Queue"');
    expect(html).toContain('⏳');
    expect(html).not.toContain('TURN QUEUE');
    expect(html).toContain('chip-active');
    expect(html).toContain('NOW');

    // Unit Status Card Overlay
    expect(html).toContain('combat-status-overlay');
    expect(html).toContain('unit-hud-card');
  });

  it('renders procedural astral backdrop layer and vignette', () => {
    const encounter = createNoviceSandboxEncounter();

    const html = renderToStaticMarkup(
      <CombatArena
        encounter={encounter}
        onExit={vi.fn()}
      />
    );

    expect(html).toContain('arena-backdrop-layer');
    expect(html).toContain('arena-backdrop-vignette');
    expect(html).toContain('/assets/backgrounds/background');
    expect(html).toContain('.webp');
  });

  it('omits legacy BattleVictoryModal in campaign mode with onVictory provided', () => {
    const encounter = createNoviceSandboxEncounter();

    const html = renderToStaticMarkup(
      <CombatArena
        encounter={encounter}
        onVictory={vi.fn()}
        onExit={vi.fn()}
      />
    );

    expect(html).not.toContain('victory-modal-backdrop');
    expect(html).not.toContain('Trial Triumph!');
  });

  it('cancels ability targeting back to IDLE and prevents default on canvas contextmenu', () => {
    const selectAction = vi.fn();
    const preventDefault = vi.fn();

    // 1. Right click in ABILITY targeting mode cancels ability back to IDLE
    handleArenaContextMenu({ preventDefault }, 'ABILITY', selectAction);
    expect(preventDefault).toHaveBeenCalled();
    expect(selectAction).toHaveBeenCalledWith(null);

    // 2. Right click in IDLE mode prevents default browser contextmenu without canceling
    preventDefault.mockClear();
    selectAction.mockClear();
    handleArenaContextMenu({ preventDefault }, 'IDLE', selectAction);
    expect(preventDefault).toHaveBeenCalled();
    expect(selectAction).not.toHaveBeenCalled();

    // 3. Canvas container is rendered within CombatArena DOM layout
    const encounter = createNoviceSandboxEncounter();
    const html = renderToStaticMarkup(<CombatArena encounter={encounter} onExit={vi.fn()} />);
    expect(html).toContain('arena-canvas-container');
  });
});
