# Tasks: Tier 4 Dragoon Class Kit & Token Integration

## 1. Combat Engine & Positioning Mechanics

- [x] 1.1 Implement Virtual Height state tracking on `CombatUnit`, hook unspent AP evaluation in `turnClock.ts` on active turn end, and integrate Virtual Height into `calculateElevationAttackModifier` and damage resolution in `src/core/combat/attackRoll.ts`.
- [x] 1.2 Implement `Dragon Dive` aerial vault trajectory resolution in `src/core/combat/resolver.ts` and `src/core/combat/validator.ts` (landing in Far Hex rear arc with Near Hex fallback, ignoring intervening obstacles).
- [x] 1.3 Implement `Piercing Thrust` line penetration effect handler in `src/core/combat/effects/` resolving primary damage to the front target and `1d4 + Force` collateral damage to the aligned rear unit.
- [x] 1.4 Implement `Wyrmflame Breath` 4-hex forward cone template generation and multi-target Resolve attack resolution.
- [x] 1.5 Add unit test suite in `src/core/combat/effects/dragoonMechanics.test.ts` verifying aerial vault landing, line penetration, cone AoE, and Virtual Height defense/offense mechanics.

## 2. Dragoon Class Package & Progression Catalog

- [x] 2.1 Author `src/data/packages/dragoon.ts` defining `DRAGOON_PACKAGE`, `DRAGON_DIVE`, `PIERCING_THRUST`, `WYRMFLAME_BREATH`, and `COILED_APEX`.
- [x] 2.2 Register Dragoon package, abilities, and passive in `src/data/packages/index.ts` (`CLASS_PACKAGES`, `ABILITIES_BY_ID`, `PASSIVES_BY_ID`).
- [x] 2.3 Add progression and package integration tests in `src/core/units/packages.test.ts` and `src/core/combat/dragoonIntegration.test.ts` verifying wildcard loadouts and active class bonuses.

## 3. Token Whitelist & Visual Identity

- [x] 3.1 Whitelist `07_human_male` in `AVAILABLE_PIXEL_TOKENS` and configure `CLASS_BADGE_PALETTES.dragoon` with Deep Dragon Violet (`#312e81`) and Radiant Crimson (`#e11d48`) in `src/ui/combat/tokenAssets.ts`.
- [x] 3.2 Add token asset and badge palette unit tests in `src/ui/combat/tokenAssets.test.ts`.

## 4. AI Heuristic Calibration & Combat Simulation

- [x] 4.1 Calibrate `BRAWLER` AI decision profile and action hints for `DRAGON_DIVE`, `PIERCING_THRUST`, and `WYRMFLAME_BREATH` in `src/core/ai/decisionEngine.ts`.
- [x] 4.2 Run 1v1 and 3v3 combat simulation benchmarks in `src/core/combat/squadBenchmarks.test.ts` to verify balance metrics.

## 5. Version Bump, Release Notes & Verification

- [x] 5.1 Bump version to `0.15.0` in `package.json` and author user-facing release notes in `CHANGELOG.md` highlighting the new Dragoon class, aerial vaulting, and fiery dragon breath.
- [x] 5.2 Execute `npm test` and `npm run build` to verify clean compilation and zero test regressions across all suites.
