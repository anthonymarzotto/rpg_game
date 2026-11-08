# Tasks

## 1. Core Types & Typed Logging Pipeline

- [x] 1.1 Extend `CombatLogEntry` and `CombatLogMetadata` in `src/core/combat/types.ts` to include `faction: Faction` and `affectedUnitIds?: readonly string[]`, and add an `ENVIRONMENT` metadata variant. Verify by compiling types with `npx tsc --noEmit`.
- [x] 1.2 Implement `src/core/combat/combatLogger.ts` providing strongly-typed helpers (`logAttack`, `logMove`, `logBuff`, `logUtility`, `logPassive`, `logEnvironment`, `logConditionBroken`, `logDot`) that automatically populate `faction`, `turnNumber`, and `affectedUnitIds`. Verify with targeted unit tests in `src/core/combat/combatLogger.test.ts`.

## 2. Core Resolver Migration & Event-Stream Fallback

- [x] 2.1 Migrate movement, ledge plunge, and Feline Grace fall damage resolution in `src/core/combat/resolver.ts` to emit structured `PASSIVE` (for negated fall damage) and `ENVIRONMENT` (for direct ledge damage) cards via `combatLogger`. Verify with tests in `src/core/combat/catBurglarIntegration.test.ts` and `src/core/combat/grid.test.ts`.
- [x] 2.2 Equip `applyCombatEvents()` in `src/core/combat/resolver.ts` with unhandled event-stream fallback logging for standalone collision, fall, or environmental damage events. Verify with tests in `src/core/combat/resolver.test.ts`.
- [x] 2.3 Refactor remaining combat action log calls in `src/core/combat/resolver.ts` and `src/core/combat/turnClock.ts` to use `combatLogger`. Verify by running `npm test -- src/core/combat/`.

## 3. Faction-Themed Cards & Structured Card Presentation

- [x] 3.1 Update `parseCombatLogMessage()` in `src/ui/combat/CombatLogPanel.tsx` to handle `faction: Faction` and the new `ENVIRONMENT` entry type, providing backwards compatibility for tests lacking explicit `faction`. Verify with unit tests in `src/ui/combat/CombatLogPanel.test.ts`.
- [x] 3.2 Add CSS theme classes in `src/ui/combat/CombatArena.css` for `.faction-player`, `.faction-enemy`, `.faction-neutral`, and `.log-environment-card`, updating card left-borders, actor name coloring, and badges. Verify visual styling in `CombatLogPanel.test.ts` snapshot / static markup assertions.

## 4. Interactive Unit Filtering (UX.4)

- [x] 4.1 Add unit filter state and selector controls to the `CombatLogPanel` header in `src/ui/combat/CombatLogPanel.tsx`, allowing selection between "All Units" and individual combatants present in the battle. Verify component renders the unit filter controls in `CombatLogPanel.test.ts`.
- [x] 4.2 Implement unit filtering logic filtering displayed cards by `actorUnitId` or `affectedUnitIds`, including empty state hints when no actions exist for a selected unit. Verify unit filtering behavior across attack, move, and area effect entries in `CombatLogPanel.test.ts`.

## 5. Versioning, Release Notes & Build Verification

- [x] 5.1 Bump version to `0.13.0` in `package.json` and add an end-user facing entry in `CHANGELOG.md` highlighting faction-colored combat log cards, formatted fall/hazard chronicle entries, and the new unit filter. Verify that no technical or internal IDs are included in `CHANGELOG.md`.
- [x] 5.2 Run `npm run build` and execute the full test suite via `npm test` to verify clean builds and zero test regressions.
