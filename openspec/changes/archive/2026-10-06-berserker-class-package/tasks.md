# Tasks

## 1. Combat Mechanics & Threshold Extensions

- [x] 1.1 Extend `PassiveTrait` with `healthThreshold` support in `src/core/types/passive.ts` and wire into `resolveDamage` and `getHitOutcome`
- [x] 1.2 Implement self-damage HP sacrifice handling with defeat on 0 HP in `src/core/combat/resolver.ts` and lethal cost warning in `src/ui/combat/ActionBar.tsx`
- [x] 1.3 Implement full-arc frontal sweep collateral damage handler in `src/core/combat/effects/cleaveHandler.ts` supporting multi-target arc resolution
- [x] 1.4 Add unit tests in `src/core/combat/effects/` verifying self-sacrifice, frontal sweep collateral damage, and low-HP threshold calculations

## 2. Berserker Class Package Authoring

- [x] 2.1 Author `BLOOD_FRENZY`, `RECKLESS_CLEAVE`, `IGNITE_RAGE`, `DEATHBOUND_FURY`, and `BERSERKER_PACKAGE` in `src/data/packages/berserker.ts`
- [x] 2.2 Register `BERSERKER_PACKAGE` in `src/data/packages/index.ts` and export all abilities, passives, and package constants
- [x] 2.3 Verify package lookup, domain ability retrieval, and wildcard slot resolution in `src/core/units/packages.test.ts`

## 3. Tactical AI Heuristics & Token Asset Mapping

- [x] 3.1 Wire Berserker token sprite mapping and crimson badge palette in `src/ui/combat/tokenAssets.ts`
- [x] 3.2 Add Brawler primer heuristics for `Blood Frenzy` in `src/core/ai/heuristics.ts` and verify in `src/core/ai/decisionEngine.test.ts`

## 4. End-to-End Integration & Verification

- [x] 4.1 Author comprehensive integration test suite `src/core/combat/berserkerIntegration.test.ts` testing full rotation, blood frenzy primer, arc cleaves, burn application, and passive low-HP scaling
- [x] 4.2 Run full test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`) with `BypassSandbox: true` to verify 100% test pass rate
