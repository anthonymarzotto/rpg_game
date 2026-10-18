import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HexGridSvg } from './HexGridSvg';
import { createRadialArena } from '../../core/grid/templates';
import { createRecruit } from '../../core/units/unitFactory';
import { createCombatState } from '../../core/combat/resolver';
import { HexCoord } from '../../core/grid/hex';

describe('HexGridSvg 2.5D Elevation & Tactical Rendering', () => {
  function setupTestState(elevations: Record<string, number> = {}) {
    const arena = createRadialArena(3);
    for (const [key, elev] of Object.entries(elevations)) {
      const [q, r] = key.split(',').map(Number);
      const tile = arena.getTile({ q, r });
      if (tile) {
        arena.setTile({ ...tile, elevation: elev });
      }
    }

    const player = createRecruit('p1', 'Alden', { faction: 'PLAYER' });
    const enemy = createRecruit('e1', 'Goblin', { faction: 'ENEMY' });
    arena.setUnitPosition('p1', { q: -1, r: 0 });
    arena.setUnitPosition('e1', { q: 1, r: 0 });

    const state = createCombatState(arena, [player, enemy], 'p1');
    return { arena, state, player, enemy };
  }

  it('renders dynamic viewBox that includes elevation headroom', () => {
    const { state } = setupTestState({ '0,-2': 2 });
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('viewBox="');
    expect(html).toContain('arena-hex-svg');
  });

  it('renders extruded prism side walls with pointer-events-none for elevated tiles', () => {
    const { state } = setupTestState({ '0,0': 2 });
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    // Prism walls container with pointer-events-none
    expect(html).toContain('class="prism-walls pointer-events-none"');
    // Wall gradient references
    expect(html).toContain('url(#prism-wall-sw)');
    expect(html).toContain('url(#prism-wall-se)');
  });

  it('renders elevation contour badges on elevated tiles', () => {
    const { state } = setupTestState({ '0,0': 1, '1,0': 2 });
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('elevation-badge');
    expect(html).toContain('+1');
    expect(html).toContain('+2');
  });

  it('renders Fall Hazard warning badge on hovered reachable tile when move inflicts fall damage', () => {
    const { state } = setupTestState();
    const destination: HexCoord = { q: 0, r: 1 };
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[destination]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={destination}
        floatingTexts={[]}
        targetPreview={null}
        movePreview={{
          destination,
          cost: 2,
          fallDamage: 8,
          path: [{ q: -1, r: 0 }, destination]
        }}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('fall-hazard-badge');
    expect(html).toContain('⚠️ Fall Hazard: -8 HP');
  });

  it('applies see-through cutaway transparency to foreground tiles occluding hovered tile', () => {
    // Hovered tile at (0, -1) with h=0
    // Foreground tile at (0, 0) with h=2 (south of hovered tile)
    const { state } = setupTestState({ '0,0': 2, '0,-1': 0 });
    const hovered: HexCoord = { q: 0, r: -1 };
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={hovered}
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('cutaway-translucent');
    expect(html).toContain('opacity:0.35');
  });

  it('applies high-visibility occlusion glow filter to units positioned behind cliffs', () => {
    // Enemy at (1, 0) with h=0, tile directly south at (0, 1) has h=2
    const { state } = setupTestState({ '0,1': 2 });
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    // Occlusion glow filter for enemy
    expect(html).toContain('url(#standee-occlusion-glow-enemy)');
  });

  it('renders ruins stone icon and label badge on obstacle tiles without legacy overlay text', () => {
    const arena = createRadialArena(3);
    const tile = arena.getTile({ q: 0, r: 1 });
    if (tile) {
      arena.setTile({ ...tile, isWalkable: false, label: 'RUINS' });
    }
    const player = createRecruit('p1', 'Alden', { faction: 'PLAYER' });
    const enemy = createRecruit('e1', 'Goblin', { faction: 'ENEMY' });
    arena.setUnitPosition('p1', { q: -1, r: 0 });
    arena.setUnitPosition('e1', { q: 1, r: 0 });
    const state = createCombatState(arena, [player, enemy], 'p1');

    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('obstacle-ruins-glyph');
    expect(html).toContain('>RUINS<');
    expect(html).not.toContain('>BLOCK<');
  });
});

