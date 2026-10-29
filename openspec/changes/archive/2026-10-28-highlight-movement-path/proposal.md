# Proposal

## Why

During combat in `MOVE` action mode, players can see the cluster of reachable hexes, but hovering over a destination tile only displays the destination tile itself and a text-based fall hazard warning badge if applicable. Players have no visual feedback on the exact path their unit will traverse around terrain obstacles or across elevation terraces. 

Because combat mechanics rely on directional heading and field-of-view arcs (180° front arc vs. 120° flank blind spots, such as dynamic stealth detection during multi-step movement), the lack of path visualization creates ambiguity about which intermediate tiles are stepped on and where elevation plunges occur.

Implementing a luminous movement trajectory trail solves this ambiguity, delivers immediate tactile clarity to spatial positioning, and fulfills UX item **UX.1** from the active plan.

## What Changes

- Add an interactive SVG movement path layer (`movement-path-layer`) to `HexGridSvg.tsx`, positioned above terrain tiles but below unit standees and pedestals.
- Render a dual-stroke luminous energy filament connecting projected 3D hex centers along the planned path from `movePreview.path`.
- Render subtle glowing waypoint nodes (beads) at each intermediate step along the trajectory and a distinct landing reticle at the destination tile.
- Dynamically segment the trajectory:
  - Standard safe steps ($\Delta h \ge -1$) render in luminous cyan (`#38bdf8`).
  - Hazardous ledge drops ($\Delta h \le -2$) switch the plunging segment to vibrant warning crimson (`#ef4444`) with a hazard bead, visually anchoring the existing destination `⚠️ Fall Hazard` warning badge.
- Add CSS animations in `CombatArena.css` for subtle streaming dash flow along the active path.

## Version Bump Rationale

- **Current Version**: `0.7.2`
- **Target Version**: `0.8.0` (`minor`)
- **Rationale**: This change introduces a new user-facing capability (interactive 3D movement path trail with cliff-drop hazard segmentation) in the combat arena interface without modifying or breaking existing data models or core simulation APIs. According to Semantic Versioning for initial development (0.y.z), new backwards-compatible features increment the minor version.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `arena-timeline-ux`: Adds a requirement for interactive movement path preview and cliff hazard segmentation in `MOVE` mode.

## Impact

- **UI / Arena SVG**: `src/ui/combat/HexGridSvg.tsx` renders the new `movement-path-layer` using `movePreview.path`.
- **CSS Styling**: `src/ui/combat/CombatArena.css` adds styling and animated dash keyframes for `.movement-path-line` and `.movement-path-hazard`.
- **Tests**: `src/ui/combat/HexGridSvg.test.tsx` adds unit test coverage for movement path rendering, waypoint nodes, and hazard color switches.
