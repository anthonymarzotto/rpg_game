# Design

## Context

See `proposal.md` for motivation.

In the current architecture:
- `useCombatSimulation.ts` computes `movePreview` whenever the player is in `MOVE` action mode and hovering a reachable tile. `movePreview` contains `{ destination, cost, fallDamage, path }` where `path` is an ordered list of `HexCoord` instances from the unit's position to the destination.
- `HexGridSvg.tsx` renders the battlefield using a 2.5D isometric projection where each hex coordinate is mapped to 2D pixel coordinates via `hexToPixel(coord)` and offset vertically for elevation via `projectElevationY(basePixel.y, elevation)`.
- Currently, `HexGridSvg.tsx` receives `movePreview` but only renders a text warning badge on the destination tile when `movePreview.fallDamage > 0`. The intermediate steps and trajectory line are not rendered.

## Goals / Non-Goals

**Goals:**
- Render a luminous, animated movement path connecting each step along `movePreview.path`.
- Seamlessly transition vertical heights when climbing or descending terraces using `projectElevationY`.
- Differentiate safe steps ($\Delta h \ge -1$) from hazardous cliff drops ($\Delta h \le -2$) by switching the plunging segment from cyan to warning crimson.
- Place the path layer above terrain surfaces but below unit standees and token pedestals.
- Maintain 60fps hover responsiveness with pure SVG declarative rendering.

**Non-Goals:**
- Modifying A* pathfinding heuristics, edge costs, or movement rules in `arena.ts`.
- Rendering directional heading arrows at every intermediate step (per explore mode alignment).
- Waypoint drag-and-drop or custom path rerouting.

## Decisions

### Decision 1: Layer Placement in SVG DOM Hierarchy
* **Choice**: Insert `<g className="movement-path-layer">` directly between `<g className="tiles-layer">` and `<g className="standees-layer">`.
* **Rationale**: This ensures the trail flows cleanly across the tops of the hex surfaces and over extruded prism walls, but stays beneath unit standees and selection rings. Units appear to naturally walk *along* the path without lines bisecting character portraits.
* **Alternatives Considered**:
  - *Rendering inside each tile polygon*: Fragmented, unable to cleanly connect across elevation steps.
  - *Rendering on top of standees*: Distracting visual artifact where lines cut through tokens.

### Decision 2: Segmented Rendering vs. Single Polyline
* **Choice**: Render the path as individual step segments connecting point $\mathbf{P}_{i-1}$ to $\mathbf{P}_i$, rather than a single uniform `<polyline>`.
* **Rationale**: Segmenting allows each individual step to inspect its elevation delta $\Delta h = h_i - h_{i-1}$. If $\Delta h \le -2$, only that specific step segment renders in warning crimson (`#ef4444`) with a hazard bead, while preceding and succeeding safe steps remain luminous cyan (`#38bdf8`).
* **Alternatives Considered**:
  - *Single `<polyline>`*: Cannot conditionally color specific hazardous cliff drops along an otherwise safe multi-step route.

### Decision 3: Dual-Stroke Visual Treatment & Waypoints
* **Choice**: Each segment renders an outer glow filter (`strokeWidth: 5`, `opacity: 0.4`, `filter: url(#tile-glow-cyan)`) and an inner core line (`strokeWidth: 2`) with an animated dash array (`strokeDasharray: 6 4`). Intermediate hex centers display waypoint beads (`<circle r="3.5" />`).
* **Rationale**: Creates a tactile, high-contrast visual trail that stands out clearly against dark slate tiles while matching the game's astral neon aesthetic.

## Risks / Trade-offs

- **[Risk: Visual noise on crowded battlefields]** → **Mitigation**: The path only displays when the cursor actively hovers over a valid reachable tile in `MOVE` mode; it immediately dismisses when the cursor leaves or when entering ability targeting.
- **[Risk: Elevation offset mismatch]** → **Mitigation**: Every waypoint derives its coordinate using the exact `projectElevationY(basePixel.y, elevation)` helper used by tile surfaces, ensuring pixel-perfect alignment.
