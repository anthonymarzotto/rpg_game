# Design: Post-Move Facing Compass

## Context

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/post-move-facing-compass/proposal.md) for motivation.

The underlying combat domain model already has complete support for directional facing:
- `CombatUnit.facing` is an integer `HexDirection` (0 to 5) on pointy-topped hexes.
- `getFacingAngleDegrees(facing)` rotates assets at angles `[0, 300, 240, 180, 120, 60]`.
- `getCombatArc` computes `FRONT`, `FLANK`, and `REAR` relative to `cu.facing`.
- Attacking units automatically face their target upon action resolution in `resolver.ts`.

Currently, `executeMove` in `src/core/combat/resolver.ts` auto-assigns `cu.facing` to the movement vector of the final step, leaving the unit with no immediate way to adjust their defensive stance without moving again or attacking.

## Goals / Non-Goals

**Goals:**
- Provide a headless `executeSetFacing(state, actorUnitId, facing)` function in `src/core/combat/resolver.ts` that updates facing for 0 AP during the active unit's turn.
- Introduce an interactive, non-modal SVG compass ring rendered around the active unit token in `HexGridSvg.tsx` when a move completes.
- Ensure zero-friction turn flow: the player can click any of the 6 chevrons to pivot, or immediately select an ability / click End Turn to proceed without mandatory confirmation steps.
- Maintain clean decoupling between the compass ring hitboxes and regular arena tile selection.

**Non-Goals:**
- In-place turning during `IDLE` mode without prior movement (deferred to roadmap Future Small Enhancements).
- Combat arc tile shading / tinting on the field (deferred to roadmap Future Small Enhancements).
- Modifying AI opponent turn sequencing or facing heuristics.

## Decisions

### 1. Dedicated `executeSetFacing` Resolver vs. Overloaded `executeMove`
- **Choice**: Dedicated `executeSetFacing(state, actorUnitId, facing)` function.
- **Rationale**: Keeps movement resolution and facing adjustment cleanly decoupled. When the player clicks different chevrons on the compass ring to experiment with orientations, each click invokes `executeSetFacing` for 0 AP without needing to re-evaluate pathfinding, AP deductions, or displacement triggers.
- **Alternatives Considered**: Passing an optional `facing?: HexDirection` into `executeMove`. Rejected because it would require modal pre-selection before moving or re-executing move logic on every chevron click.

### 2. Chevron Hit Targets vs. Adjacent Hex Clicks
- **Choice**: The 6 discrete SVG chevrons on the compass ring serve as the sole click targets for facing.
- **Rationale**: Prevents conflicts with board inspection. Clicking empty board tiles or other units dismisses the compass and allows natural board inspection, while clicking a chevron unambiguously sets orientation.
- **Alternatives Considered**: Clicking any adjacent hex to face it. Rejected because it would prevent clicking adjacent ally/enemy units or tiles for inspection while the compass is open.

### 3. State Management in `useCombatSimulation.ts`
- **Choice**: Add `facingCompassCoord: HexCoord | null` to combat simulation state.
- **Rationale**: Set to `destination` upon successful move execution. When `facingCompassCoord` is non-null and `actionMode === 'IDLE'`, `HexGridSvg` renders the compass ring. Any state transition (selecting an ability, entering `MOVE` mode, clicking End Turn, or clicking outside) clears `facingCompassCoord` to `null`.
- **Alternatives Considered**: Creating a new `'FACING'` `ActionMode`. Rejected because it would require extra state transitions and cancel buttons when the player just wants to select an ability or end their turn.

## Visual Design of Compass Ring

- **Position & Radius**: Centered at the active unit's screen coordinates, floating at radius $r \approx 30\text{px}$ (outside token base $22\text{px}$, well inside hex tile $48\text{px}$).
- **Chevrons**: 6 directional polygons pointing outward along angles `0°, 60°, 120°, 180°, 240°, 300°`.
- **Active Chevron**: Highlighted in cyan (`#38bdf8`) with an astral drop-shadow/glow.
- **Inactive Chevrons**: Semi-transparent slate (`rgba(148, 163, 184, 0.45)`), brightening to cyan-white on `:hover`.
- **Hit Padding**: Each chevron has an invisible padded SVG `<circle>` or `<polygon>` (`pointer-events: all`, `fill: transparent`) with a minimum 20px hit diameter to ensure comfortable clickability.

## Risks / Trade-offs

- **Risk: Small SVG hit areas causing misclicks** → *Mitigation*: Render transparent hit-area backings with 20px+ diameter around each chevron to ensure generous click tolerances.
- **Risk: Compass cluttering board if player steps away** → *Mitigation*: Clicking anywhere outside the chevrons on the arena immediately dismisses the ring. Selecting any action in `ActionBar` also dismisses it instantly.
