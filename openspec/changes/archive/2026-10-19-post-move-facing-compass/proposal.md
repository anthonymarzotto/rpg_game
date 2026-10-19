# Proposal: Post-Move Facing Compass

## Why

In tactical hex combat, directional facing determines front, flank, and rear defense arcs, backstab damage vulnerability, and hit probabilities. Currently, when a player moves their unit, the unit's facing direction is automatically locked to the vector of their final movement step. This frequently leaves the unit's flank or rear exposed to nearby enemies with no opportunity to reorient without taking another action. Introducing an intuitive, zero-friction post-move facing compass lets players deliberately choose their final defensive orientation immediately after moving, eliminating accidental rear exposure while maintaining brisk combat pacing.

## What Changes

- **Core Combat Resolver**:
  - Add `executeSetFacing(state: CombatState, actorUnitId: string, facing: HexDirection): void` to set the active unit's facing orientation for 0 AP during their active turn.
- **Combat Simulation State Machine**:
  - Track an active post-move facing state (`pendingFacingCoord` or active compass flag) upon completing a move action.
  - Automatically dismiss the compass ring when an ability is selected, another move is initiated, the turn is ended, or an empty tile is clicked.
  - Expose a `selectFacing(direction: HexDirection)` handler.
- **Arena Hex Grid Presentation (`HexGridSvg`)**:
  - Render a discrete 6-chevron directional compass ring hovering around the active unit token ($r \approx 28\text{px} - 36\text{px}$) when facing selection is active.
  - Highlight the currently active facing direction in glowing cyan (`#38bdf8`), with translucent slate styling for the other 5 directions that brighten on hover.
  - Clicking any chevron sets unit facing with immediate visual feedback (token sprite rotates to match).

## Capabilities

### New Capabilities
- `tactical-facing-control`: Defines post-move directional orientation control, including the 0-AP facing resolution rule, the 6-chevron compass interaction lifecycle, and dismissal behaviors.

### Modified Capabilities
*(None — existing combat arc and traversal mechanics are preserved without altering core movement cost or attack resolution requirements).*

## Impact

- **Core Files**: `src/core/combat/resolver.ts` (adds `executeSetFacing`).
- **UI Simulation**: `src/ui/combat/useCombatSimulation.ts` (facing ring state and intent dispatch).
- **Presentation**: `src/ui/combat/HexGridSvg.tsx`, `src/ui/combat/CombatArena.tsx`, and `HexGridSvg.css` (SVG compass chevrons, animations, and hover feedback).
- **Tests**: New unit tests in `src/core/combat/facing.test.ts`, `src/ui/combat/useCombatSimulation.test.tsx`, and `src/ui/combat/HexGridSvg.test.tsx`.
