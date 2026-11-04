# Tasks: Deployment Budget & Threat Calibration

## 1. Threat Projection & Pre-Ascension Calibration

- [x] 1.1 Implement `computeProjectedUnitThreat` and `computeProjectedSquadThreat` in `src/core/campaign/threatBudget.ts` (evaluating +1 level threat when a unit meets its level XP threshold) and verify with unit tests in `src/core/campaign/threatBudget.test.ts`.
- [x] 1.2 Update `resolveCampaignVictory` in `src/core/campaign/transitions.ts` to generate the next stage encounter using projected squad threat and verify with tests in `src/core/campaign/transitions.test.ts`.

## 2. Deployment Point Budget & Stable Incursion Transitions

- [x] 2.1 Define canonical stage deployment budget schedule in `src/core/campaign/threatBudget.ts` and refactor `setCampActiveSquad` in `src/core/campaign/transitions.ts` to validate squad threat against the stage budget without a 3-unit cap, synchronizing player deployment tokens while preserving enemy incursion state. Verify with unit tests in `src/core/campaign/transitions.test.ts`.
- [x] 2.2 Update `src/ui/camp/ActiveSquadDock.tsx` and `src/ui/camp/ExpeditionWarRoom.tsx` to display active deployment points vs stage budget (e.g. `105 / 120 Pts`) and support dynamic vanguard sizing without 3-slot layout constraints. Verify with UI tests in `src/ui/camp/ActiveSquadDock.test.tsx` and `src/ui/camp/ExpeditionWarRoom.test.tsx`.

## 3. Dynamic Arena Sizing & Deployment Zones

- [x] 3.1 Update `getDeploymentZones(radius)` in `src/core/campaign/encounterGenerator.ts` to generate candidate spawn coordinates for Radius 3 (4 per side), Radius 4 (6 per side), and Radius 5 (8-10 per side). Verify with tests in `src/core/campaign/encounterGenerator.test.ts`.
- [x] 3.2 Update `generateStageEncounter` in `src/core/campaign/encounterGenerator.ts` to dynamically set arena radius based on stage and combined unit count (Radius 3 for Stage 1, Radius 4 min for Stage 2+, Radius 5 if total units >= 7). Verify with tests in `src/core/campaign/encounterGenerator.test.ts`.

## 4. Multi-Unit Enemy Squads & Resonant Loadouts

- [x] 4.1 Refactor `assembleEnemySquad` in `src/core/campaign/encounterGenerator.ts` to spend threat budgets flexibly on multiple units of the highest appropriate tiers for the stage without single-unit-per-tier caps or a 4-unit squad ceiling. Verify with tests in `src/core/campaign/encounterGenerator.test.ts`.
- [x] 4.2 Refactor `createEnemyUnit` in `src/core/campaign/encounterGenerator.ts` to equip wildcard domain abilities and passives derived from the unit's unlocked constellation lineage rather than static Novice starter spells and static Momentum. Verify with tests in `src/core/campaign/encounterGenerator.test.ts`.

## 5. Verification, Documentation & Release

- [x] 5.1 Run full project test suite (`cmd.exe /c npm test`) to verify all combat simulations, campaign integrations, and UI components pass cleanly.
- [x] 5.2 Update `CHANGELOG.md` with end-user facing release notes for v0.10.0 (focusing on point-based army building, larger battle arenas, and tougher coordinated enemies with varied class abilities) and bump version to `0.10.0` in `package.json`.
- [x] 5.3 Run `cmd.exe /c npm run build` to verify clean TypeScript compilation and Vite production build.
