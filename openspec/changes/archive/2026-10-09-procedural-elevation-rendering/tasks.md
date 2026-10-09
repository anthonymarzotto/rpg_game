# Tasks

## 1. 2.5D Extruded Prism Geometry & Depth-Sorted SVG Rendering

- [x] 1.1 Implement elevation vertical projection offset ($y_{\text{projected}} = y_{\text{flat}} - h \times 14\text{px}$) and directional extruded prism wall polygon calculations (South, Southeast, and Southwest faces with directional relief shading) in `src/ui/combat/` and verify with unit tests.
- [x] 1.2 Implement back-to-front Painter's algorithm depth sorting in `HexGridSvg.tsx` with `pointer-events-none` on prism walls, unit silhouette/visibility styling for units behind cliffs, and dynamic see-through cutaway transparency when hovering occluded tiles, verifying occlusion and clickability via tests.
- [x] 1.3 Add elevation contour badges (`+1`, `+2`, `+3`) to elevated tiles and update dynamic SVG viewBox calculation to account for vertical elevation offsets, verifying viewBox bounds and badge rendering via tests.

## 2. Movement Fall Hazard Preview

- [x] 2.1 Update `useCombatSimulation.ts` to compute and expose path traversal fall damage metadata when hovering reachable tiles during `MOVE` mode, and verify path hazard detection via unit tests.
- [x] 2.2 Render the `⚠️ Fall Hazard: -X HP` warning badge on hovered reachable tiles in `HexGridSvg.tsx` when a route requires a cliff plunge ($\Delta h \le -2$), and verify warning badge rendering via tests.

## 3. Procedural Multi-Peak Terraced Encounter Generator

- [x] 3.1 Expand encounter arena generation in `src/core/campaign/encounterGenerator.ts` to use Radius 4 arenas (61 hexes) for Stage 3+ while preserving Radius 3 for early trials, and verify deployment coordinates and tile counts via unit tests.
- [x] 3.2 Implement procedural terraced elevation generation in `encounterGenerator.ts` seeding 1–2 peak foci ($h=2$), flood-filling surrounding terraces ($h=1$), and leaving low-ground valleys ($h=0$) with sheer cliff drop-offs, and verify height distribution via unit tests.
- [x] 3.3 Implement traversable pathfinding connectivity verification between player West deployment spawns and enemy East deployment spawns across elevation changes, verifying guaranteed reachable paths via unit tests.

## 4. End-to-End Verification & Full Regression

- [x] 4.1 Update testbed encounters or add integration tests demonstrating terraced multi-peak arenas with 2.5D elevation rendering and unit token alignment, verifying combat flow.
- [x] 4.2 Run the full test suite (`npm test`) and OpenSpec validation (`openspec validate`) to ensure all tests pass with zero regressions.
