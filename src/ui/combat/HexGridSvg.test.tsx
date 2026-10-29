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

  it('renders lifted path hexes, stepping stone lips, and step number badges when movePreview has a multi-step path', () => {
    const { state } = setupTestState();
    const destination: HexCoord = { q: 1, r: 0 };
    const intermediate: HexCoord = { q: 0, r: 0 };
    const origin: HexCoord = { q: -1, r: 0 };
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
          fallDamage: 0,
          path: [origin, intermediate, destination]
        }}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('path-step-tile');
    expect(html).toContain('stepping-stone-lip');
    expect(html).toContain('lifted-tile-cap');
    expect(html).toContain('path-step-badge');
    expect(html).toContain('path-step-safe');
    expect(html).toContain('path-step-destination');
    expect(html).toContain('data-testid="path-step-badge-1"');
    expect(html).toContain('data-testid="path-step-badge-2"');
    expect(html).toContain('path-dest-ring');
  });

  it('renders path-step-hazard badge and hazard warning when a step plunges down a cliff (dh <= -2)', () => {
    // origin at (-1, 0) h=2, destination at (0, 0) h=0 -> dh = -2 (cliff drop)
    const { state } = setupTestState({ '-1,0': 2, '0,0': 0 });
    const origin: HexCoord = { q: -1, r: 0 };
    const destination: HexCoord = { q: 0, r: 0 };
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
          cost: 1,
          fallDamage: 8,
          path: [origin, destination]
        }}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('path-step-hazard');
    expect(html).toContain('⚠️1');
    expect(html).toContain('fall-hazard-badge');
  });

  it('does not render path-step badges or stepping stone lips when movePreview is null or has fewer than 2 coordinates', () => {
    const { state } = setupTestState();
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        movePreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).not.toContain('path-step-badge');
    expect(html).not.toContain('stepping-stone-lip');
    expect(html).not.toContain('path-step-tile');
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

  it('renders ruins stone icon, pixel standee image, and label badge on obstacle tiles', () => {
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
    // Renders pixel standee image tag with 68x68 dimensions and drop-shadow filter
    expect(html).toMatch(/<image[^>]+href="[^"]*assets\/objects\/ruins\/rotations\/[a-z-]+\.png"[^>]+width="68"[^>]+height="68"/);
    expect(html).toContain('class="pixel-art"');
    expect(html).toContain('filter="url(#standee-drop-shadow)"');
  });

  it('translates ruins standee image vertically on elevated obstacle tiles', () => {
    const arena = createRadialArena(3);
    const flatTile = arena.getTile({ q: 0, r: 1 });
    const elevatedTile = arena.getTile({ q: 1, r: 1 });
    if (flatTile) {
      arena.setTile({ ...flatTile, elevation: 0, isWalkable: false, label: 'RUINS' });
    }
    if (elevatedTile) {
      arena.setTile({ ...elevatedTile, elevation: 2, isWalkable: false, label: 'RUINS' });
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

    // Matches image tags across both obstacle tiles
    const imageMatches = [...html.matchAll(/<image[^>]+y="(-?\d+)"[^>]+width="68"/g)];
    expect(imageMatches.length).toBeGreaterThanOrEqual(2);
    const yValues = imageMatches.map((m) => parseInt(m[1], 10));
    // The elevated tile (elevation 2 -> offset -28px) has a lower screen Y coordinate
    expect(Math.min(...yValues)).toBeLessThan(Math.max(...yValues));
  });

  it('falls back to vector pillars when obstacle has no pixel assets available', () => {
    const arena = createRadialArena(3);
    const tile = arena.getTile({ q: 0, r: 1 });
    if (tile) {
      arena.setTile({ ...tile, isWalkable: false, label: 'CRYSTAL_BARRIER' });
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
    expect(html).toContain('>CRYSTAL_BARRIER<');
    // Vector fallback pillars present
    expect(html).toContain('<line');
  });

  it('renders 6-direction facing compass ring when facingCompassCoord matches active unit', () => {
    const { state } = setupTestState();
    // In setupTestState, 'p1' is at (-1, 0) and is activeUnitId
    const onSelectFacing = vi.fn();

    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        facingCompassCoord={{ q: -1, r: 0 }}
        onSelectFacing={onSelectFacing}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    // Compass ring and 6 chevrons are rendered in top-level overlay
    expect(html).toContain('data-testid="facing-compass-overlay"');
    expect(html).toContain('data-testid="facing-compass-ring"');
    expect(html).toContain('compass-orbit-track');
    expect(html).toContain('data-testid="facing-chevron-0"');
    expect(html).toContain('data-testid="facing-chevron-1"');
    expect(html).toContain('data-testid="facing-chevron-2"');
    expect(html).toContain('data-testid="facing-chevron-3"');
    expect(html).toContain('data-testid="facing-chevron-4"');
    expect(html).toContain('data-testid="facing-chevron-5"');

    // Unit initially faces EAST (0), so chevron 0 is active
    expect(html).toContain('facing-chevron-group active" data-testid="facing-chevron-0"');
    // Other chevrons are inactive
    expect(html).toContain('facing-chevron-group inactive" data-testid="facing-chevron-1"');
  });

  it('does not render facing compass ring when facingCompassCoord is null or differs from active unit', () => {
    const { state } = setupTestState();

    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        floatingTexts={[]}
        targetPreview={null}
        facingCompassCoord={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).not.toContain('data-testid="facing-compass-ring"');
  });

  it('renders astral hover halo and bright white name when highlightedUnitId matches', () => {
    const { state } = setupTestState();

    // Highlight player 'p1'
    const playerHtml = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        highlightedUnitId="p1"
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(playerHtml).toContain('data-testid="unit-hover-halo-p1"');
    expect(playerHtml).toContain('stroke="#38bdf8"');
    expect(playerHtml).toContain('unit-highlighted');
    expect(playerHtml).toContain('fill="#ffffff"');

    // Highlight enemy 'e1'
    const enemyHtml = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        highlightedUnitId="e1"
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(enemyHtml).toContain('data-testid="unit-hover-halo-e1"');
    expect(enemyHtml).toContain('stroke="#f87171"');
    expect(enemyHtml).toContain('unit-highlighted');
  });

  it('does not render astral hover halo when highlightedUnitId is null', () => {
    const { state } = setupTestState();

    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        highlightedUnitId={null}
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).not.toContain('unit-hover-halo');
    expect(html).not.toContain('unit-highlighted');
  });

  it('renders primary first name for player units and full title for enemy units on standee plates', () => {
    const arena = createRadialArena(3);
    const player = createRecruit('p1', 'Alden Dawnseeker', { faction: 'PLAYER' });
    const enemy = createRecruit('e1', 'Ash Novice', { faction: 'ENEMY' });
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

    // Player renders first name only
    expect(html).toContain('>Alden<');
    expect(html).not.toContain('>Alden Dawnseeker<');

    // Enemy renders full title
    expect(html).toContain('>Ash Novice<');
  });

  it('renders celestial selection ring unit-pinned-ring around pinned combatant', () => {
    const { state } = setupTestState();
    const html = renderToStaticMarkup(
      <HexGridSvg
        state={state}
        reachableCoords={[]}
        abilityRangeCoords={[]}
        candidateTargetCoords={[]}
        hoveredCoord={null}
        pinnedUnitId="e1"
        floatingTexts={[]}
        targetPreview={null}
        onTileClick={vi.fn()}
        onTileHover={vi.fn()}
      />
    );

    expect(html).toContain('unit-pinned-ring');
  });

  it('renders interactive standee status bubble with rich condition tooltip text', () => {
    const { state } = setupTestState();
    const enemyCu = state.units.get('e1')!;
    enemyCu.activeConditions = [
      {
        type: 'CHALLENGED',
        durationTurns: 2,
        sourceUnitId: 'p1'
      }
    ];

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

    expect(html).toContain('standee-status-bubble');
    expect(html).toContain('data-testid="standee-status-bubble-e1"');
    expect(html).toContain('standee-tooltip-popup');
    expect(html).toContain('condition-rich-tooltip');
    expect(html).toContain('CHALLENGED');
    expect(html).toContain('2 turns remaining');
    expect(html).toContain('Source: Alden');
    expect(html).toContain('Must attack Alden');
  });
});


