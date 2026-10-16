# Proposal

## Why

In tactical combat, when an AI support unit (such as a Witch) conserves AP and wins the CTB clock again immediately, the reactive combat controller in `useCombatSimulation.ts` does not detect a change in active unit and stalls, leaving the AI with 3 AP and permanently freezing battle progression. Furthermore, if the AI proposes an action that fails validation during execution (e.g. modified AP costs, obstructed charge ray, blocked line of sight), the async turn sequencer throws an unhandled exception and exits before calling `endActiveTurn(state)`, permanently locking the simulation in `HOSTILE_TURN`. Currently, errors only log to DevTools console, which is invisible during gameplay.

Resolving these issues ensures that AI turns never freeze, consecutive AI turns sequence seamlessly, and any unexpected action validation failure is surfaced in-game via a styled Combat Log diagnostic card and tactical floating combat text.

## What Changes

- **Consecutive Turn Reactivity**: Include `state.turnNumber` in the dependency array of React's hostile turn `useEffect` in `useCombatSimulation.ts`, ensuring that whenever the CTB clock ticks and awards the active slot to the same unit again, the new turn executes cleanly.
- **Resilient AI Turn Sequencing**: Wrap `executeHostileTurnAsync` in a `try / finally` architecture ensuring `endActiveTurn(state)` is always called upon turn completion, even if an action throws or fails validation.
- **Action Validation Fallback**: Pre-validate AI actions (`canMove` / `canExecuteAbility`) or catch validation errors in `executeHostileTurnAsync` / `executeAiTurn`. If an action fails validation, log a diagnostic warning, conserve remaining AP for CTB recovery, and conclude the turn instead of crashing.
- **True Effective AP Cost Check**: Update `decideNextAction` to check `getEffectiveAbility(ability, cu.abilityModifiers).apCost` rather than base `ability.apCost` to prevent illegal proposals under modified AP costs.
- **In-Game Diagnostic Feedback**: Record an alert entry in `state.combatLog` (`actionId: 'ai_fault'`) and dispatch an amber tactical floating combat text (`⚠️ Action Fault`) directly over the unit, rendering a styled warning card in `CombatLogPanel.tsx`.
- **Emergency Turn Recovery**: Enhance `useCombatSimulation.ts`'s `.catch` handler to clear hostile status and force turn handoff if an unexpected fatal rejection occurs.

## Capabilities

### Modified Capabilities
- `hybrid-ai-heuristics`: Adds requirements for AI action pre-validation and graceful fallback to AP conservation, guaranteed CTB turn handoff via `try / finally`, in-game diagnostic logging/floating feedback on action faults, and reactive consecutive-turn execution when winning the CTB clock across turn boundaries.

## Impact

- `src/ui/combat/useCombatSimulation.ts`: Hostile turn effect dependencies and emergency recovery handler.
- `src/ui/combat/asyncTurnSequencer.ts`: Action pre-validation, try/catch action fallback, guaranteed turn completion in finally block, and diagnostic log event dispatching.
- `src/core/ai/decisionEngine.ts`: Effective AP cost checking in `decideNextAction` and resilient error handling in `executeAiTurn`.
- `src/core/combat/types.ts`: Structured metadata for diagnostic warning entries in `CombatLogMetadata` if needed.
- `src/ui/combat/CombatLogPanel.tsx` & `src/ui/combat/CombatArena.css`: Styled `⚠️ AI FAULT` diagnostic card rendering.
- `docs/plans/LONGTERM.md`: Marks Bug 9 (AI buff lock / turn freeze) as resolved.
