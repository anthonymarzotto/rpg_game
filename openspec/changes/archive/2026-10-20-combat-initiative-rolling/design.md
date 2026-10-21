# Design: Combat Initiative Rolling

## Context

See `proposal.md` for problem background and motivation. 

Currently, `createCombatState` in `src/core/combat/resolver.ts` initializes each unit's `initiativeGauge` to `0`. Because baseline Speed for non-Finesse classes is uniformly 10, all combatants reach the 100 gauge threshold on Tick 10. `turnClock.ts` resolves ties using `b.gauge - a.gauge`, then `b.speed - a.speed`, and finally `a.id.localeCompare(b.id)`. Because player IDs begin with `'c'` (`campaign-...`) and enemies with `'e'` (`enemy-...`), the player wins 100% of ties.

## Goals / Non-Goals

**Goals:**
- Seed each unit's `initiativeGauge` with a `1d20` ($1\text{--}20$) roll when `createCombatState` initializes combatants.
- Maintain deterministic encounter generation and replayability by allowing `createCombatState` to accept a `DiceRoller` (defaulting to seeded or standard roller).
- Log an opening battle event in `state.combatLog` displaying the initiative rolls for all combatants.
- Render non-blocking floating combat text (`🎲 <roll>`) above each unit upon battlefield spawn (Turn 0).
- Preserve existing CTB clock logic in `turnClock.ts` and turn-reset rules in `endActiveTurn`.

**Non-Goals:**
- No blocking modal dialogs, pre-combat overlays, or click-to-continue prompts.
- No changes to `turnClock.ts` stepping algorithms or tiebreaker criteria.
- No changes to subsequent turn resets (units reset to 0 or $+20$ per unspent AP after taking a turn).

## Decisions

### 1. Direct Starting Gauge Seeding vs. Secondary Initiative Subsystem
- **Decision**: Seed `initiativeGauge` directly with `diceRoller.roll(1, 20)` in `createCombatState`.
- **Rationale**: Keeps the CTB engine pure. The 1d20 roll represents a $1\text{--}20\%$ head start toward the 100 threshold. Speed differences naturally accumulate over the race, allowing fast units to usually act first while still enabling high rolls to upset the order.
- **Alternatives Considered**:
  - *D&D-style ranked turn order slots*: Rejected for unnecessary complexity and extra data structures.
  - *Rolling initiative on every round*: Rejected because CTB already governs continuous flow naturally via Speed and AP recovery.

### 2. Retaining `localeCompare` as a Player-Friendly Tiebreaker
- **Decision**: Retain the existing `a.id.localeCompare(b.id)` fallback in `turnClock.ts`.
- **Rationale**: When two units roll the exact same starting gauge and have the exact same speed, giving the tie to the player acts as a classic, player-friendly "tie goes to the runner" rule. It requires zero edits to `turnClock.ts`.
- **Alternatives Considered**:
  - *Randomizing unit IDs or adding per-combat tiebreaker seeds*: Rejected as unnecessary over-engineering since the 1d20 roll already breaks the vast majority of ties.

### 3. Option C UI Presentation (Floating Combat Text + Combat Log)
- **Decision**: Emit transient floating text (`🎲 <roll>`) on arena mount and an opening entry in `state.combatLog`.
- **Rationale**: Reuses the established `useFloatingCombatText` hook and hex grid coordinates. Zero blocking UI, zero test friction, and immediately informative.
- **Alternatives Considered**:
  - *Pre-combat modal (Option A)*: High friction for repeated plays and test restarts.
  - *Ribbon shuffle animation (Option B)*: More CSS/timer complexity; can be added later if desired.

## Risks / Trade-offs

- **[Risk] Existing unit tests assuming `initiativeGauge === 0`**
  $\rightarrow$ *Mitigation*: Tests calling `createCombatState` with a seeded roller will be deterministic. Tests that construct raw `CombatUnit` literals directly in their mocks will continue to work without disruption.
- **[Risk] Multiple consecutive enemy turns in opening round**
  $\rightarrow$ *Mitigation*: Over a 1d20 distribution with 3v3 squads, enemy rolls are randomly interleaved with player rolls. Speed differences and player defenses allow squads to absorb early attacks, making opening gameplay dynamic rather than one-sided.
