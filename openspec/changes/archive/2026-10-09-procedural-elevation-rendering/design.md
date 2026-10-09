# Design

## Context

Phases 6.1 and 6.2 introduced the discrete elevation model ($h \in [0, 3]$), step costs ($1 + \max(0, \Delta h)$ MP), ledge drop fall damage ($|\Delta h| \times 4$), 3D line-of-sight raycasting, and combat modifiers (ranged reach/attack roll bonuses and plunging knockback). However, the SVG battlefield (`HexGridSvg.tsx`) currently renders flat 2D polygons with no vertical relief or depth sorting, and `encounterGenerator.ts` generates flat arenas without elevation.

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/procedural-elevation-rendering/proposal.md) for motivation and problem statement.

## Goals / Non-Goals

**Goals:**
- Project hex tiles upward in screen coordinates based on elevation: $y_{\text{projected}} = y_{\text{flat}} - (h \times 14\text{px})$.
- Render procedural extruded prism side walls beneath elevated tiles with directional isometric gradient shading for tactile 3D relief.
- Implement Painter's algorithm depth sorting (North-to-South / back-to-front) so foreground elevated plateaus cleanly occlude background hexes and units.
- Project unit standees and target indicators to match their tile's elevated surface.
- Render elevation badges (`+1`, `+2`) on elevated hexes and display a prominent `⚠️ Fall Hazard: -X HP` preview on hovered reachable tiles that incur unmitigated fall damage.
- Guarantee that units and hexes situated behind elevated terrain remain clearly visible (via standee height ratios, silhouette outlines, and dynamic see-through cutaways) and fully clickable (via `pointer-events: none` on prism walls and interactive top-layer z-indexing).
- Expand standard encounter arenas to Radius 4 (61 hexes) for Stage 3+ and implement procedural multi-peak terraced elevation generation in `encounterGenerator.ts` with guaranteed traversable connectivity.

**Non-Goals:**
- Free-form 3D camera rotation or full WebGL/Three.js rendering (remains lightweight 2.5D SVG).
- Dynamic real-time terrain destruction or terraforming during combat.
- Multi-story indoor roof layers or overlapping bridges.

## Decisions

### 1. Mathematical Projection & Extruded Prism Geometry
- **Offset Constant**: Set `ELEVATION_Y_OFFSET = 14` pixels per elevation level.
- **Top Face Projection**: The top surface hex polygon is centered at $(x, y - h \times 14)$.
- **Extruded Prism Side Faces**:
  In pointy-topped hexes with vertices $V_0 \dots V_5$ ($V_2$ South, $V_1$ Southeast, $V_3$ Southwest), the edges facing toward the viewer / camera are:
  - Southeast face: Quad bounded by $V_1 \dots V_2$ top and $V_1 \dots V_2$ bottom.
  - Southwest face: Quad bounded by $V_2 \dots V_3$ top and $V_2 \dots V_3$ bottom.
  - Side edges: Dropping to flat base $y_{\text{flat}}$ (or adjacent neighbor elevation).
- **Directional Shading**:
  Simulate top-left directional lighting:
  - Top surface: Base hex fill.
  - Southeast face: Moderately shaded (e.g. 20-30% darker).
  - Southwest face: Deeply shaded (e.g. 40-50% darker).
  - Subtle edge highlight borders between top surface and extruded faces.

*Alternative Considered*: Pure flat border thickness styling. Rejected because extruded shaded polygon quads provide visceral physical presence and clear ledge perception.

### 2. Depth Sorting Architecture (Painter's Algorithm)
- **Tiles & Walls**: Sort all arena tiles by their base floor coordinate $y_{\text{flat}}$ ascending (North to South). When rendering, background tiles are drawn first, followed by foreground tiles. Elevated foreground tiles and their downward-extruded prism walls naturally paint over and occlude background hexes.
- **Tokens**: Unit standees are sorted by their visual base anchor Y coordinate: $y_{\text{token\_base}} = y_{\text{flat}} - (h \times 14) + \text{offset}$, ensuring foreground units naturally occlude background units and cliffs.

*Alternative Considered*: Rendering tiles and units in a single interleaved flat list. Kept SVG layer grouping (`tiles-layer`, `units-layer`, `overlays-layer`) with internal depth-sorting per layer, which preserves clean event bubbling and styling while achieving authentic 2.5D occlusion.

