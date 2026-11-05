# Design: Combat Turn Pacing and Clarity

## Context

See `proposal.md` for motivation.

The combat system resolves turn order via Continuous-Time Battle (CTB) initiative gauges in `src/core/combat/turnClock.ts`. When a unit completes a turn, `advanceTurnClock` calls `stepClockUntilReady`, which advances all living units by their effective speed in a synchronous `while` loop until at least one reaches the turn threshold (100). 

In the UI (`src/ui/combat/`), `useCombatSimulation.ts` coordinates turns between player interaction (`ActionBar.tsx`) and hostile AI execution (`asyncTurnSequencer.ts`). The CTB queue is visualized by `InitiativeRibbon.tsx`, which projects upcoming turns with `predictTurnOrder()`. Combat events are displayed on the hex map by `HexGridSvg.tsx` and listed in `CombatLogPanel.tsx`.

## Goals / Non-Goals

**Goals:**
- Provide a clear, readable cadence for turn transitions without obscuring or slowing down combat gameplay.
- Implement animated circular progress rings around initiative chip avatars that fill clockwise from 0% to 100% as initiative gauge ticks accumulate.
- Pace the visual CTB clock advancement over approximately 1.0 second when ticks are required, while transitioning instantly when a unit is already ready (0 ticks).
- Add an expanding beacon ripple pulse on the hex pedestal in `HexGridSvg.tsx` and a floating `"My Turn!"` / unit name announcement upon turn start.
- Correct turn end floating combat text to display `"Turn End"` on 0 unspent AP, preserving `"+X Initiative"` only when AP is banked.
- Group existing rich action cards in `CombatLogPanel.tsx` under distinct horizontal turn header banners.

**Non-Goals:**
- Do not modify core engine mechanics in `src/core/combat/` to be asynchronous; engine simulations and unit tests must remain instantaneous and deterministic.
- Do not summarize, truncate, or alter the detailed action cards in the combat log.
- Do not invent special "extra turn" badge systems; rely on clear turn start/end cues and log dividers to communicate back-to-back actions naturally.

## Decisions

### 1. Presentation-Layer Clock Stepping (Approach A)
- **Choice**: The core engine's `advanceTurnClock` remains pure and synchronous. When `endActiveTurn` is called in `useCombatSimulation.ts`, the UI calculates the delta between the pre-turn gauges and post-turn gauges, as well as the number of elapsed ticks.
- **Rationale**: Keeps headless test suites (`simulation.test.ts`, `turnClock.test.ts`) running in single-digit milliseconds without async overhead, while allowing the React UI to run a smooth 1-second presentation interpolation.
- **Alternatives Considered**: Making the engine yield generator steps for each tick (`function* stepClock()`). Rejected because it would introduce async complexity and state mutation hazards into core battle resolvers.

### 2. SVG Circular Progress Rings for Initiative Chips
- **Choice**: In `InitiativeRibbon.tsx`, wrap the chip portrait in an SVG with a circular `<circle>` track and an animated progress `<circle>` using `stroke-dasharray` and `stroke-dashoffset` (or CSS `conic-gradient`). The ring fills clockwise from top (0 deg) to 360 deg based on `Math.min(100, cu.initiativeGauge) / 100`.
- **Rationale**: Avoids cluttering the ribbon with raw numeric fractions (`88/100`) while giving players an instant visual gauge of who is closest to acting.
- **Alternatives Considered**: Text percentage tags or rectangular mini bars below the portrait. Rejected for visual clutter and aesthetic mismatch with the circular token standees.

### 3. Dynamic Pacing Scaling (~1.0s Window)
- **Choice**: When clock stepping advances by `T` ticks (`T > 0`):
  - In `NORMAL` AI speed: Total duration is ~1000ms. Step interval is `Math.max(50, Math.floor(1000 / T))` ms per tick.
  - In `FAST` AI speed: Scaled down to ~300ms total.
  - In `INSTANT` AI speed: 0ms (instant handoff).
  - When `T === 0` (subsequent unit was already >= 100): 0ms (immediate transition).
- **Rationale**: Respects player feedback that 600ms was too fast to observe multiple chip gauges filling up, while ensuring that consecutive turns with zero ticks don't introduce artificial dead air.

### 4. Hex Pedestal Beacon Pulse
- **Choice**: In `HexGridSvg.tsx`, when a unit becomes the active actor (`isActiveActor === true`), render an expanding ellipse ripple around the pedestal base (`rx: 22 -> 44`, `ry: 8.5 -> 17`, `opacity: 1 -> 0`) over 450ms.
- **Rationale**: Solves the spatial awareness issue where players lose track of which enemy across a large arena is currently taking their turn.

### 5. Combat Log Turn Demarcation Headers
- **Choice**: In `CombatLogPanel.tsx`, insert a horizontal divider component `<div className="log-turn-divider">` whenever the `turn` property changes between consecutive cards. The divider displays the turn numeral, unit name, faction badge, and styling.
- **Rationale**: Partitions actions into clear turns without touching the layout, tooltips, or formatting of individual action cards.

## Risks / Trade-offs

- **[Risk] Animation lock during clock stepping**: If the player clicks buttons during the 1s clock stepping phase, actions could misfire.
  - **Mitigation**: Set action mode to neutral `IDLE` during the clock transition and enable interaction once the active unit's turn officially starts.
- **[Risk] Floating text overlap on turn start**: Turn start "My Turn!" text could collide with DoT damage floaters or turn-start passives.
  - **Mitigation**: Leverage existing anti-overlap vertical stacking in `useFloatingCombatText.ts` (Requirement 10 of `arena-timeline-ux`).
