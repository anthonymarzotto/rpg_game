# Proposal: Deployment Budget & Threat Calibration

## Why

Mid-to-late campaign trials currently feel under-tuned and lack tactical friction. Two root causes drive this difficulty collapse:
1. **Pre-Ascension Threat Lag**: Enemies for the next trial are generated immediately following battle victory before player ascensions take effect in Camp, calculating threat against un-promoted units.
2. **Artificial Squad Composition & Size Caps**: The player vanguard is rigidly capped at 3 units, while the enemy squad generator limits itself to at most one unit of each tier and fills all remaining slots with fragile Level-0 Novices.

This structure makes it impossible to field a Novice in later stages without sacrificing 33% of the party's combat power, while simultaneously preventing battles from expanding into larger tactical clashes. We need a point-based deployment budget that enables flexible squad sizes (including squires and auxiliary recruits), paired with calibrated enemy threat, dynamic arena sizing (Radius 3, 4, 5), and resonant enemy loadouts.

## What Changes

- **Point-Based Vanguard Deployment Budget**: Replace the hardcoded 1–3 unit squad restriction with a stage-scaled deployment point cap (Novice = 10 pts, Tier 1 = 25 pts, Tier 2 = 40 pts, Tier 3 = 55 pts, Tier 4 = 70 pts). Players can deploy any number of Wayfarers up to their stage budget.
- **Pre-Ascension Threat Projection**: When generating next-stage incursions at trial victory, project unit threat by +1 level if the unit has enough accumulated XP to qualify for an ascension in Camp.
- **Stable Incursion Recon**: Swapping heroes in Camp synchronizes player tokens on the battlefield without re-rolling or rubber-banding enemy threat, preserving true scrying intel in the War Room.
- **Budget-Driven Multi-Tier Enemy Squads**: Remove the artificial 4-unit cap and single-unit-per-tier bottleneck in enemy generation. Enemy squads can now field multiple Tier-1, Tier-2, or Tier-3 combatants calibrated to the stage budget.
- **Resonant Enemy Ability & Passive Loadouts**: Generated enemies dynamically equip domain abilities and passives drawn from their unlocked constellation lineage rather than random Novice starter spells and static Momentum.
- **Dynamic Arena Sizing (Radius 3, 4, and 5)**: Scale the battlefield to match the battle size: Radius 3 for Stage 1, Radius 4 minimum for Stage 2+, and expand to Radius 5 (91 hexes) when combined deployed units (player + enemy) reach 7 or more.
- **Semantic Version Bump**: Target version **v0.10.0** (minor bump) reflecting substantial new campaign progression mechanics, deployment budgeting, and tactical battlefield expansion.

## Capabilities

### Modified Capabilities

- `encounter-generation`:
  - Compute squad threat incorporating single-step pre-ascension level projection.
  - Assemble enemy rosters by allocating budget across multiple tier-appropriate units without single-unit-per-tier caps.
  - Equip generated enemies with resonant domain abilities and passives from their constellation lineage.
  - Dynamically scale arena radius between Radius 3 (Stage 1), Radius 4 (Stage 2+), and Radius 5 (combined units >= 7), generating expanded perimeter deployment coordinates for each radius.
- `campaign-progression`:
  - Validate active squad deployment against the stage deployment point budget rather than a fixed 3-unit limit.
  - Maintain stable incursion state during Camp squad configuration so swapping vanguard units synchronizes player deployment tokens without mutating enemy composition.

## Impact

- **Core Campaign Logic**: `src/core/campaign/threatBudget.ts`, `src/core/campaign/encounterGenerator.ts`, `src/core/campaign/transitions.ts`.
- **UI Presentation**:
  - `src/ui/camp/ActiveSquadDock.tsx`: Adapt to dynamic vanguard sizing, showing active deployment points and capacity (e.g. `105 / 120 Pts`).
  - `src/ui/camp/ExpeditionWarRoom.tsx`: Display accurate stable recon and estimated threat.
- **Testing**: Update unit and integration tests across campaign transitions, encounter generation, and combat simulation suites.
