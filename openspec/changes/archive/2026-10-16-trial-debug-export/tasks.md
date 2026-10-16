# Tasks

## 1. AI Decision Telemetry & Types

- [x] 1.1 Define `AICandidateEvaluation`, `AIDecisionTrace`, and `SerializedCombatState` types in `src/core/ai/types.ts` and `src/core/combat/types.ts`, and verify via `cmd.exe /c npm test`.
- [x] 1.2 Implement `decideNextActionWithTrace` in `src/core/ai/decisionEngine.ts` capturing the winning action and top evaluated candidate alternatives (with scores and sub-reasons), maintaining pass-through backwards compatibility for `decideNextAction`, and verify via unit tests in `src/core/ai/decisionEngine.test.ts`.

## 2. Combat State Serialization & Hydration

- [x] 2.1 Implement `serializeCombatState` and `deserializeCombatState` in `src/core/combat/stateSerializer.ts` unpacking `Arena` tiles/positions and `units` Map structures into JSON-safe payloads, and verify with round-trip equality unit tests in `src/core/combat/stateSerializer.test.ts`.
- [x] 2.2 Verify headless re-simulation by executing `decideNextActionWithTrace` on a deserialized state and asserting identical decision scoring in `src/core/combat/stateSerializer.test.ts`.


## 3. Diagnostic Markdown Report Generator

- [x] 3.1 Implement `generateTrialMarkdownReport` in `src/core/combat/reportGenerator.ts` formatting active encounter metadata, combatant vitals, grid coordinates, active faults/errors, recent AI candidate score diffs, and combat log excerpts, and verify with unit tests in `src/core/combat/reportGenerator.test.ts`.


## 4. Sequencer & Simulation State Integration

- [x] 4.1 Update `src/ui/combat/asyncTurnSequencer.ts` and `src/ui/combat/useCombatSimulation.ts` to record AI decision traces into `state.aiDecisionLog` during hostile turns, capturing action faults when pre-validation fails, and verify with unit tests in `src/ui/combat/asyncTurnSequencer.test.ts`.


## 5. UI Export Modal & Error Boundary

- [x] 5.1 Implement `TrialExportModal` in `src/ui/combat/TrialExportModal.tsx` and `.css` offering "Copy Markdown Summary", "Download JSON", and "Copy JSON" with clipboard feedback and textarea fallback, and verify with component unit tests in `src/ui/combat/TrialExportModal.test.tsx`.

- [x] 5.2 Implement `TrialErrorBoundary` in `src/ui/combat/TrialErrorBoundary.tsx` and `.css` catching unhandled render exceptions and rendering a diagnostic card with crash details and a "Copy Crash Report" button, and verify with unit tests in `src/ui/combat/TrialErrorBoundary.test.tsx`.

- [x] 5.3 Integrate the `Export Trial` button and `TrialExportModal` into the `CombatArena` top bar, wrap the view with `TrialErrorBoundary`, and verify interactive behavior with tests in `src/ui/combat/CombatArena.test.tsx`.

