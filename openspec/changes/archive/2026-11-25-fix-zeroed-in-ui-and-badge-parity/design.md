# Design

## Context

See `proposal.md` for motivation and scope. `Zeroed In` (`cu.zeroedInStacks`) and `Coiled Apex` (`cu.virtualElevation`) are stored as passive-state fields on `CombatUnit` rather than turn-counted `ActiveCondition` entries because they are event-driven (clear on move/displacement or on next attack) and interact directly with dynamic `AbilityModifier` injection, elevation-delta math, and bombardment snapshots.

Today, three separate UI code paths manually reconstruct a unit's visible status entries (`UnitStatusCard.renderUnitStatusBadges`, `HexGridSvg` token `statusIcons`/`hasDebuff`, and `HexGridSvg.StandeeStatusBubble` hover `badges`), and two separate UI code paths compute passive chip counters (`UnitStatusCard.getPassiveChipState` and `ActionBar` passives tray). That duplication caused `Zeroed In` to show `🔭` in the standee icon pill while missing from the standee hover tooltip, Character Card, and Action Bar tray.

## Goals / Non-Goals

**Goals:**
- Provide a single UI status-badge aggregator (`getUnitStatusBadges`) in `src/ui/combat/conditionBadges.ts` covering passive states (`Zeroed In`, `Coiled Apex`), active conditions, and active stat modifiers.
- Route `UnitStatusCard.tsx` and `HexGridSvg.tsx` through `getUnitStatusBadges` so icons, debuff border styling, Character Card pills, and Standee hover tooltips stay permanently synchronized.
- Share passive chip state (`getPassiveChipState`, `getPassiveIcon`, `PassiveTooltipContent`) between `UnitStatusCard.tsx` and `ActionBar.tsx` with full `'zeroed_in'` support (`🔭`, `(N/3)` counter, ready glow, and tooltip tag).
- Add the Target Preview `🔭 Zeroed In` badge and turn-end `Zeroed In (N/3)` floating combat text in `useCombatSimulation.ts`.

**Non-Goals:**
- Refactoring `zeroedInStacks` or `virtualElevation` into `CONDITION_REGISTRY` / `ActiveCondition` in core combat.
- Changing any `Zeroed In` combat balance, stack cap, or clear-on-displacement mechanics.

## Decisions

### 1. Single UI Badge Aggregator in `conditionBadges.ts`
- **Choice**: Add `formatZeroedInBadge(stacks: number): FormattedModifierBadge` and export `getUnitStatusBadges(cu: CombatUnit, getUnitName?: (id: string) => string): readonly UnitStatusBadgeEntry[]` (where each entry carries `key`, `badge`, and `icon` derived from `badge.tooltip.icon`) in `src/ui/combat/conditionBadges.ts`.
  - Ordering: passive states (`Coiled Apex`, `Zeroed In`), then `activeConditions`, then `activeModifiers`.
  - `UnitStatusCard.tsx` (`renderUnitStatusBadges`) renders all entries from `getUnitStatusBadges`.
  - `HexGridSvg.tsx` uses `getUnitStatusBadges` for `statusIcons`, `hasDebuff`, and `StandeeStatusBubble` hover tooltip rendering.
- **Rationale**: Eliminates the 3-way split so adding or updating any passive state, condition, or modifier updates the Character Card, standee icon pill, debuff border color, and standee hover tooltip in lockstep.
- **Alternative considered**: Patching `zeroedInStacks` manually into `UnitStatusCard.tsx` and `StandeeStatusBubble` as a one-off next to `virtualElevation`. Rejected because it perpetuates the exact duplication that produced B.18 and this bug.

### 2. Shared Passive Chip State across `UnitStatusCard` and `ActionBar`
- **Choice**: Export `getPassiveChipState(cu: CombatUnit, passive: PassiveTrait): { isReady: boolean; counterText?: string; readyTag?: string }` from `UnitStatusCard.tsx` (alongside existing `getPassiveIcon` and `PassiveTooltipContent`), adding `'zeroed_in'`:
  - `getPassiveIcon('zeroed_in')` -> `'🔭'`.
  - `getPassiveChipState` for `'zeroed_in'`: `stacks = cu.zeroedInStacks ?? 0`, `isReady: stacks > 0`, `counterText: '(${stacks}/3)'` (or compact `${stacks}/3` in `ActionBar`), `readyTag: stacks >= 3 ? 'MAX CALIBRATION (3/3)' : 'CALIBRATED (${stacks}/3)'`.
  - Update `ActionBar.tsx`'s passives tray to call `getPassiveChipState(activeCu, passive)` instead of hardcoding `isMomentum`, so `Momentum`, `Coiled Apex`, and `Zeroed In` all show live counters and glow consistently.
- **Rationale**: Keeps passive counter logic in one place and avoids duplicating passive-ID branches between the Character Card and Action Bar.
- **Alternative considered**: Adding a separate `isZeroedIn` branch directly in `ActionBar.tsx`. Rejected because it would leave `Coiled Apex` and future passives out of sync in `ActionBar`.

### 3. Target Preview Badge & Turn-End Floater Parity
- **Choice**:
  - In `UnitStatusCard.tsx`'s Target Preview header (`.preview-badges-row`), when `(activeCu.zeroedInStacks ?? 0) > 0`, render a `data-testid="target-preview-zeroed-in"` badge: `🔭 Zeroed In (+N Hit, +N Rng)` (appending `, +1 AoE` when `stacks >= 3`).
  - In `useCombatSimulation.ts` (`handleEndTurn`), check whether the active unit has `hasZeroedInPassive(activeCu)`, has not moved/displaced this turn (`!activeCu.movedThisTurn && (activeCu.hexesMovedThisTurn ?? 0) === 0`), and is below `MAX_ZEROED_IN_STACKS`; if so, emit `addFloatingText('Zeroed In (${nextStacks}/3)', 'buff', activeCoord ?? { q: 0, r: 0 })` matching `Coiled Apex (+1 Height)`.
- **Rationale**: Mirrors the exact feedback loop established for `Coiled Apex` in B.18 so stationary Ballistician turns visibly confirm stack gain immediately at turn end and while aiming.

## Risks / Trade-offs

- **[Risk] Preserving existing `data-testid` attributes in `UnitStatusCard.test.tsx`** → Keep stable deterministic test-id suffixes on `UnitStatusBadgeEntry` (e.g., `virtual-elevation`, `zeroed-in`, `cond-${idx}`, `mod-${idx}`) so existing tests like `active-virtual-elevation` and `insp-virtual-elevation` remain 100% intact.
- **[Risk] Standee icon border color for `Zeroed In` (`isDebuff: false` despite `-N Evasion` tradeoff)** → Mark `formatZeroedInBadge` with `isDebuff: false` (it is a net positive self-calibration buff, matching `Coiled Apex` and `HENOSIS` gold buff border), while clearly stating `-N Evasion` inside the tooltip rule text.
