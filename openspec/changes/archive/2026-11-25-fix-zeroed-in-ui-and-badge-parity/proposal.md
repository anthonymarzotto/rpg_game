# Proposal

## Why

The Tier 4 Ballistician's `Zeroed In` stationary calibration stacks (`0..3`) work mechanically in combat, but their UI presentation is incomplete and inconsistent across the combat HUD:

- **Missing from the Character Card**: `Zeroed In` does not appear in the active modifiers/status badge row on Active, Inspected, Pinned, or Target unit cards, and its passive chip in the `PASSIVES:` row shows a generic `✦` icon with no `(N/3)` stack counter or ready glow.
- **Empty Standee Status Tooltip**: The overhead battlefield status bubble renders the `🔭` telescope icon when `zeroedInStacks > 0`, but omits `Zeroed In` from the hover tooltip badge list, leaving players with no mechanical explanation on hover.
- **Repeated UI Drift**: Both `UnitStatusCard` and `HexGridSvg` manually assemble status badges from four separate fields (`activeConditions`, `activeModifiers`, `virtualElevation`, `zeroedInStacks`), causing passive-state badges to drift out of sync across surfaces (repeating the earlier `Coiled Apex` visibility bug).

## What Changes

- **Unified Unit Status Badge Aggregator & `Zeroed In` Formatter**:
  - Add `formatZeroedInBadge(stacks)` in `conditionBadges.ts` detailing the active stack count (`1/3`, `2/3`, `3/3`), bonuses (`+N Range`, `+N Attack Roll`, `-N Evasion`, plus `+1 AoE Radius` at 3 stacks), and clear-on-move rule.
  - Introduce a single UI badge aggregator (`getUnitStatusBadges(cu, getUnitName)`) in `conditionBadges.ts` and route both `UnitStatusCard` (`renderUnitStatusBadges`) and `HexGridSvg` (standee pill icons, debuff border classification, and `StandeeStatusBubble` hover tooltips) through it so passive states, conditions, and stat modifiers never drift again.
- **Shared Passive Chip State & `Zeroed In` HUD Parity**:
  - Add `'zeroed_in'` (`🔭` icon, `(N/3)` stack counter, ready glow, and tooltip status tag) to `getPassiveIcon`, `getPassiveChipState`, and `PassiveTooltipContent`.
  - Share `getPassiveChipState` with `ActionBar`'s passives tray so `Zeroed In` (`1/3`..`3/3`), `Coiled Apex` (`+1 Height`), and `Momentum` (`0/2`..`2/2`) display consistent live counters and ready glow in both the Character Card and Action Bar.
  - Add a `🔭 Zeroed In` indicator badge to the Target Preview header (matching `Coiled Apex`) and emit `Zeroed In (N/3)` turn-end floating combat text when a Ballistician ends their turn stationary and accumulates a stack.

## Capabilities

### New Capabilities
- *(none)*

### Modified Capabilities
- `arena-timeline-ux`: Add `Zeroed In` visual feedback requirements matching `Coiled Apex` parity across the Character Card (active, inspected, pinned, and target status rows plus passive chip counter), Action Bar passives tray, battlefield standee status bubble and hover tooltip, Target Preview header badge, and turn-end floating combat text.

## Version Assessment

- **Target Version**: `0.25.2` (Patch bump from `0.25.1`).
- **Rationale**: Fixes missing HUD feedback and empty hover tooltips for an existing class passive without altering combat rules, balance, or data schemas.

## Impact

- **Combat UI**: `src/ui/combat/conditionBadges.ts`, `src/ui/combat/HexGridSvg.tsx`, `src/ui/combat/UnitStatusCard.tsx`, `src/ui/combat/ActionBar.tsx`, `src/ui/combat/useCombatSimulation.ts`
- **UI Tests**: `src/ui/combat/HexGridSvg.test.tsx`, `src/ui/combat/UnitStatusCard.test.tsx`, `src/ui/combat/ActionBar.test.tsx`, `src/ui/combat/useCombatSimulation.test.tsx`
- **Release Metadata**: `package.json`, `CHANGELOG.md`
