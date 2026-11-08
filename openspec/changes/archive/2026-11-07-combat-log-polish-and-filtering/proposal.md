# Proposal

## Why

During combat trials, the Astral Chronicle combat log currently suffers from a critical visual bug where all player action cards render in enemy crimson due to a brittle `'player'` prefix check against procedural unit IDs (`campaign-xxx-unit-1`). In addition, environmental and passive interactions (such as Feline Grace negating ledge fall damage) fall back to unformatted raw generic cards, and players have no way to isolate combat events for a specific unit amidst dense multi-enemy turns. 

Establishing a strongly-typed logging pipeline (`combatLogger`) and replacing binary `isPlayer` checks with an extensible `faction: Faction` model resolves these visual defects, ensures future abilities/passives are never logged as raw text, and unlocks interactive unit-based log filtering.

## What Changes

- **Typed Combat Logging Pipeline**: Implement a centralized, strongly-typed `combatLogger` module in `src/core/combat/` that standardizes log card creation, automatically derives `faction: Faction` from combatant units, and indexes `affectedUnitIds` (targets, splash victims, secondary targets).
- **Faction-Based Visual Theming (UX.18)**: Refactor `CombatLogEntry` and `CombatLogPanel` from binary `isPlayer` checks to `faction: Faction` (`'PLAYER' | 'ENEMY' | 'NEUTRAL'`), styling cards with dedicated CSS themes (`.faction-player` starlight cyan, `.faction-enemy` void crimson, `.faction-neutral` celestial amber).
- **Structured Passive & Environmental Cards (UX.13)**: Refactor ledge fall resolution and passive trait hooks so that fall immunity (e.g., Feline Grace) emits a styled `⚡ PASSIVE` card and unmitigated ledge plunges emit a styled `⚠️ ENVIRONMENT` hazard card instead of raw `GENERIC` text.
- **Event-Stream Fallback Gateway**: Integrate an automatic fallback in `applyCombatEvents()` that ensures any unhandled atomic combat event (fall damage, collisions, status ticks) automatically generates a structured card rather than vanishing or degrading to unstyled text.
- **Interactive Unit Filtering (UX.4)**: Add a unit filter control in the Astral Chronicle header (All Units dropdown / active combatant selector) that filters displayed log cards to actions where the selected unit was the primary actor, targeted, or caught in splash/area effects.
- **Version Bump**: Bumps version from `0.12.1` to `0.13.0` (Minor version bump for new user-facing log filtering feature and multi-faction theming).

## Capabilities

### New Capabilities
*(None - builds on and extends the existing combat arena and chronicle capability)*

### Modified Capabilities
- `arena-timeline-ux`: Add requirements for faction-thematic combat log card styling (`PLAYER`, `ENEMY`, `NEUTRAL`), unit-level combat log filtering (actor, target, splash/area targets), and first-class structured cards for passive trait triggers and environmental hazard impacts.

## Impact

- **Core Combat (`src/core/combat/`)**:
  - `types.ts`: Adds `faction: Faction` and `affectedUnitIds?: readonly string[]` to `CombatLogEntry` / `CombatLogMetadata`.
  - `combatLogger.ts`: New strongly-typed logging helper module.
  - `resolver.ts`, `damageEngine.ts`, `turnClock.ts`: Migrates ad-hoc `state.combatLog.push` calls to `combatLogger`.
- **UI Components (`src/ui/combat/`)**:
  - `CombatLogPanel.tsx`: Supports unit filtering state, renders faction-themed cards, and supports `ENVIRONMENT` card type.
  - `CombatArena.css`: Adds `.faction-player`, `.faction-enemy`, `.faction-neutral`, and environmental card styles.
- **Tests**: Updates and adds unit tests in `CombatLogPanel.test.ts` and `resolver.test.ts` verifying faction attribution, fall damage/immunity logging, and unit filtering.
