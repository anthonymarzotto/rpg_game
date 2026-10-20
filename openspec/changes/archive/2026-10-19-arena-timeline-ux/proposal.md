# Proposal

## Why

During tactical hex combat in Astral Tactics, players need immediate spatial and temporal clarity to make informed decisions. Currently:
1. The CTB initiative timeline queue at the top of the screen is visually disconnected from combatants on the battlefield—players cannot quickly tell which unit on the hex grid corresponds to an upcoming turn bubble, or when a specific enemy will act.
2. The timeline ribbon is cramped (`gap: 10px`, max-width `44px`), truncating combatant names and wasting horizontal space on a redundant "TURN QUEUE" label instead of giving breathing room to character tokens and clear turn order indicators.
3. Unit inspection during combat is limited; hovering turn bubbles does not preview combatant vitals or conditions in the unit status card.

Adding a responsive two-way hover highlight, a streamlined queue anchor, and spaced timeline chips with prominent turn order indicators solves these friction points and elevates in-combat tactical awareness.

## What Changes

- **Two-Way Hover Highlight**:
  - Hovering an initiative queue bubble illuminates the corresponding unit on the hex battlefield with an astral halo (cyan for allies, crimson for enemies).
  - Hovering a unit (tile or standee) on the hex field illuminates **all** of their upcoming turn slots across the timeline lookahead queue with an animated spring lift (`scale(1.08)`) and glowing aura.
  - Camera viewport remains stationary during timeline hover (no disruptive camera jumps).
- **Transient Unit Card Takeover**:
  - Hovering any turn bubble or battlefield combatant temporarily routes their live vitals (HP, defenses, conditions, CTB gauge, and speed) into the `UnitStatusCard`.
  - Reverting hover seamlessly restores the currently pinned or active unit view.
- **Streamlined Timeline Queue Anchor**:
  - Replaces the redundant `[⏳ TURN QUEUE]` label with a minimalist glowing `[⏳]` hourglass badge and tooltip, reclaiming ~80px of horizontal layout width.
- **Spaced Timeline Track & Prominent Turn Numerals**:
  - Increases chip track spacing from `10px` to `14px`.
  - Expands unit label width to `58px` to prevent text truncation on character names (`Alden`, `Lyra`, `Bandit A`, `Novice 1`, `Sorcerer`).
  - Prominently displays the active unit's `NOW` badge and future units' ordinal turn order (`2`, `3`, `4`...).

## Capabilities

### New Capabilities
- `arena-timeline-ux`: Interactive bidirectional hover highlighting between initiative queue chips and battlefield units, transient unit status card preview, streamlined queue anchor, and spaced timeline ribbon layout.

### Modified Capabilities
*(None. No existing requirement in core combat specs is changed.)*

## Impact

- **UI Components**:
  - `src/ui/combat/CombatArena.tsx`: Coordinates two-way hover state and feeds effective hovered combatant into `UnitStatusCard` and `HexGridSvg`.
  - `src/ui/combat/InitiativeRibbon.tsx` & `src/ui/combat/InitiativeRibbon.css`: Adds `highlightedUnitId`, `onHoverUnit`, streamlined `[⏳]` anchor, expanded `14px` gap, `58px` chip width, and glowing `chip-highlighted` styling.
  - `src/ui/combat/HexGridSvg.tsx`: Renders `unit-hover-halo` on 3D pedestals and vector fallbacks; binds hover events to standees.
- **Dependencies**: React 19, CSS modules/stylesheets. No new third-party dependencies.
- **Breaking Changes**: None. Backwards-compatible UI enhancement.
