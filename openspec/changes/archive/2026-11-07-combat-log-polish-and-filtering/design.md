# Design

## Context

Combat action resolution in `src/core/combat/` currently logs events by pushing ad-hoc objects directly into `state.combatLog`. The UI (`CombatLogPanel.tsx`) attempts to re-parse these entries using regex and a hardcoded `'player'` string prefix check (`actorUnitId.startsWith('player')`). 

Because campaign hero IDs are procedurally generated (e.g., `campaign-1731034-unit-1`), the prefix check fails in real gameplay, causing all player cards to render with enemy crimson borders and text (UX.18). Furthermore, environmental effects and passive traits lacking high-level ability wrappers (such as Feline Grace negating ledge fall damage) emit `type: 'GENERIC'` entries, which degrade to unstyled fallback text (UX.13). Finally, players have no way to isolate actions involving a specific combatant during multi-enemy turns (UX.4).

See `proposal.md` for overall motivation and capabilities.

## Goals / Non-Goals

**Goals:**
- Provide a centralized, strongly-typed `combatLogger` API in `src/core/combat/combatLogger.ts` for consistent logging.
- Transition `CombatLogEntry` and `CombatLogPanel` from binary `isPlayer: boolean` to `faction: Faction` (`'PLAYER' | 'ENEMY' | 'NEUTRAL'`).
- Ensure ledge fall damage and passive negation emit first-class `ENVIRONMENT` and `PASSIVE` cards.
- Add an event-stream fallback mechanism in `applyCombatEvents()` so unclaimed atomic combat events never vanish or degrade into raw text.
- Implement an interactive Unit Filter in `CombatLogPanel` to filter chronicle cards by selected combatant.

**Non-Goals:**
- Persisting combat logs across trial boundaries to IndexedDB (Idea I.1 remains in backlog, though enabled by this architecture).
- Modifying the visual dice tumbler tray or floating combat text rendering.
- Altering core combat rules, damage calculation math, or AI heuristics.

## Decisions

### Decision 1: `faction: Faction` on `CombatLogEntry` vs Runtime Lookup

* **Decision**: Add `faction: Faction` directly to `CombatLogEntry` (and `CombatLogMetadata`), populated automatically by `combatLogger`.
* **Rationale**:
  - Making log entries self-contained allows them to be rendered anywhere (post-trial summaries, camp chronicle, telemetry exports) without requiring an active `CombatState.units` map.
  - Avoids stale lookups when combatants are defeated, despawned, or transformed.
  - Directly supports third-party factions (`NEUTRAL`, `ENVIRONMENT`) that do not correspond to living `CombatUnit`s.
* **Alternatives Considered**:
  - *Passing `units` map to `CombatLogPanel`*: Rejected because dead units may be cleaned up, telemetry exports don't serialize full combatant state, and it leaks state management into the presentation tier.

### Decision 2: Centralized `combatLogger` API vs Scattered Direct Mutations

* **Decision**: Route all combat logging through helper methods in `src/core/combat/combatLogger.ts`:
  - `logAttack(state, params)`
  - `logMove(state, params)`
  - `logBuff(state, params)`
  - `logUtility(state, params)`
  - `logPassive(state, params)`
  - `logEnvironment(state, params)`
  - `logConditionBroken(state, params)`
  - `logDot(state, params)`
* **Rationale**:
  - Guarantees standard fields (`turnNumber`, `actorUnitId`, `faction`, `affectedUnitIds`) are always populated.
  - Keeps log message templates and metadata contracts tightly synchronized in one place.
* **Alternatives Considered**:
  - *TypeScript union type on `state.combatLog.push`*: Rejected because it still relies on developers manually assembling complex metadata and formatted strings across 15+ different files.

### Decision 3: Event-Stream Fallback in `applyCombatEvents()`

* **Decision**: Equip `applyCombatEvents(state, events, context)` with an unhandled event fallback logger.
* **Rationale**:
  - When an ability executes, its attack card covers the primary damage.
  - If standalone atomic events occur outside an ability card (e.g. plunging off a cliff during movement, wall collision, status DoT), the fallback checks if the event was claimed; if unclaimed, it automatically generates a formatted card (`ENVIRONMENT`, `PASSIVE`, `COLLISION`).
  - Developers adding new mechanics cannot accidentally omit combat log feedback.
* **Alternatives Considered**:
  - *Manual logging at every call site*: Rejected because history proved that edge cases (like ledge plunge immunity) are easily forgotten.

### Decision 4: Indexing `affectedUnitIds` for Unit Filtering (UX.4)

* **Decision**: Add `readonly affectedUnitIds?: readonly string[]` to `CombatLogEntry`.
* **Rationale**:
  - A single action can involve multiple combatants: the actor, primary target, and secondary/splash targets (e.g., Arcane Blast, Cleave, Knockback collision).
  - Filtering by unit becomes an efficient check:
    ```typescript
    const isRelevant = entry.actorUnitId === selectedUnitId ||
                       entry.affectedUnitIds?.includes(selectedUnitId);
    ```
* **Alternatives Considered**:
  - *Regex-matching unit names in rawMessage*: Rejected due to naming collisions, performance overhead, and brittleness.

## Risks / Trade-offs

- **[Risk] Existing test mocks lack `faction` property** → *Mitigation*: In `parseCombatLogMessage`, fall back gracefully to `entry.faction ?? (entry.actorUnitId.startsWith('player') ? 'PLAYER' : 'ENEMY')` so existing unit tests continue to pass without mass churn.
- **[Risk] Potential duplicate logs from event-stream fallback** → *Mitigation*: Ability resolution passes an explicit `context: { suppressFallback: true }` (or flags events as `logged: true`) to `applyCombatEvents` for all effects already described in the main action card.
