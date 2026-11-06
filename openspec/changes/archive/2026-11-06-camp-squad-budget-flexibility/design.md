# Design: Camp Squad Budget Flexibility

## Context

During Camp phase, player units spend accumulated archetype XP to advance levels and ascend classes (`HeroProgressionDrawer.tsx`). This progression increases individual unit threat points (Novice: 10 pts, Tier 1: 25 pts, Tier 2: 40 pts, Tier 3: 55 pts, Tier 4: 70 pts). Because ascensions are not constrained by the deployment budget, the active Vanguard can easily exceed the stage deployment budget while in Camp (e.g., 60 pts deployed against a 30 pt budget in Stage 1).

Previously, `setCampActiveSquad` threw an error if the new squad's threat exceeded the stage deployment budget. Consequently, when a player attempted to reduce squad threat by clicking "Withdraw" or swapping units, `setCampActiveSquad` threw an unhandled error whenever the intermediate resulting squad was still above budget (e.g. dropping from 60 to 35 pts or 50 pts when budget is 30 pts). This created an inescapable soft-lock where units could not be removed or swapped.

See `proposal.md` for full motivation.

## Goals / Non-Goals

**Goals:**
- Decouple pure Camp squad roster reconfigurations (`setCampActiveSquad`) from hard runtime exceptions on threat budget overages.
- Allow players to withdraw units back to The Enclave (reserve) one-by-one from an over-budget squad until the budget is satisfied.
- Allow players to swap units in the Vanguard dock even when starting or ending over budget.
- Consolidate threat budget enforcement at combat deployment: `ExpeditionWarRoom.tsx` keeps `Enter Trial` disabled until the active squad has at least 1 unit and `activeSquadThreat <= stageBudget`.
- Declutter the Expedition War Room by moving the verbose inline overage text into a tooltip (`title` attribute) on the `✦ ENTER TRIAL` button.
- Maintain placed unit synchronization (`syncEncounterActiveSquad`) in `currentEncounter` on every squad update.

**Non-Goals:**
- Changing unit threat valuation or stage deployment budget curves (`threatBudget.ts`).
- Allowing players to actually enter trials with an over-budget squad.
- Restricting hero leveling/ascension based on current active squad deployment status.

## Decisions

### 1. Decouple `setCampActiveSquad` from Hard Budget Exception
In `src/core/campaign/transitions.ts`:
- Remove the `if (squadThreat > budget) throw new Error(...)` check from `setCampActiveSquad`.
- Retain structural validation: squad must contain at least 1 unit (`squadUnitIds.length > 0`) and all unit IDs must exist in the campaign roster.
- Retain synchronization of placed player units in `currentEncounter`.

*Rationale*: In Camp, the squad is in an editing state. Players need freedom to adjust their roster incrementally (e.g., benching high-level units, swapping in squires, promoting candidates). Throwing in domain functions during intermediate configuration breaks standard UI flows.

*Alternatives Considered*:
- *Allow changes only if `newThreat <= previousThreat`*: Rejected. If a player wants to swap in a unit first and then bench others, or if multiple units are involved, intermediate states may fluctuate. Restricting directions creates confusing partial restrictions.
- *Batch withdrawals / multi-select*: Overly complex for a turn-based tactical RPG. The existing 1-click Withdraw and Swap buttons work cleanly once the hard throw is removed.

### 2. Guard Combat Embarkation at the Expedition War Room & Tooltip Declutter
In `src/ui/camp/ExpeditionWarRoom.tsx`:
- Continue enforcing `isBudgetValid = activeSquadThreat == null || activeSquadThreat <= stageBudget` and `isSquadReady = activeSquadCount >= minSquadRequired && isBudgetValid`.
- Relocate the verbose inline budget warning (`Vanguard threat (X pts) exceeds stage deployment budget (Y pts)`) to a `title` attribute (tooltip) on the `✦ ENTER TRIAL` button. Because the points badge (e.g. `320 / 220 Pts`) is already styled prominently in red and the button is disabled, the tooltip provides full diagnostic guidance on hover while removing visual clutter from the War Room panel.
- When the squad is empty (`activeSquadCount < 1`), also provide `Attune at least 1 wayfarer into the active vanguard before entering the trial` via the button's tooltip.
- As defense-in-depth, add a guard in `handleDeploySquad` in `src/App.tsx` verifying that squad threat is within budget before transitioning views.

*Rationale*: This matches player expectations: camp management is freeform, while entering combat requires a legal squad. Moving the verbose text to a tooltip prevents duplicate information since the red points badge already signals the deficit.

### 3. Handler Consistency in `CampHub.tsx`
- Ensure `handleBenchHero`, `handleSelectForSwap`, and `handleDeployHero` operate predictably without unexpected error suppression.
- `handleBenchHero` will smoothly update the campaign state without crashing.
- `handleSelectForSwap` will cleanly swap units even if the squad was or remains over budget.

## Risks / Trade-offs

- **[Risk] Player wonders why Enter Trial is disabled without inline text**
  - *Mitigation*: The points badge in the War Room readiness section renders in red (e.g. `4 Ready (320 / 220 Pts)`), and hovering over the disabled `✦ ENTER TRIAL` button displays the exact overage tooltip (`Vanguard threat (320 pts) exceeds stage deployment budget (220 pts)`).
- **[Risk] Existing unit test expecting `setCampActiveSquad` to throw on over-budget squad breaks**
  - *Mitigation*: Update `transitions.test.ts` to assert that `setCampActiveSquad` allows setting squads with arbitrary threat while preserving encounter synchronization, and add tests verifying that `ExpeditionWarRoom` / deployment validation rejects over-budget squads from entering combat.
