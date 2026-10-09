# Tasks: Campaign Tier 3 Encounters & Token Mapping

## 1. Core Tier 3 Enemy Generation & Progression

- [x] 1.1 Extend `src/core/campaign/encounterGenerator.ts` with `EnemyTier3Class` (`cavalier` | `berserker` | `highwayman` | `warlock` | `witch`) and `TIER3_CLASSES` array. Verify with TypeScript compilation.
- [x] 1.2 Update `createEnemyUnit` in `src/core/campaign/encounterGenerator.ts` to advance archetype levels matching hybrid class requirements (dominant archetype first) and equip class packages. Verify with unit tests in `encounterGenerator.test.ts`.

## 2. Stage 5+ Squad Assembly & Threat Budgeting

- [x] 2.1 Update `assembleEnemySquad` in `src/core/campaign/encounterGenerator.ts` to spawn Tier 3 enemies (55 threat cost) when `stage >= 5` and budget permits. Verify squad size remains within bounds (2–4 units).
- [x] 2.2 Update `generateStageEncounter` to ensure Stage 5+ encounters apply a minimum threat budget floor of 60 points (`Math.max(targetBudget, 60)`). Verify budget scaling across stages.
- [x] 2.3 Expand `src/core/campaign/encounterGenerator.test.ts` with tests for Stage 5+ encounters, verifying Tier 3 adversary appearance, proper archetype points, and determinism. Verify by running `npm test src/core/campaign/encounterGenerator.test.ts`.

## 3. Token Assets & Class Badge Palettes

- [x] 3.1 Expand `CLASS_BADGE_PALETTES` in `src/ui/combat/tokenAssets.ts` to include `infiltrator` and `sorcerer`, and export `getClassBadgePalette(classId?: string)`. Verify with unit tests.
- [x] 3.2 Update `src/ui/combat/tokenAssets.test.ts` to verify `getClassBadgePalette` resolution and token asset paths for all Tier 3 classes. Verify by running `npm test src/ui/combat/tokenAssets.test.ts`.

## 4. UI Presentation & Integration Verification

- [x] 4.1 Update `src/ui/combat/UnitStatusCard.tsx` and `CombatArena.css` to render `.unit-role-badge` styled dynamically with `getClassBadgePalette`. Verify unit role badge colors in UnitStatusCard.
- [x] 4.2 Update `docs/plans/DEVELOPMENT_PLAN_2026_10_04.md` to mark Phase 5.7 as completed once implementation passes.
- [x] 4.3 Run full test suite and validate OpenSpec change: run `npm test` and `openspec validate tier-3-encounters-and-tokens --strict`.
