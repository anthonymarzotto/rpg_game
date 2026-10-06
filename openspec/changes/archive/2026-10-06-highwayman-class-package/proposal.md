# Proposal

## Why

As part of Phase 5 of the dual-archetype hybrid progression roadmap (`DEVELOPMENT_PLAN_2026_10_04.md`), the game requires complete bespoke class packages for all Tier 3 hybrid classes. Following the completion of the Cavalier (Fighter 2, Rogue 1) and Berserker (Fighter 2, Mage 1), the Highwayman (`1 Fighter, 2 Rogue, 0 Mage`, Class #64) represents the dominant-Rogue counterpart to the Cavalier. 

Instead of a generic shotgun/smoke commando, the Highwayman embodies the debonair "Gentleman of the Road"—a masked ambusher who holds up heavily armored travelers, strips their defensive wealth, and executes stylish hit-and-run combat maneuvers.

## What Changes

- **Highwayman Class Package (`src/data/packages/highwayman.ts`)**:
  - **Signature Ability**: `Point-Blank Buckshot` (2 AP, range 1–2, 1d8 + Finesse physical damage vs Evasion, displaces target backward 1 hex with wall-slam collision risk).
  - **Domain Ability 1**: `Stand and Deliver!` (1 AP, range 1–2 utility hold-up, automatically inflicts 30 CTB initiative delay and -2 Armor for 2 turns on target).
  - **Domain Ability 2**: `Gallant Flourish` (1 AP, range 1 melee, 1d4 + Finesse physical damage vs Evasion, grants self +2 Evasion for 1 turn).
  - **Innate Passive Trait**: `Highway Toll` (+2 flat physical damage on attacks targeting units with positive Armor > 0).
  - **AI Profile**: `SKIRMISHER` (proactively seeks range 1–2, targets armored foes, uses Buckshot to create space).
- **Target Armor Passive Evaluation (`src/core/combat/damageEngine.ts`, `src/core/types/passive.ts`)**:
  - Adds optional target-dependent armor check to `PassiveTrait` and `resolveDamage()` to enable anti-armor/wealth-punishing damage bonuses.
- **Global Package & Wildcard Registration (`src/data/packages/index.ts`, `src/core/progression/harmonization.ts`)**:
  - Registers `HIGHWAYMAN_PACKAGE` into the package catalog and equips domain abilities into wildcard progression pools.
- **Encounter Generation & Progression Integration**:
  - Integrates the Highwayman into test encounters and AI skirmisher evaluations.

## Capabilities

### New Capabilities
- `tier-3-highwayman`: Defines the complete class package, active combat abilities (`Point-Blank Buckshot`, `Stand and Deliver!`, `Gallant Flourish`), passive trait (`Highway Toll`), and target-armor damage scaling for the Highwayman class.

### Modified Capabilities
<!-- None: existing capability requirements remain untouched -->

## Impact

- **Affected Systems**: `src/data/packages/highwayman.ts`, `src/core/types/passive.ts`, `src/core/combat/damageEngine.ts`, `src/data/packages/index.ts`.
- **Breaking Changes**: None. All new abilities and passives compose atop existing atomic handlers without modifying existing classes or breaking public contracts.
