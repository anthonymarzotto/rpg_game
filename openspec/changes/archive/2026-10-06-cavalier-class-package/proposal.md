# Proposal: Cavalier Class Package

## Why

Phase 5 of the development roadmap expands Astral Tactics into Tier 3 dual-archetype hybrid classes in the 100-class lattice. The Cavalier `(2 Fighter, 1 Rogue, 0 Mage)` is the first hybrid class to be introduced, embodying a dashing, foppish mounted shock vanguard who pairs martial force and kinetic lance charges with fencing flair, melee taunting, and slippery evasion.

## What Changes

* **New Class Package (`src/data/packages/cavalier.ts`)**:
  * **Signature Ability — `Lance Charge`**: 2 AP, Range 2–3 straight-line dash. The Cavalier rushes to the hex adjacent to the target, deals `1d8 + Force` physical damage vs Evasion, and pushes the target 1 hex backward with wall-slam collision risk.
  * **Domain Ability 1 — `Ride-Through`**: 1 AP, Range 1. A swift piercing strike dealing `1d4 + Finesse` physical damage that pushes the Cavalier *through* the target to the hex directly behind them (if unoccupied and walkable).
  * **Domain Ability 2 — `Flamboyant Flourish`**: 1 AP, Range 1. An aristocratic melee taunt that inflicts `CHALLENGED` on the target for 2 turns while granting the Cavalier `+2 Evasion` for 1 turn.
  * **Innate Passive Trait — `Impact Velocity`**: Collisions and wall-slams caused by this unit deal +2 bonus damage.
* **Global Package & Catalog Registration**:
  * Register `CAVALIER_PACKAGE` in `CLASS_PACKAGES`, `ABILITIES_BY_ID`, and `PASSIVES_BY_ID` within `src/data/packages/index.ts`.
  * Wire Cavalier's AI profile to `BRAWLER` in the package definition.
* **Pixel Token Whitelisting**:
  * Whitelist the existing pixel sprite set `01_human_male` in `src/ui/combat/tokenAssets.ts` for the Cavalier (`no: '01'`).

## Capabilities

### New Capabilities
- `tier-3-cavalier`: Defines the complete class package, active abilities (`Lance Charge`, `Ride-Through`, `Flamboyant Flourish`), passive mastery trait (`Impact Velocity`), and loadout integration for the Cavalier `(2, 1, 0)`.

### Modified Capabilities
<!-- None: existing Tier 1/Tier 2 packages and combat engine contracts are preserved without changes. -->

## Impact

* **`src/data/packages/cavalier.ts`**: New class package file.
* **`src/data/packages/index.ts`**: Registration of abilities and passives.
* **`src/ui/combat/tokenAssets.ts`**: Whitelisting `01_human_male` pixel sprite set.
* **Tests**: Unit tests for Cavalier abilities, displacement rush/penetration, and passive trait resolution in headless combat simulation.
