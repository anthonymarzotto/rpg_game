# Proposal

## Why

Debugging AI behaviors, combat edge cases, and unexpected action faults currently requires manually piecing together sparse combat logs and UI screenshots. When an AI unit makes an unexpected choice—such as banking AP instead of attacking, prioritizing an unexpected hex, or failing action validation—the internal candidate evaluations, scores, and decision rationale are discarded at runtime. Furthermore, if an unhandled runtime error occurs, the trial state is lost with no mechanism to copy or recreate the failure state.

Providing a structured export mechanism allows players and developers to instantly copy a high-signal Markdown report into chat or extract a complete JSON snapshot that can be hydrated locally into the pure combat simulation engine to re-simulate, inspect candidate evaluations, and reproduce edge cases.

## What Changes

- **AI Decision Telemetry**: Extend AI decision evaluation (`decideNextActionWithTrace` / decision trace collection) to capture the winning action alongside the top alternative candidates evaluated (action type, target, score, and component score breakdown) and record them into the encounter's decision trace history.
- **Trial State Serialization & Hydration**: Implement pure `serializeCombatState` and `deserializeCombatState` utilities that unpack internal `Map` structures (`Arena.tiles`, `Arena.unitPositions`, `units`) into plain JSON-serializable payloads and reconstruct a fully operational `CombatState` ready for headless re-simulation.
- **Diagnostic Markdown Report Generator**: Create a pure helper that formats the active combat state, combatant vitals, position grid, active faults, recent AI decision candidate comparisons, and combat logs into a clean, human-and-LLM-readable Markdown report optimized for pasting into chat.
- **In-Arena Export Modal & Trigger**: Add an `Export Trial` button to the `CombatArena` top bar opening a modal offering 1-click "Copy Markdown Summary" and "Copy / Download Full JSON".
- **Trial Error Boundary**: Wrap the combat arena in a React error boundary that intercepts uncaught runtime errors, rendering a fallback card with the error details and an immediate "Copy Crash Report & State" button.

## Capabilities

### New Capabilities
- `trial-diagnostics-export`: State serialization, headless re-simulation hydration, AI decision candidate telemetry, and in-game export modal with error boundary fallback.

### Modified Capabilities
<!-- None: existing combat and AI specs continue operating unchanged -->

## Impact
- Core AI Engine (`src/core/ai/decisionEngine.ts`, `src/core/ai/types.ts`): Exposes decision candidate tracing and scoring breakdown.
- Combat State & Grid (`src/core/combat/types.ts`, `src/core/grid/arena.ts`, `src/core/combat/stateSerializer.ts`): Serializer/deserializer for `CombatState`.
- Combat UI (`src/ui/combat/CombatArena.tsx`, `src/ui/combat/useCombatSimulation.ts`, `src/ui/combat/asyncTurnSequencer.ts`): Export button, modal, error boundary, and telemetry observer hookup.
