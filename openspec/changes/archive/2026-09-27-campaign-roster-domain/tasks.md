# Tasks

## 1. Domain Types & Unit Model Extension

- [x] 1.1 Add `accumulatedXp` to `UnitProgression` in `src/core/types/class.ts` and initialize default zeroed values in `createRecruit` (`src/core/units/unitFactory.ts`), verifying with `unit.test.ts`.
- [x] 1.2 Define `CampaignState`, `CampaignHistory`, and encounter configuration types in `src/core/campaign/types.ts` and verify TypeScript compilation.

## 2. Campaign Factory & Procedural Recruits

- [x] 2.1 Implement `createCampaign` in `src/core/campaign/campaignFactory.ts` with procedural fantasy recruit names, rolled Novice starter abilities, and Stage 1 initialization.
- [x] 2.2 Add unit tests in `src/core/campaign/campaignFactory.test.ts` verifying starting roster of 3 Novices, unique IDs, active squad assignment, and zeroed accumulated XP.

## 3. Threat Budgeting & Procedural Encounter Generator

- [x] 3.1 Implement squad threat rating computation and stage budget scaling in `src/core/campaign/threatBudget.ts`, verifying with unit tests for Level 0 recruits and Level 1 promoted squads.
- [x] 3.2 Implement procedural arena generator with radius 3-4, 2-4 obstacles, and A* pathfinding connectivity verification in `src/core/campaign/encounterGenerator.ts`.
- [x] 3.3 Implement enemy squad composition assembly using Novice and Tier-1 packages matching threat budget in `src/core/campaign/encounterGenerator.ts`.
- [x] 3.4 Add unit tests in `src/core/campaign/encounterGenerator.test.ts` verifying deterministic seed generation, exact retry reproducibility, and traversable path connectivity.

## 4. Campaign State Transitions & Lifecycle Reducers

- [x] 4.1 Implement `resolveCampaignVictory` (full HP restore, bank in-battle XP into `accumulatedXp`, stage advance, pre-generate next encounter) in `src/core/campaign/transitions.ts`.
- [x] 4.2 Implement `resolveCampaignDefeat` (full HP restore, revert failed in-battle XP, preserve stage index) in `src/core/campaign/transitions.ts`.
- [x] 4.3 Implement `allocateCampArchetypePoint` (deduct threshold cost from chosen archetype, level up unit, preserve excess/cross-archetype XP) and `regenerateCurrentStageEncounter` in `src/core/campaign/transitions.ts`.
- [x] 4.4 Implement `updateCampUnitLoadout` and `setCampActiveSquad` in `src/core/campaign/transitions.ts`.
- [x] 4.5 Add unit tests in `src/core/campaign/transitions.test.ts` covering victory XP banking, defeat reversion, multi-level advancement, loadout editing, and squad swapping.

## 5. End-to-End Campaign Verification

- [x] 5.1 Create integration test `src/core/campaign/campaignIntegration.test.ts` executing a multi-battle campaign progression (Stage 1 -> Victory -> Camp Level Up -> Stage 2 -> Defeat -> Retry -> Victory) headless simulation.
- [x] 5.2 Run the full test suite (`npm test`) to verify zero regressions across existing combat, AI, grid, and progression modules.
