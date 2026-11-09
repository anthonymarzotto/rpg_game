# Tasks

## 1. Class Package Definition & Core Ability Implementation

- [x] 1.1 Author `SHIELD_BEARER_PACKAGE` in `src/data/packages/shieldBearer.ts` with `BASTION_PLANT`, `INTERCEPT_STEP`, `CONCUSSIVE_SLAM`, and `UNYIELDING_STANCE`, and verify with unit tests in `src/core/units/packages.test.ts`.
- [x] 1.2 Export and register the package and abilities in `src/data/packages/index.ts`, and verify package resolution via `getClassPackage('shield-bearer')` in test suite.

## 2. Combat Mechanics & Effect Handlers

- [x] 2.1 Implement `POSITION_SWAP` effect handler and action validator in `src/core/combat/effects/` supporting range 1-3 ally swapping for `Intercept Step`, and verify with dedicated effect tests.
- [x] 2.2 Implement displacement immunity check in `knockbackHandler.ts` and `retreatHandler.ts` for units equipped with `immuneToDisplacement` (`Unyielding Stance`), and verify with displacement test scenarios.
- [x] 2.3 Implement forward Zone of Control traversal interruption and rear-arc ranged cover evaluation for `Bastion Plant` in combat resolution, verifying with pathfinding and damage mitigation tests.

## 3. Token Whitelist, Badge Palette & AI Integration

- [x] 3.1 Whitelist `05_human_male` in `AVAILABLE_PIXEL_TOKENS` and add the `shield-bearer` palette (`#334155` / `#10b981`) in `src/ui/combat/tokenAssets.ts`, verifying with `tokenAssets.test.ts`.
- [x] 3.2 Wire up `BRAWLER` AI decision hints for `Bastion Plant` and `Concussive Slam` in `src/core/ai/`, verifying AI behavior in `decisionEngine.test.ts`.

## 4. Verification, Release Notes & Build

- [x] 4.1 Run full test suite (`cmd.exe /c npm test`) and cross-class simulation benchmarks, verifying Shield-bearer combat matchups run cleanly without regressions.
- [x] 4.2 Update `CHANGELOG.md` with an end-user facing description of the new Shield-bearer class and bump version in `package.json` to `0.14.0`.
- [x] 4.3 Run `cmd.exe /c npm run build` to verify production TypeScript compilation and bundling succeed.
