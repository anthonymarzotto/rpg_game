# Tasks

## 1. Core Combat Log Metadata, Logger & Ground HEX Roll Breakdown

- [x] 1.1 Extend `CombatLogMetadata` in `src/core/combat/types.ts` with `DEFEATED` (unit, lethal condition/cause) and `ZONE_OF_CONTROL` (halted unit, guardian unit, ability name) variants, and add `combatLogger.logDefeat` and `combatLogger.logZoneOfControl` in `src/core/combat/combatLogger.ts` with unit tests in `src/core/combat/combatLogger.test.ts` verifying `faction` and dual `affectedUnitIds`.
- [x] 1.2 Extract/reuse the attack modifier breakdown builder in `src/core/combat/attackRoll.ts` and invoke it in the ground-targeted `HEX` branch of `src/core/combat/resolver.ts` so `Wyrmflame Breath` and empty-hex `Arcane Blast` populate `attackRollBreakdown`; verify with targeted tests in `src/core/combat/resolver.test.ts` and `src/core/combat/effects/dragoonMechanics.test.ts`.
- [x] 1.3 Append applied `BURN` (and cone `CONDITION`) details to `splashLogDetails` for cone hits in `src/core/combat/resolver.ts`; verify `secondaryDetail` includes both damage/DC and Burn information in `src/core/combat/effects/dragoonMechanics.test.ts`.

## 2. Migrate Remaining Generic Emitters (Status Defeat & Zone of Control)

- [x] 2.1 Update DoT defeat handling in `src/core/combat/turnClock.ts` to track the lethal condition name(s) and emit `combatLogger.logDefeat` instead of `logGeneric`; verify with unit tests in `src/core/combat/turnClock.test.ts` (or `conditions.test.ts`).
- [x] 2.2 Update Zone of Control interruption in `src/core/combat/resolver.ts` to emit `combatLogger.logZoneOfControl` with both the moving unit and Shield-bearer in `affectedUnitIds`; verify with unit tests in `src/core/combat/effects/shieldBearerMechanics.test.ts`.

## 3. Combat Log UI Chip Order, Simplification & New Cards

- [x] 3.1 Update `.log-impact-line` in `src/ui/combat/CombatLogPanel.tsx` to place `.log-roll-chip` before `.impact-damage` / `Missed`, simplify roll chips to `🎲 <totalScore> vs DC <dc>` or `🎲 <totalScore>` (removing `"Spellcast Roll & Score"` and `(Score N)`), simplify damage chips to `💥 <damageTotal> dmg` (retaining inline fallbacks only when breakdown components are absent), and update/add unit tests in `src/ui/combat/CombatLogPanel.test.ts`.
- [x] 3.2 Add `parseCombatLogMessage` handling, dedicated `DEFEATED` (`💀 DEFEATED`) and `ZONE_OF_CONTROL` (`🛡️ ZONE OF CONTROL`) card renderers, and faction-themed `GENERIC` fallback styling in `src/ui/combat/CombatLogPanel.tsx` and `src/ui/combat/CombatArena.css`, and verify with rendering and unit-filter tests in `src/ui/combat/CombatLogPanel.test.ts`.

## 4. Release Notes, Version Bump & Build Verification

- [x] 4.1 Bump `version` in `package.json` from `0.17.2` to `0.17.3` and add a strictly end-user-facing entry in `CHANGELOG.md` covering the cleaner Combat Log roll/damage chips, hover breakdowns on cone/area spells, and formatted status-defeat and Zone of Control cards (no file/symbol/CSS names or internal task IDs).
- [x] 4.2 Run `cmd.exe /c "npm run build && npm test"` and confirm TypeScript compilation, production bundle, and the full test suite pass with zero failures.
