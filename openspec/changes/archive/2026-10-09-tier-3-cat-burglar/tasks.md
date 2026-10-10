# Tasks

## 1. Core Class Package & Abilities

- [x] 1.1 Author `ROOFTOP_VAULT`, `PILFER`, `FLASH_POWDER`, `FELINE_GRACE`, and `CAT_BURGLAR_PACKAGE` in `src/data/packages/catBurglar.ts` and verify unit tests in `src/core/combat/catBurglarIntegration.test.ts`
- [x] 1.2 Export and register Cat-burglar in `src/data/packages/index.ts` and verify `getClassPackage('cat-burglar')`, `getAbilityById`, and `getPassiveById` lookups in `src/core/units/packages.test.ts`

## 2. Knockback Rebound & Collision Engine

- [x] 2.1 Update `calculateKnockback` in `src/core/grid/arena.ts` and `resolveCollisionDamage` in `src/core/combat/damageEngine.ts` to support cat-like rebound (stepping onto cliff tops on $\Delta h \ge 2$, vaulting over 1-hex obstacles, and taking 0 collision damage against perimeter walls) when target has `immuneToCollisionDamage` / `canVaultOnKnockback`, verifying with unit tests in `src/core/combat/displacement.test.ts`
- [x] 2.2 Wire up Flash Powder blast facing reversal (`FORCE_FACING_AWAY` relative to blast center/actor) and -2 Attack Roll in `src/core/combat/resolver.ts` and `src/core/combat/effects/conditionHandler.ts`, verifying with tests in `src/core/combat/catBurglarIntegration.test.ts`

## 3. Skirmisher AI Heuristics & Campaign Integration

- [x] 3.1 Update `scoreDebuffAndUtility` and `decisionEngine.ts` in `src/core/ai/` to prioritize the Solo Heist combo (`Flash -> Vault -> Pilfer`) and evaluate high-ground leaping for `SKIRMISHER`, verifying with tests in `src/core/ai/decisionEngine.test.ts`
- [x] 3.2 Add `'cat-burglar'` to `TIER3_CLASSES` in `src/core/campaign/encounterGenerator.ts`, add badge palette in `src/ui/combat/tokenAssets.ts`, and verify encounter generation tests in `src/core/campaign/encounterGenerator.test.ts`

## 4. Verification & Roadmap Sync

- [x] 4.1 Run full headless test suite (`cmd.exe /c npm test`) and verify 100% test pass rate with zero regressions
- [x] 4.2 Update `docs/plans/DEVELOPMENT_PLAN_2026_10_04.md` to reflect finalized Phase 6b kit specifications and active implementation status
