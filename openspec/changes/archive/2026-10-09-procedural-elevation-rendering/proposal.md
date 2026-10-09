# Proposal

## Why

Phases 6.1 and 6.2 implemented the spatial rules, pathfinding, 3D line-of-sight raycasting, and combat modifiers for discrete hex elevation ($h \in [0, 3]$). However, the combat UI currently renders the arena as a flat 2D projection with no vertical visual relief, and procedural encounter generation generates purely flat arenas ($h = 0$). To realize the tactical depth of high-ground vantage, plunging knockback, and cliff hazards, players need tactile 2.5D visual feedback, and encounters need procedural multi-peak terraced topography.

## What Changes

- **2.5D Extruded SVG Hex Prisms**:
  - Project hex tile positions upward along the screen Y-axis based on elevation: $y_{\text{projected}} = y_{\text{flat}} - (h \times 14\text{px})$.
  - Render procedural extruded prism side walls (South, Southeast, and Southwest faces) beneath elevated tiles using darker directional CSS gradient shading for tactile 3D relief.
  - Project unit tokens and targeting elements to align with their tile's elevated surface.
- **Back-to-Front Depth Sorting (Painter's Algorithm)**:
  - Sort tiles and extruded side walls in visual depth order (North to South / back-to-front) so elevated foreground plateaus cleanly occlude lower background hexes.
  - Ensure unit standees and overlays respect spatial depth ordering relative to foreground cliffs and terrain.
- **Elevation Badges & Fall Hazard Previews**:
  - Render crisp elevation level markers and contour badges (`+1`, `+2`, `+3`) on elevated tiles, hover states, and selection reticles.
  - Display a prominent `⚠️ Fall Hazard: -X HP` preview indicator when hovering reachable tiles whose optimal path involves an unmitigated ledge plunge ($\Delta h \le -2$).
- **Radius 4 Multi-Peak Procedural Arenas**:
  - Expand standard procedural encounter arenas to Radius 4 (61 hexes, ~9 hexes across) for Stage 3+ encounters to accommodate dynamic topography while supporting compact radius 3 arenas for early trials.
  - Implement a procedural terrain generator in `encounterGenerator.ts` that seeds 1–2 elevated peak foci ($h = 2$), flood-fills intermediate terraces ($h = 1$), carves low valleys ($h = 0$), introduces sheer drop cliff edges, and places obstacle ruins.
  - Enforce traversable pathfinding connectivity between West player deployment and East enemy deployment zones across elevation changes.

## Capabilities

### New Capabilities
- `elevation-rendering`: Faux-3D SVG extruded prism rendering, elevation Y-projection, directional prism wall shading, back-to-front depth sorting, elevation badges, and move-mode fall hazard UI preview badges.

### Modified Capabilities
- `encounter-generation`: Expand arena generation to produce procedural multi-peak terraced topography with elevation levels, cliff drop-offs, and verified traversable connectivity between player and enemy deployment zones.

## Impact

- **UI Components**: `src/ui/combat/HexGridSvg.tsx`, `src/ui/combat/CombatArena.tsx`, and associated CSS styles.
- **Campaign / Generation**: `src/core/campaign/encounterGenerator.ts` and `src/core/combat/encounter.ts`.
- **Combat Simulation Hook**: `src/ui/combat/useCombatSimulation.ts` to surface path preview fall hazard metadata to the SVG renderer and status card.
- **Dependencies**: No external library additions; uses native React SVG and pure TypeScript procedural generation.
