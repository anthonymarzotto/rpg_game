# Proposal: Tier 3 Berserker Class Package

## Why

As part of Phase 5.2 in the development roadmap, the Berserker represents the primal Fighter/Mage dual-archetype hybrid class at coordinates `(2 Fighter, 0 Rogue, 1 Mage)`. Delivering the Berserker class package expands the roster with a high-risk, high-reward offensive juggernaut that combines frontline multi-target physical cleaves with arcane flame and sacrificial blood empowerment, fulfilling the celestial progression path for hybrid warriors.

## What Changes

* **New Class Package**: Implement `BERSERKER_PACKAGE` in `src/data/packages/berserker.ts` with signature ability `Blood Frenzy`, domain abilities `Reckless Cleave` and `Ignite Rage`, passive trait `Deathbound Fury`, and AI profile `BRAWLER`.
* **Signature Primer (`Blood Frenzy`)**: 1 AP + 3 HP self-sacrifice primer that grants +1 Die Step and +2 Attack Roll bonus to the user's next physical attack this turn.
* **Frontal Arc Sweep (`Reckless Cleave`)**: 2 AP physical strike dealing 2d4 + Force damage to a primary target and sweeping all living enemies in adjacent frontal arc hexes for rolled collateral damage, at the cost of -2 Evasion for 1 turn.
* **Arcane Flame Strike (`Ignite Rage`)**: 1 AP magical strike dealing 1d6 + Focus damage vs Resolve and inflicting `BURN` DoT (2 damage/turn for 2 turns).
* **Low-HP Passive Mastery (`Deathbound Fury`)**: Innate passive granting +2 flat damage to physical attacks and expanding the Critical Hit threshold to 19–20 while at or below 50% maximum HP.
* **Catalog Registration & Loadout Integration**: Register the package in `src/data/packages/index.ts`, exposing the class for character equipping, AI profile routing, and wildcard domain ability selection.
* **Token Asset Mapping**: Connect the Berserker class sprite from `characters_packed.png` into `tokenAssets.ts` with appropriate palette badge.

## Capabilities

### New Capabilities
- `tier-3-berserker`: Defines the Tier 3 Berserker class package `(2, 0, 1)`, active abilities (`Blood Frenzy`, `Reckless Cleave`, `Ignite Rage`), passive mastery trait (`Deathbound Fury`), and AI combat behaviors.

### Modified Capabilities
*(None - existing class packages and combat resolution contracts remain unchanged)*

## Impact

* **Code Modules**: `src/data/packages/berserker.ts`, `src/data/packages/index.ts`, `src/ui/combat/tokenAssets.ts`, `src/core/ai/heuristics.ts`.
* **Combat Mechanics**: Introduces self-damage HP sacrifice on ability execution, frontal arc multi-target sweep execution, and conditional low-HP passive thresholds in damage calculation.
* **Backwards Compatibility**: Fully backwards compatible with existing class catalogs, unit factory resolution, and save states.
