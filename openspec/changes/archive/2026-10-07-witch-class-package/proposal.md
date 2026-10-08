# Proposal: Tier 3 Witch Class Package

## Why
Phase 5 of the development roadmap expands the 100-class celestial lattice with Tier 3 dual-archetype hybrid classes. Following the completion of the Cavalier, Berserker, Highwayman, and Warlock packages, the Witch `(0 Fighter, 1 Rogue, 2 Mage)` is the next hybrid class to implement, introducing our first dedicated hybrid Support specialist that blends occult curse debilitations, forced-facing tempo control, allied CTB haste, and a foundational target-proximity defensive aura.

## What Changes
- Author the bespoke Tier 3 Witch class package in `src/data/packages/witch.ts` with signature ability `Baleful Hex`, domain abilities `Poppet Needle` and `Witch's Talisman`, innate passive trait `Misfortune Ward`, and default AI profile `SUPPORT`.
- Register the Witch class package in `src/data/packages/index.ts` and link it to Class #97 in `src/data/classes.ts`.
- Implement `Baleful Hex` (1 AP, Range 3 vs Resolve): deals `1d4 + Focus` magical damage, inflicts `POISON` DoT (2 dmg/turn for 2 turns), and delays target CTB initiative by 20 ticks (`CTB_DELAY`).
- Implement `Poppet Needle` (1 AP, Range 3 vs Resolve): deals `1d6 + Focus` magical damage, forces target facing 180° away from the actor, and inflicts -2 Resolve for 2 turns.
- Implement `Witch's Talisman` (1 AP, Range 2 on ally): grants target ally +25 CTB ticks (`INITIATIVE_BOOST`) and +2 Speed for 1 turn.
- Implement `Misfortune Ward` passive trait and engine aura infrastructure: extends `PassiveTrait` with an `aura` property; `attackRoll.ts` evaluates target-centric auras such that attacks targeting any ally (or self) within 2 hexes of an active unit with `Misfortune Ward` suffer -2 to their Attack Roll.
- Register all 3 new abilities in `src/data/abilities.ts`.
- Expand unit tests to thoroughly verify Witch package resolution, active ability execution, facing reversal, allied initiative buffing, aura roll penalties, and wildcard equipping.

## Capabilities

### New Capabilities
- `tier-3-witch`: Defines requirements, active abilities, forced-facing reversal, ally initiative boosting, and target-centric defensive aura for the Tier 3 Witch `(0, 1, 2)` class package.

### Modified Capabilities
<!-- No requirement changes to existing capability specs -->

## Impact
- **Core Combat**: `src/core/combat/attackRoll.ts` is updated to query target-centric defensive auras within hex radius.
- **Types**: `src/core/types/combat.ts` and `src/core/types/` passive definitions extended to support `aura` metadata (`radius`, `targetScope: 'ALLIES' | 'ENEMIES'`, `attackRollPenalty`).
- **Data & Packages**: New package file `src/data/packages/witch.ts`, abilities registered in `src/data/abilities.ts`, exported via `src/data/packages/index.ts`.
- **AI**: Maps `witch` class package to `SUPPORT` profile.
