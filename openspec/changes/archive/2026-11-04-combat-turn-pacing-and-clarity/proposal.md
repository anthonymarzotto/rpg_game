# Proposal: Combat Turn Pacing and Clarity

## Why

Combat turn handoffs currently occur instantaneously in memory: when a unit completes a turn, the turn clock immediately recalculates the next actor and triggers their actions without any visual pacing. When agile units lap the field to take consecutive turns (e.g. 6 straight actions across two turns) or when units bank action points to skip their turn, the lack of transition cues makes the combat flow feel disorienting and bug-like.

Additionally, the combat log displays action cards in one continuous scroll stream without turn boundaries, and ending a turn with 0 AP confusingly emits a `+0 Initiative` floating message. Introducing paced clock animations, dynamic circular progress meters on initiative chips, hex token beacon pulses, clean turn start/end feedback, and turn dividers in the combat log makes the continuous-time battle (CTB) flow transparent, readable, and satisfying.

## What Changes

- **Animated Circular Progress Rings on CTB Chips**: Replace static chip borders with dynamic circular progress rings (cyan for player units, rose for enemies) that fill clockwise from 0% to 100% as initiative gauge ticks accumulate toward the turn threshold.
- **Paced CTB Clock Stepping (~1.0s)**: When the clock advances across one or more ticks to find the next ready unit, pace the gauge progression over ~1.0 second so players can visually observe the speed differential and watch units race to 100%. When multiple units are already ready (0 ticks needed), transition immediately.
- **Turn Start Token Pulse & Call-Out**: When a combatant becomes the active unit, trigger a transient expanding beacon ripple on their hex pedestal in the SVG arena, accompanied by a floating text call-out (`My Turn!` for player characters, or `[Unit Name]` for hostiles).
- **Turn End Feedback Demarcation**: Refactor turn completion feedback so units exhausting their AP display a clean `Turn End` floating text, while units with unspent AP display `+X Initiative` (or `Banked X AP`). Eliminate the confusing `+0 Initiative` notification.
- **Combat Log Turn Dividers**: Insert visual horizontal turn header banners (`━━━ Turn X • [Unit Name] ━━━`) between turns in the Combat Chronicle, grouping existing rich action cards cleanly without altering card content.
- **Semantic Version Target**: Bumps version from `0.10.0` to `0.11.0` (minor). This introduces new interactive UI animations, visual feedback systems, and pacing mechanics without breaking save data or core combat engine schemas.

## Capabilities

### Modified Capabilities
- `arena-timeline-ux`: Modify requirements to add circular gauge progress ring rendering, paced clock advancement animations, turn start beacon pulses on hex pedestals, refined turn end floating feedback, and turn header divider banners in the combat log.

## Impact

- **UI Components**:
  - `src/ui/combat/InitiativeRibbon.tsx` and `InitiativeRibbon.css`: SVG progress ring integration, gauge tracking, active chip transitions.
  - `src/ui/combat/HexGridSvg.tsx` and `HexGridSvg.css`: Expanding beacon ring pulse animation on the active actor's hex pedestal.
  - `src/ui/combat/CombatLogPanel.tsx` and `CombatLogPanel.css`: Turn header divider component between action cards.
  - `src/ui/combat/useCombatSimulation.ts`: Turn start/end floating text hooks, clock step animation orchestration.
  - `src/ui/combat/asyncTurnSequencer.ts`: Turn handoff pacing hooks.
- **Core Engine & Tests**:
  - Core engine logic (`turnClock.ts`) remains synchronous and pure; UI manages the visual interpolation to preserve high-speed headless test runs.
