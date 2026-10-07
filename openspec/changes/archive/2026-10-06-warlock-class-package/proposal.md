# Proposal: Tier 3 Warlock Class Package

## Why

As part of Phase 5 of the dual-archetype hybrid class progression (`DEVELOPMENT_PLAN_2026_10_04.md` Milestone 5.4), the game requires authoring the Tier 3 hybrid classes in the 100-class lattice. The Warlock (`#80`) occupies the `(1, 0, 2)` archetype position (Dominant Mage with Secondary Fighter), bridging occult spellcasting with battlemage grit and close-quarters resilience. Implementing this package expands tactical hybrid playstyles, giving players and AI an aggressive battlemage who can manipulate spacing with kinetic eldritch force, cut through heavy armor with a summoned magical blade, brand foes with demonic flame, and generate dual-layer defensive wards through offensive spell-weaving.

## What Changes

- **Author Warlock Class Package (`src/data/packages/warlock.ts`)**:
  - **Signature Ability (`Eldritch Blast`)**: 2 AP, Range 3, Single Target, `1d8 + Focus` magical damage vs Resolve, knocking the target back 1 hex (`KNOCKBACK 1`) with wall-slam collision risk scaling with Focus.
  - **Domain Ability 1 (`Pact Blade`)**: 1 AP, Range 1, Single Target, `1d6 + Focus` magical damage vs Resolve, bypassing physical Armor.
  - **Domain Ability 2 (`Hellfire Brand`)**: 1 AP, Range 2, Single Target, `1d4 + Focus` magical damage vs Resolve, inflicting `BURN` DoT (2 damage/turn for 2 turns).
  - **Passive Trait (`Soul Carapace`)**: Trigger hook on magical hit (`triggerFilter: { damageType: 'MAGICAL' }`). Grants self `+1 Armor` and `+1 Ward` for 1 turn upon landing a magical attack.
  - **Class Package Metadata**: `WARLOCK_PACKAGE` with `classId: 'warlock'`, `className: 'Warlock'`, AI profile `SNIPER`.
- **Register Warlock Package (`src/data/packages/index.ts`)**:
  - Export `WARLOCK_PACKAGE`, its abilities, and passive trait in `CLASS_PACKAGES`, `ABILITIES_BY_ID`, and `PASSIVES_BY_ID`.
- **Expose Passive Hook on Magical Attack Resolution (`src/core/combat/resolver.ts` / `effects/`)**:
  - Ensure the passive hook fires on magical attacks to apply the `Soul Carapace` stat modifier (`+1 Armor` and `+1 Ward` for 1 turn).
- **Update Class Catalog & Unit Loadouts (`src/data/classes.ts`, `src/core/units/loadout.ts`)**:
  - Verify class `#80` loads Warlock package skills and passive automatically.
- **AI Standoff & Ability Heuristics (`src/core/ai/`)**:
  - Map `warlock` to `SNIPER` profile, hovering at Range 2–3 while using `Pact Blade` when engaged at Range 1.
- **Integration Tests**:
  - Comprehensive unit and integration test suite covering `Eldritch Blast` damage and collision knockback, `Pact Blade` armor bypass, `Hellfire Brand` burn application, `Soul Carapace` on-hit dual mitigation buff, and AI execution.

## Capabilities

### New Capabilities
- `tier-3-warlock`: Core class package, abilities, passive trait, combat resolution, and AI profile for the Tier 3 Warlock hybrid class.

### Modified Capabilities
<!-- None: No existing capabilities change requirements. -->

## Impact

- `src/data/packages/warlock.ts`: New file containing abilities, passive, and package contract.
- `src/data/packages/index.ts`: Exporting Warlock package, abilities, and passive.
- `src/core/types/passive.ts`: Hook / filter support for on-hit magical triggers if needed.
- `src/core/combat/resolver.ts`: Triggering on-hit passives upon successful magical attacks.
- `src/core/ai/heuristics.ts`: Ensuring Warlock resolves to `SNIPER` AI profile.
- Integration tests in `src/core/combat/warlockIntegration.test.ts`.
