# Design

## Context

See `proposal.md` for background and motivation. The combat resolution engine uses a maximized critical hit formula ("Crunchy Crits") where critical damage equals maximized base/bonus dice plus rolled dice plus attribute modifiers, minus armor/ward mitigation. The breakdown string and combat log entries are presented in `CombatLogPanel.tsx`.

## Goals / Non-Goals

**Goals:**
- Provide clear, explicit breakdown labels for critical hit damage calculations in `damageEngine.ts`.
- Format d20 attack check rolls with single spaced operators (`16 + 1`, `20 - 2`) in both engine log entries and UI chips.
- Ensure natural causal event ordering in `resolver.ts` where attack actions precede reactive condition outcomes.
- Render challenge defiance events as distinct `CONDITION_BROKEN` cards with clear warning iconography and messaging.

**Non-Goals:**
- Altering the mathematical rules of Crunchy Crits (retained per design alignment).
- Changing condition stacking or challenge defiance mechanics (units remain challenged and can continue to be punished).

## Decisions

### Decision 1: Explicit Labeling for Critical Damage Breakdowns
- **Choice**: Format critical damage as `<formula> [Crit: <maxVal> max + <rolledDice> roll] + <mod> - <mitigation> <type> -> <damageDealt>`.
- **Alternatives Considered**:
  - *Keep parentheses `1d4+1d4(max 8+6)+3`*: Rejected as it appears malformed or ambiguous.
  - *Compact `Crit 1d4+1d4 (8 max + 6)`*: Rejected in favor of explicit `max` and `roll` labels for clarity.

### Decision 2: Centralized D20 Chip Formatter in UI
- **Choice**: Introduce `formatD20Roll(d20?: string): string` in `CombatLogPanel.tsx` to normalize d20 roll strings (e.g. `20+-2` -> `20 - 2`, `16+1` -> `16 + 1`).
- **Rationale**: Ensures both live engine events and historical/mock logs display consistent, readable operator spacing across all card roll chips.

### Decision 3: Reorder Combat Log Event Appending in `resolver.ts`
- **Choice**: Push the primary attack event to `state.combatLog` before executing the `conditionsToApply` loop that records defiance and exposure.
- **Rationale**: Attack events are the causal root of challenge defiance. Inverted logs created player confusion on Turn 12 where the defiance message preceded the attack.

## Risks / Trade-offs

- [Risk] Legacy tests asserting exact substring matches on old unspaced `d20` strings (e.g. `14+2`).
  - *Mitigation*: Update assertions to expect the normalized spaced format (`14 + 2`) while ensuring `parseCombatLogMessage` preserves raw metadata.
