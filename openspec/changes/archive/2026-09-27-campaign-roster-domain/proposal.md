# Proposal

## Why

Tactical combat is currently restricted to an isolated single-battle sandbox where hardcoded squads fight one encounter and post-battle progression is discarded upon resetting or rematching. To establish a genuine tactical RPG loop, we need a decoupled Campaign and Roster domain model that manages persistent heroes, banks earned archetype XP across battles, and dynamically generates stage-appropriate encounters calibrated to the squad's collective strength.

## What Changes

- Add `accumulatedXp: ArchetypePoints` to `UnitProgression` so that unspent and cross-archetype XP survives between encounters and browser sessions.
- Implement `CampaignState` domain model tracking run metadata, persistent party roster (`Unit[]`), active deployed squad (`activeSquadIds: string[]`), current stage index, and campaign battle history.
- Implement `createCampaign()` factory initializing a new run with 3 randomly generated Level-0 Novices with procedural names and rolled starter kits drawn from the Novice package pool.
- Implement a D&D-inspired Threat Rating / Challenge Rating encounter generator (`generateStageEncounter`) that procedurally crafts balanced enemy squads and hex arenas (radius 3-4 with obstacles and connectivity) matching composite squad level and stage index using existing class kits (Novice, Warrior, Thief, Wizard).
- Implement pure campaign transition reducers:
  - `resolveCampaignVictory`: Full HP restore, bank in-battle XP to `accumulatedXp`, advance stage, pre-generate next encounter.
  - `resolveCampaignDefeat`: Full HP restore, revert in-battle XP from the failed run, preserve current stage for retry or re-roll.
  - `allocateCampArchetypePoint`: Spend threshold XP (5 for Lvl 1, 10 for Lvl 2...) on an eligible archetype in Camp, advancing level and preserving all unspent XP.
  - `updateCampUnitLoadout` & `setCampActiveSquad`: Configure equipped classes, wildcard skills/passives, and active battle squad in Camp.
  - `regenerateCurrentStageEncounter`: Re-roll the pending encounter for the current stage with a new seed.
- Implement comprehensive headless Vitest test suites verifying campaign creation, stage scaling, defeat reversion, multi-level advancement, and loadout editing.

## Capabilities

### New Capabilities
- `campaign-progression`: Pure campaign lifecycle, persistent roster management, Camp multi-level advancement, and battle outcome reconciliation.
- `encounter-generation`: Threat-budgeted Challenge Rating procedural encounter and arena generation based on squad composition and stage index.

### Modified Capabilities
<!-- None: No existing specs defined -->

## Impact

- `src/core/types/class.ts`: Adds optional/defaulted `accumulatedXp` to `UnitProgression`.
- `src/core/units/unitFactory.ts`: Extends `createRecruit` to initialize zeroed `accumulatedXp`.
- `src/core/progression/postBattle.ts`: Reconciles directly with `accumulatedXp`.
- `src/core/campaign/`: New domain module (`types.ts`, `campaignFactory.ts`, `encounterGenerator.ts`, `transitions.ts`, `threatBudget.ts`).
- Existing combat execution in `src/core/combat/` remains untouched and completely decoupled, consuming generated `EncounterDefinition` inputs.
