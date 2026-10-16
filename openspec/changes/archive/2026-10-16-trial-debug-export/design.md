# Design

## Context

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/trial-debug-export/proposal.md) for motivation.

The combat system currently models in-battle encounters via `CombatState` ([src/core/combat/types.ts](file:///c:/Repos/rpg_game/src/core/combat/types.ts)), which encapsulates an `Arena` instance ([src/core/grid/arena.ts](file:///c:/Repos/rpg_game/src/core/grid/arena.ts)) and a `Map<string, CombatUnit>`. Hostile AI actions are generated sequentially via `decideNextAction` ([src/core/ai/decisionEngine.ts](file:///c:/Repos/rpg_game/src/core/ai/decisionEngine.ts)) and executed asynchronously in the UI via `asyncTurnSequencer.ts` ([src/ui/combat/asyncTurnSequencer.ts](file:///c:/Repos/rpg_game/src/ui/combat/asyncTurnSequencer.ts)).

While `decideNextAction` scores all legal candidate abilities, moves, and AP conservation options, alternative candidates are discarded upon function exit. Additionally, native `Map` structures in `CombatState` serialize to `{}` under `JSON.stringify`, preventing direct state extraction.

## Goals / Non-Goals

**Goals:**
- Provide deterministic serialization (`serializeCombatState`) and hydration (`deserializeCombatState`) that converts `CombatState` to/from JSON-compatible structures for headless re-simulation and test fixture generation.
- Capture AI candidate evaluation traces (chosen action + top 3–5 candidate alternatives with scores and sub-reasons) during hostile turns.
- Format active encounter telemetry into an LLM-friendly Markdown diagnostic report summarizing unit vitals, positions, active faults, and AI candidate comparisons.
- Integrate an accessible `Export Trial` modal in `CombatArena` supporting one-click clipboard copying and JSON download.
- Protect the arena with a `TrialErrorBoundary` capable of capturing uncaught render errors and exporting crash diagnostics.

**Non-Goals:**
- Full event-sourced match replay from Turn 1 (recording every human click and roll stream). Snapshot re-simulation at the current turn provides the necessary fidelity without input-recording complexity.
- Remote telemetry backend or analytics reporting. All exports remain client-side and clipboard/file driven.

## Decisions

### Decision 1: Snapshot-Based Re-simulation over Full Match Replay
- **Choice**: Export the current `CombatState` snapshot rather than an event-sourced action log from Turn 1.
- **Rationale**: `decideNextAction` and all combat resolvers are pure functions of `CombatState`. The state at Turn $N$ already encapsulates all prior damage, AP usage, positioning, and status effects. Hydrating that snapshot in Node/Vitest allows running `decideNextAction(hydratedState, actorId)` to reproduce candidate scoring, LoS calculations, or action execution faults directly.
- **Alternatives Considered**: Full turn-by-turn input replay log. Rejected due to high complexity, requiring roll stream recording, UI action event sourcing, and version drift fragility.

### Decision 2: Pure Candidate Tracing with Backwards Compatibility
- **Choice**: Introduce `decideNextActionWithTrace(state, actorUnitId, options)` returning `{ action: AIAction, trace: AIDecisionTrace }`. Retain `decideNextAction` as a backwards-compatible pass-through returning `action`.
- **Rationale**: Existing tests and callers continue working without modification. Turn sequencers can call `decideNextActionWithTrace` to record telemetry.
- **Trace Structure**:
  ```ts
  export interface AICandidateEvaluation {
    readonly type: 'MOVE' | 'ABILITY' | 'CONSERVE_AP';
    readonly action: AIAction;
    readonly score: number;
    readonly reason: string;
    readonly rank: number;
  }

  export interface AIDecisionTrace {
    readonly turnNumber: number;
    readonly actorUnitId: string;
    readonly actorName: string;
    readonly profile: AIProfile;
    readonly weights: AIArchetypeWeights;
    readonly currentAp: number;
    readonly chosenAction: AIAction;
    readonly topCandidates: readonly AICandidateEvaluation[];
    readonly totalCandidatesEvaluated: number;
    readonly apConservationThreshold: number;
    readonly timestamp: number;
    readonly faultReason?: string;
  }
  ```

### Decision 3: Storage of Decision Traces in `CombatState`
- **Choice**: Add an optional `aiDecisionLog?: AIDecisionTrace[]` field to `CombatState`.
- **Rationale**: `CombatState` is the single source of truth passed through `useCombatSimulation` and state reducers. Storing traces directly on state ensures they are automatically bundled when serializing or re-simulating without needing external context providers.

### Decision 4: Serialization and Hydration Architecture
- **Choice**: Create `src/core/combat/stateSerializer.ts` exposing:
  - `serializeCombatState(state: CombatState): SerializedCombatState`
  - `deserializeCombatState(serialized: SerializedCombatState): CombatState`
- **Mapping**:
  - `Arena`: Unpacks tiles via `arena.getAllTiles()` and positions via `Array.from(unitPositions)`. Deserialization instantiates `new Arena(tiles)` and sets unit positions.
  - `units`: Converts `Map<string, CombatUnit>` to `Record<string, CombatUnit>` and back.
  - Primitives and logs: Cloned cleanly.

### Decision 5: Two-Tier Diagnostic Export Experience
- **Choice**: The export modal provides:
  1. **Markdown Diagnostic Report**: Optimized for copying directly into chat with AI coding assistants. Contains active turn context, active faults, combatant vitals table, and recent AI candidate scoring comparisons.
  2. **Raw JSON Snapshot**: Formatted JSON download/copy for deep reproduction scripts.
- **Fallback**: Clipboard copy uses `navigator.clipboard.writeText` with textarea fallback and visual toast feedback.

### Decision 6: Combat Arena Error Boundary
- **Choice**: Implement `TrialErrorBoundary` wrapping `CombatArena` in `src/ui/combat/TrialErrorBoundary.tsx`.
- **Rationale**: If a React rendering exception occurs (e.g., malformed SVG, missing asset, or undefined property), the error boundary catches it, prevents the screen from going blank, displays the exception message, and provides an immediate button to copy the crash report with the last known combat state.

## Risks / Trade-offs

- **[Risk] High memory usage from decision traces across long encounters**
  - *Mitigation*: Cap `topCandidates` to the top 5 evaluated actions per decision step, and retain a maximum of 50 decision traces in `aiDecisionLog`.
- **[Risk] Incomplete state hydration if new CombatState fields are added in future changes**
  - *Mitigation*: Unit test `serializeCombatState` -> `deserializeCombatState` round-trip equality against full mock encounters to enforce schema synchronization.
- **[Risk] Clipboard access restrictions in non-HTTPS / embedded iframe environments**
  - *Mitigation*: Implement legacy `document.execCommand('copy')` fallback and a selectable read-only modal `<textarea>`.
