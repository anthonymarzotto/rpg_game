# Tasks

## 1. Engine & AI Decision Resilience

- [x] 1.1 Update `src/core/ai/decisionEngine.ts` to check `getEffectiveAbility(ability, cu.abilityModifiers).apCost` rather than base `ability.apCost` in immediate ability and composite move evaluation, and add unit test in `src/core/ai/decisionEngine.test.ts`. Verify with `npm test`.
- [x] 1.2 Wrap `executeAiTurn` action execution in `src/core/ai/decisionEngine.ts` with error handling so that an unexpected action failure halts the step loop and safely concludes the turn with `endActiveTurn`. Verify unit tests pass with `npm test`.

## 2. Headless Turn Sequencer Resilience & Fallback

- [x] 2.1 Update `executeHostileTurnAsync` in `src/ui/combat/asyncTurnSequencer.ts` to pre-validate proposed actions (`canMove` / `canExecuteAbility`) and wrap execution in `try / catch / finally` such that validation failures record an alert in `combatLog`, emit floating text, conserve remaining AP, and unconditionally call `endActiveTurn` and `observer?.onTurnCompleted` in `finally`.
- [x] 2.2 Add unit tests in `src/ui/combat/asyncTurnSequencer.test.ts` verifying that an invalid AI action (e.g., illegal destination or uncastable ability) falls back to AP banking without throwing, concludes the turn cleanly, and triggers observer callbacks. Verify with `npm test`.

## 3. UI Reactivity for Consecutive Turns

- [x] 3.1 Update `src/ui/combat/useCombatSimulation.ts` hostile turn `useEffect` dependency array to include `state.turnNumber`, enabling immediate sequential turn execution when an AI unit banks AP and wins the CTB clock again.
- [x] 3.2 Add integration tests in `src/ui/combat/useCombatSimulation.test.tsx` verifying that when an AI unit takes consecutive turns, the turn number increments and subsequent turns execute without freezing. Verify with `npm test`.
- [x] 3.3 Add emergency recovery logic to `useCombatSimulation.ts`'s `.catch` handler to clear `hostileActionStatus` and force turn progression if an unexpected fatal rejection occurs.

## 4. In-Game Diagnostic Visual Cues

- [x] 4.1 Update `src/ui/combat/CombatLogPanel.tsx` and `src/ui/combat/CombatArena.css` to render an amber-accented diagnostic card (`⚠️ AI FAULT` / `.log-fault-card`) displaying the actor, attempted action, and failure reason.
- [x] 4.2 Add unit test in `src/ui/combat/CombatLogPanel.test.ts` verifying parsing and rendering of diagnostic warning entries.
- [x] 4.3 Run full test suite (`npm test`) and production build (`npm run build`) to ensure zero regressions across all 69+ test suites.
