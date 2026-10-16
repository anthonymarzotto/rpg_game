# Design

## Context

Tactical battles in Astral Tactics use a continuous Turn Clock (CTB). During hostile turns, `useCombatSimulation.ts` runs an asynchronous turn sequencer (`executeHostileTurnAsync`) that steps through AI decisions with paced delays, invokes `executeMove` and `executeAbility`, and calls `endActiveTurn(state)` to tick the clock.

See `proposal.md` for motivation. Two failure modes cause permanent combat freezes:
1. `useCombatSimulation.ts` tracks active combatants by `state.activeUnitId`. When an AI unit banks AP and immediately wins the initiative clock again, `state.activeUnitId` does not change, causing React's effect not to re-run.
2. In `asyncTurnSequencer.ts` and `decisionEngine.ts`, `executeMove` and `executeAbility` throw runtime exceptions if validation fails. Without pre-validation or exception handling, `executeHostileTurnAsync` rejects abruptly before `endActiveTurn(state)` is reached, permanently locking the state in `HOSTILE_TURN`.

## Goals / Non-Goals

**Goals:**
- Guarantee that `endActiveTurn(state)` is invoked on every AI turn, advancing the CTB clock without exception.
- Enable seamless consecutive hostile turns for the same AI unit when AP banking awards them consecutive clock wins.
- Provide clear, in-game diagnostic feedback (amber Combat Log card + floating combat text) whenever an action validation fault occurs, ensuring the issue is immediately visible without opening DevTools.
- Ensure all diagnostics are recorded into `state.combatLog` so they are naturally included in future combat state exports.
- Pre-validate AI actions and evaluate true effective AP costs (`getEffectiveAbility().apCost`) before proposing actions.

**Non-Goals:**
- Rewriting the CTB initiative algorithm or pacing constants.
- Implementing the full state export file downloader (this will be done in a subsequent task; this design ensures state readiness).
- Altering player turn action flows or validation rules.

## Decisions

### Decision 1: React Hostile Turn Trigger via `state.turnNumber`
- **Choice**: Add `state.turnNumber` to the dependency array of React's hostile turn `useEffect` in `useCombatSimulation.ts`.
- **Rationale**: `state.turnNumber` is incremented in `advanceTurnClock` on every new turn. It does *not* change during intra-turn actions (Move, Ability), so intermediate `setState` calls for animations/floaters do not re-trigger or abort the sequencer. When a turn finishes and the clock awards the turn to the same unit, `state.turnNumber` has changed ($N \to N+1$), prompting React to cleanly launch the next turn sequence.
- **Alternatives Considered**:
  - *Tracking an explicit `turnSession` counter in React state*: Redundant with the engine's canonical `state.turnNumber` which is already incremented on every clock handoff.
  - *Internal recursion inside `executeHostileTurnAsync`*: Would bypass React's render loop and cause component state drift and stale closure bugs.

### Decision 2: `try / finally` Guarantee in `executeHostileTurnAsync`
- **Choice**: Wrap the entire action loop of `executeHostileTurnAsync` in a `try ... finally` block where `finally` unconditionally calls `endActiveTurn(state)` and `observer?.onTurnCompleted?.(actor, unspent)` if `!signal?.aborted && state.activeUnitId === actorUnitId && state.outcome === 'IN_PROGRESS'`.
- **Rationale**: Even if an unexpected runtime error occurs, the turn must always conclude and CTB recovery must be applied so the initiative clock ticks forward.
- **Alternatives Considered**:
  - *Relying only on try/catch around individual actions*: Does not protect against unexpected errors in heuristics, observer callbacks, or timing delays. Combining both per-action catch and `finally` provides defense-in-depth.

### Decision 3: Pre-Validation and Graceful Fallback to `CONSERVE_AP`
- **Choice**: In `asyncTurnSequencer.ts`, validate actions using `canMove` and `canExecuteAbility` before execution. If validation fails or if `executeAiAction` throws:
  1. Record an alert in `state.combatLog` (`actionId: 'ai_fault'`).
  2. Dispatch floating combat text `⚠️ Action Fault` over the actor.
  3. Break out of the action loop, allowing the unit to bank remaining AP for CTB recovery.
- **Rationale**: Breaking out of the action loop immediately halts illegal operations, prevents infinite loops where an AI might repeatedly select an invalid action, and converts unspent AP into initiative refund so the battle flows naturally.
- **Alternatives Considered**:
  - *Retrying with another action in the same turn*: Risky if multiple actions share the same invalid state (e.g., miscalculated AP), potentially causing CPU spin. Banking AP is safe, strategic, and self-correcting.

### Decision 4: In-Game Diagnostic Visual Cues
- **Choice**:
  - In `state.combatLog`: Append entry with `metadata: { type: 'GENERIC', actor: ..., text: ... }` containing `⚠️ [AI Fault]` details.
  - In `CombatLogPanel.tsx`: Detect diagnostic warning entries (or explicit `actionId: 'ai_fault'`) and render a `.log-fault-card` with an amber left-border (`#f59e0b`), warm background, and clear failure details.
  - On the arena grid: Dispatch `addFloatingText('⚠️ Action Fault', 'miss', actorCoord)`.
- **Rationale**: Gives immediate visibility to the player/developer that an action failed validation without needing DevTools console open, and stores the failure directly in `state.combatLog` for state export.
- **Alternatives Considered**:
  - *Global Toast/Alert popup*: Disruptive to gameplay flow. The Combat Log and tactical floating text are the standard feedback channels.

### Decision 5: Effective AP Cost Checking in `decideNextAction`
- **Choice**: In `decideNextAction`, resolve `const effectiveAbility = getEffectiveAbility(ability, cu.abilityModifiers)` and compare `cu.currentAp < effectiveAbility.apCost` instead of base `ability.apCost`.
- **Rationale**: Ability modifiers (such as cost increases from debuffs or shards) alter `effectiveAbility.apCost`. Checking base `apCost` caused the AI to attempt abilities it could not afford, triggering validation errors.

## Risks / Trade-offs

- **[Risk] Rapid consecutive turns look confusing if pacing is too fast** → *Mitigation*: `PACING_PRESETS` already enforces a `turnTransitionDelayMs` (400ms in NORMAL, 150ms in FAST) and displays `Preparing turn...` in the banner, providing a clear visual beat between turns.
- **[Risk] Diagnostic entries spam Combat Log if an AI keeps failing** → *Mitigation*: Because action failure immediately breaks the action loop and banks AP, an actor can fail at most once per turn.
- **[Risk] React strict mode or effect re-renders causing double turns** → *Mitigation*: `executeHostileTurnAsync` verifies `state.activeUnitId === actorUnitId && actor.currentAp > 0 && state.turnNumber === turnNumber`, and `AbortController` cleanly cancels stale promises.
