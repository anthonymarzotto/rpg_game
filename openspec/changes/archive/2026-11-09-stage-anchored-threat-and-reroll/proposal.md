# Proposal: Stage-Anchored Threat Calibration & War Room Reroll

## Why

Mid-to-late campaign trials experience severe threat runaway (e.g. Stage 5 generating 475 pts of enemies against a player vanguard strictly capped at 200–220 pts) because encounter threat multiplies uncapped active squad size and pre-ascension projections across large rosters. Additionally, when players reconfigure or bench units in Camp to meet stage deployment caps, the pre-generated enemy encounter remains permanently locked in with no way to re-scry or re-roll the incursion.

## What Changes

- **Stage-Anchored Enemy Threat Calibration**: Anchor enemy encounter target budget directly to the stage deployment budget plus approximately one extra hostile of the highest unlocked tier for that stage (e.g. Stage 1: 30 + 10 = 40 pts, Stage 2: 80 + 25 = 105 pts, Stage 3: 120 + 40 = 160 pts, Stage 5: 200 + 55 = 255 pts, Stage 6: 220 + 55 = 275 pts).
- **Decouple Enemy Budget from Uncapped Squad Threat**: Eliminate compounding `squadThreat * (1 + 0.1 * stage)` multiplication from `encounterGenerator.ts` so an 8-unit roster or accumulated XP can never inflate enemy numbers beyond the stage tier baseline.
- **Expedition War Room Re-roll Control**: Add an "Astral Re-Scry" / "Re-roll Trial" button in `ExpeditionWarRoom` wired to `regenerateCurrentStageEncounter` in `CampHub`, allowing players to re-roll hostile compositions and terrain seeds at will from Camp.
- **Semantic Version Bump**: Target version **v0.14.1** (patch bump) addressing bug B.16 (trial threat runaway) and adding a Camp Hub quality-of-life control without breaking campaign save formats or public APIs.

## Capabilities

### Modified Capabilities

- `encounter-generation`: Anchor procedural enemy encounter threat target to stage deployment budget plus highest-tier hostile bonus, replacing runaway squad-scaled threat calculations.
- `camp-hub`: Provide an in-camp trial re-roll control in the Expedition War Room to generate a fresh stage encounter with an updated seed.

## Impact

- **Core Campaign Logic**: `src/core/campaign/threatBudget.ts`, `src/core/campaign/encounterGenerator.ts`.
- **UI Components**: `src/ui/camp/ExpeditionWarRoom.tsx`, `src/ui/camp/CampHub.tsx`.
- **Tests**: Update encounter generation test suites and camp hub integration tests.
