# Proposal

## Why

In complex combat sequences involving critical hits, challenging shout defiance, and multiple modifiers, the combat log and damage breakdowns exhibited confusing presentation:
1. Maximized critical hit damage breakdowns formatted as `1d4+1d4(max 8+6)+3` appeared to players as algebraic formula errors or malformed dice totals.
2. Attack rolls with negative modifiers rendered double signs such as `20+-2` (UX.10).
3. Post-action condition defiance events (e.g. `Nebula Infiltrator defied the challenge and became EXPOSED!`) were logged prior to the attack that triggered them, inverting cause and effect in the combat log chronicle.
4. Breaking or defying Challenging Shout lacked a dedicated combat card, falling back to an unstyled generic box (UX.8).

Refining these presentations ensures that the high-impact "Crunchy Crit" damage math is transparent and readable, log narrative maintains strict causal chronological order, and challenge defiance feels tactile and visually distinct.

## What Changes

- **Explicit Critical Hit Breakdown**: Update damage breakdown formatting in `damageEngine.ts` to output explicit labels for critical hits: `<formula> [Crit: <maxVal> max + <rolledDice> roll] + <mod> - <mitigation> <type> -> <total>`.
- **Spaced Attack Roll Modifiers (UX.10)**: Format attack roll modifiers with spaces for both addition and subtraction (`16 + 1`, `20 - 2`) across combat logs and UI roll chips.
- **Causal Combat Log Ordering**: Ensure attack actions are logged to `combatLog` before reactive post-action condition outcomes.
- **Dedicated Challenge Defied Card (UX.8)**: Render challenge defiance events in `CombatLogPanel.tsx` as dedicated condition cards with a styled `⚔️ CHALLENGE DEFIED` badge and contextual explanation.
- **Version Assessment**: This polish change introduces backward-compatible UX improvements and bug fixes without breaking APIs; target version is bumped from `0.9.0` to `0.9.1` (Patch).

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `arena-timeline-ux`: Update combat log panel specifications to mandate explicit critical damage breakdown notation, spaced attack roll modifier operators, causal event ordering, and styled challenge defiance cards.

## Impact

- `src/core/combat/damageEngine.ts`: Critical damage breakdown string generation.
- `src/core/combat/resolver.ts`: Spaced d20 roll formatting and ordering of action vs. reactive condition log entries.
- `src/ui/combat/CombatLogPanel.tsx`: `formatD20Roll` chip normalization and `CONDITION_BROKEN` card handling for `CHALLENGED` defiance.
- `docs/plans/ACTIVE.md`: Completed tasks UX.8 and UX.10.
