# Tasks

## 1. Passive Trigger Hook Extension

- [x] 1.1 Add `'ON_HIT'` to `PassiveTriggerHook` in `src/core/types/passive.ts` and verify typechecking passes
- [x] 1.2 Wire `triggerPassiveHook(state, actorCu, 'ON_HIT', ...)` in `src/core/combat/resolver.ts` when an attack scores a `SOLID_HIT` or `CRITICAL_HIT`, and verify generic effect execution

## 2. Warlock Class Package Authoring

- [x] 2.1 Author `ELDRITCH_BLAST`, `PACT_BLADE`, `HELLFIRE_BRAND`, `SOUL_CARAPACE`, and `WARLOCK_PACKAGE` in `src/data/packages/warlock.ts` conforming to the spec
- [x] 2.2 Register `WARLOCK_PACKAGE` in `src/data/packages/index.ts`, map `warlock` to `SNIPER` AI profile in `src/core/ai/heuristics.ts`, and update wildcard progression in `src/core/progression/harmonization.ts`

## 3. Combat Integration & Verification

- [x] 3.1 Author `src/core/combat/warlockIntegration.test.ts` verifying package loadout resolution, Eldritch Blast knockback and Focus wall-slam collision, Pact Blade armor bypass vs Ward, Hellfire Brand burn infliction, Soul Carapace on-hit dual mitigation (+1 Armor, +1 Ward for 1 turn), and AI profile resolution
- [x] 3.2 Execute full test suite (`cmd.exe /c npm test`) and production build check (`cmd.exe /c npm run build`) to ensure zero regressions across all packages