### 3. Procedural Multi-Peak Terracing in `encounterGenerator.ts`
- **Arena Sizing**:
  - Stage 1–2: Radius 3 arena (37 hexes) for compact introductory skirmishes.
  - Stage 3+: Radius 4 arena (61 hexes) providing ample space for multi-peak topography.
- **Peak Seeding & Flood-Fill**:
  - Seed 1 to 2 random peak foci at $h = 2$ in the interior zone (distance 1–2 from center).
  - Flood-fill surrounding adjacent hexes with terrace height $h = 1$.
  - Remaining hexes default to valley low ground $h = 0$.
  - Allow natural cliff edges where $h=2$ directly borders $h=0$ ($\Delta h = 2$), creating strategic ledges for kinetic displacement.
- **Deployment Zones & Traversable Connectivity**:
  - West deployment hexes (player) and East deployment hexes (enemy) are assigned safe initial elevations ($h = 0$ or $1$).
  - Connectivity validation checks that a valid path exists between West and East spawns with no impassable single-step rises ($\Delta h \ge 3$) or impassable obstacle bottlenecks. If disconnected, bottleneck hexes are graded down to $h=1$ or $h=0$.

*Alternative Considered*: Completely random noise (Perlin/simplex). Rejected because small hex grids (radius 3–4) produce fragmented single-tile spikes with Perlin noise; discrete multi-peak focal flood-fill creates structured, readable terraces and dramatic battle plateaus.

### 4. Hazard & Elevation UI Indicators
- **Contour Badges**: Elevated tiles render a subtle badge (`+1`, `+2`) in their upper corner or on hover, ensuring elevation is legible at a glance even with color-blindness or low contrast.
- **Fall Hazard Preview**: In `HexGridSvg.tsx` and `useCombatSimulation.ts`, when in `MOVE` mode, hovering a reachable tile computes `findPathInfo(activeCoord, hoveredCoord)`. If `pathInfo.fallDamage > 0`, render a glowing `⚠️ Fall Hazard: -X HP` badge on the destination hex and preview card.

### 5. Occlusion Visibility & Clickability Behind Elevated Terrain
- **Scale Proportions & Standee Height**:
  - Elevation step offset is 14px per level ($h=1 \rightarrow 14\text{px}$, $h=2 \rightarrow 28\text{px}$).
  - Hex row-to-row spacing is 57px ($1.5 \times R$).
  - Standees are 60px tall with nameplates, AP pips, and health bars extending upwards another 20px (total visual height ~80px).
  - When a unit stands on low ground behind an elevated plateau ($h=2$, 28px lift), the unit's head, floating nameplate, and health bar extend 50px above the plateau surface, guaranteeing they are never fully hidden.
- **Silhouette Occlusion Highlight**:
  - For units situated behind higher elevated terrain, render high-contrast silhouette styling (cyan glowing contour for players, amber/crimson for enemies) ensuring the full standee contour is instantly legible.
- **Dynamic See-Through Cutaway**:
  - When the player hovers over an occluded tile or when an occluded unit is targeted/selected, the foreground elevated hex and its prism side walls reduce opacity (`opacity: 0.35` glassmorphism cutaway), exposing the hidden ground and unit beneath.
- **Click Target Protection**:
  - Extruded 3D prism side walls are strictly marked `className="pointer-events-none"`. They never swallow mouse hover or click events intended for the tiles in front or behind them.
  - Over 70% of any background hex top surface remains unoccluded by geometry.
  - In `MOVE` and `ABILITY` modes, valid destination tiles (`isReachable` and `candidateTargetCoords`) render interactive glowing selection rings that capture mouse events with high priority.

## Risks / Trade-offs

- **[Risk] Extruded walls overlapping clickable areas of neighboring tiles** → **Mitigation**: Prism side walls have `pointer-events: none` and hover/click handlers attach exclusively to top hex polygon surfaces.
- **[Risk] High elevation shifting tiles beyond SVG viewBox** → **Mitigation**: Update dynamic viewBox computation in `HexGridSvg.tsx` to include `ELEVATION_Y_OFFSET * maxElevation` in vertical bounds calculation and top padding.
- **[Risk] Procedural cliffs trapping units in deployment** → **Mitigation**: Explicit connectivity check validates path from player spawn to enemy spawn; bottlenecks are automatically relaxed before finalizing the encounter definition.
- **[Risk] Units or hexes occluded by cliffs confusing player navigation** → **Mitigation**: Standees protrude above intermediate ledges, occluded units feature silhouette contour highlights, and hovering occluded hexes triggers see-through cutaway transparency.
