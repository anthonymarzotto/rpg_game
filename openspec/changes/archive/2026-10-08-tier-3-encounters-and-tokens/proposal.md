# Proposal: Campaign Tier 3 Encounters & Token Mapping

## Why

Following the completion of the five active Tier 3 hybrid class packages (Cavalier, Berserker, Highwayman, Warlock, Witch) and their behavioral AI decision heuristics in Phases 5.1–5.6, campaign encounters currently only spawn Novice, Tier 1, and Tier 2 enemies up to Stage 3. Adversaries in Stage 5 and beyond do not utilize the newly authored Tier 3 hybrid mechanics, and combat HUD surfaces lack unified class badge palette styling for all active classes. This change implements Phase 5.7 of the development roadmap by introducing Stage 5+ Tier 3 hybrid adversary generation with scaled threat budgets (60–80+ points) and formalizing pixel token mapping and class badge palettes across combat and camp UI surfaces.

## What Changes

- **Tier 3 Enemy Generation**: Extend `src/core/campaign/encounterGenerator.ts` with `EnemyTier3Class` (`cavalier`, `berserker`, `highwayman`, `warlock`, `witch`) and `TIER3_CLASSES`.
- **Hybrid Progression & Loadouts**: Update `createEnemyUnit` to advance archetype levels matching the exact requirements of hybrid classes (e.g. 2 Fighter + 1 Rogue for Cavalier) and equip their respective class packages.
- **Dynamic Threat Budgeting for Stage 5+**: Update `assembleEnemySquad` to spawn Tier 3 enemies (55 threat cost) when generating encounters for Stage 5+ with target budgets of 60–80+ points, maintaining squad size bounds (2–4 combatants).
- **Token Asset & Badge Palette Mapping**: Finalize `CLASS_BADGE_PALETTES` in `src/ui/combat/tokenAssets.ts` to include all authored classes (including Infiltrator and Sorcerer) and provide a `getClassBadgePalette` helper with fallbacks.
- **Dynamic HUD Badges**: Update `src/ui/combat/UnitStatusCard.tsx` (and associated styling in `CombatArena.css`) to display class-themed color badges for active and inspected combatants.
- **Test Verification**: Add unit tests in `src/core/campaign/encounterGenerator.test.ts` and `src/ui/combat/tokenAssets.test.ts` verifying Stage 5+ hybrid adversary composition, threat scaling, and token/badge resolution.

## Capabilities

### New Capabilities
- `token-assets`: Standardizes pixel token resolution, multi-directional rotation paths, and class-specific badge palettes across combat and camp UI components.

### Modified Capabilities
- `encounter-generation`: Extends enemy squad assembly to include Tier 2 and Tier 3 hybrid classes, scaling encounter threat budgets and spawning Tier 3 enemies at Stage 5+.

## Impact

- `src/core/campaign/encounterGenerator.ts`: Adds Tier 3 enemy types, hybrid progression advancement, and Stage 5+ squad assembly logic.
- `src/core/campaign/encounterGenerator.test.ts`: Adds test coverage for Stage 5+ encounters, Tier 3 adversary presence, and threat budget scaling.
- `src/ui/combat/tokenAssets.ts`: Completes class badge color palettes and provides badge lookup helper.
- `src/ui/combat/tokenAssets.test.ts`: Verifies badge palette mappings and token resolution.
- `src/ui/combat/UnitStatusCard.tsx`: Uses dynamic class badge styling for active and inspected units.
- `src/ui/combat/CombatArena.css`: Supporting style rules for dynamic class role badges.
