# Design

## Context

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/arena-timeline-ux/proposal.md) for background and motivation.

The combat arena layout consists of:
1. `InitiativeRibbon`: Renders projected turns along a horizontal dock at the top of the arena.
2. `HexGridSvg`: Renders the 2.5D elevated hex grid, terrain, and units with 3D pedestals and upright pixel standees.
3. `UnitStatusCard`: Renders active unit vitals, attributes, and conditions on the left HUD overlay.
4. `CombatArena`: Coordinates simulation state, user interaction, and component rendering.

## Goals / Non-Goals

**Goals:**
- Provide clear visual linkage between timeline chips and battlefield standees.
- Ensure hovering any turn chip or battlefield unit illuminates all upcoming turns for that combatant.
- Reclaim horizontal layout space to space out timeline chips and expand label widths to 58px.
- Display clear ordinal turn order numbers (`NOW`, `2`, `3`...) while reserving detailed CTB gauge / speed stats for the unit card.
- Allow transient inspection of any hovered combatant in `UnitStatusCard` with automatic reversion.

**Non-Goals:**
- Automatic camera centering/panning on timeline chip hover (avoiding motion sickness/jitter).
- Rendering raw CTB gauge values (`78 CTB`, `80 CTB`) or tick countdowns on the timeline chips (which creates cognitive dissonance due to unit speed differences).
- Permanent unit pinning via timeline click (pinned inspection belongs to Item 1.1).

## Decisions

### Decision 1: State Coordination via `CombatArena`
- **Choice**: Maintain `ribbonHoveredUnitId: string | null` in `CombatArena` and derive:
  ```ts
  const highlightedUnitId = ribbonHoveredUnitId ?? hoveredUnitCu?.unit.id ?? null;
  const effectiveHoveredUnitCu = ribbonHoveredUnitId ? state.units.get(ribbonHoveredUnitId) : hoveredUnitCu;
  ```
- **Rationale**: Keeps hover coordination centralized at the arena level without introducing event emitters or prop drilling through deep component trees.
- **Alternatives Considered**: Direct DOM event listeners or custom React context. Rejected as unnecessary overhead for a single arena view.

### Decision 2: Multi-Turn Slot Matching by `unitId`
- **Choice**: Match timeline chips against `highlightedUnitId` using `turn.unitId === highlightedUnitId`.
- **Rationale**: In a CTB system, fast units (e.g. Thief, Infiltrator) frequently appear multiple times in the 8-turn lookahead window. Illuminating all instances reveals turn frequency and action economy at a glance.
- **Alternatives Considered**: Only highlighting the specific hovered slot. Rejected because it fails to answer the critical player question: *"When does this unit act next, and how many times do they act before me?"*

### Decision 3: Chronological Turn Order Numerals over Raw CTB Gauge
- **Choice**: Display `NOW` for the active unit and ordinal numbers (`2`, `3`, `4`...) for subsequent turns. Keep numerical gauge (`Gauge: 78/100`) and Speed (`⚡10`) in `UnitStatusCard`.
- **Rationale**: When units have different speeds, a unit with lower current gauge (e.g. Thief at 78 CTB, Speed 10) acts before a unit with higher current gauge (e.g. Mage at 80 CTB, Speed 6). Placing raw gauge numbers on a left-to-right timeline causes severe cognitive dissonance (`78` placed to the left of `80`). Turn numbers (`1 -> 2 -> 3...`) always ascend monotonically.
- **Alternatives Considered**: Cumulative clock ticks (`+2t, +5t`). Rejected during exploration because ability cards modify gauge (`-20 CTB Delay`), making clock ticks unintuitive.

### Decision 4: Minimalist Hourglass Anchor
- **Choice**: Replace the verbose `[⏳ TURN QUEUE]` label with a compact `[⏳]` icon with a hover tooltip.
- **Rationale**: Reclaims ~80px of horizontal width, directly funding an expanded `14px` chip gap and `58px` label width without crowding the top arena bar.
- **Alternatives Considered**: Keeping "TURN QUEUE" or shortening to "QUEUE". A standalone `⏳` icon is cleaner, standard in modern tactical UI, and matches the game's astral minimalism.

### Decision 5: Non-Disruptive Stationary Camera Behavior
- **Choice**: The camera viewport does not pan or re-center when hovering timeline chips.
- **Rationale**: Players frequently skim across the timeline queue to check upcoming turns. Auto-panning on simple hover creates disorienting screen jumps.
- **Alternatives Considered**: Smooth pan to hovered unit. Rejected as jarring during casual timeline inspection.

## Risks / Trade-offs

- **[Standee mouse hit-testing]** → Standees extend ~60px vertically above the hex polygon. If hover was only attached to the base polygon, hovering the sprite's torso or head would feel unresponsive. *Mitigation*: Attach `onMouseEnter={() => onTileHover(pos)}` to the `<g className="unit-render-group">` standee container in `HexGridSvg`.
- **[Visual halo overlap]** → Units have active turn halos, stealth smoke, and target reticles. *Mitigation*: Position the hover halo on the bottom-most layer of the pedestal stack with radius `rx=23.5, ry=9` so it clearly frames the unit without occluding target reticles or active actor glows.
