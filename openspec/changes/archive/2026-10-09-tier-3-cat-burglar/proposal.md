# Proposal

## Why

Following the completion of Phase 6's tactical verticality and dynamic elevation systems (discrete elevation tiers, weighted climb costs, unmitigated fall impact damage, and plunging knockback), the game requires its final Tier 3 hybrid class in the 100-class lattice: the **Cat-burglar** `(0, 2, 1)` (Dominant Rogue, Minor Mage). The Cat-burglar is specifically designed to leverage and subvert Phase 6's 3D spatial sandbox—vaulting over cliffs, siphoning turn tempo, disorienting enemy facing with thrown flash powder, and turning enemy knockbacks into tactical repositioning.

## What Changes

- **Cat-burglar Class Package (`src/data/packages/catBurglar.ts`)**:
  - **Signature Ability (`Rooftop Vault`)**: 1 AP, Range 2 hex leap (`targetType: 'HEX'`), effortlessly scaling cliffs ($\Delta h \ge 2$) and clearing intervening units/obstacles, granting self +2 Evasion for 1 turn upon landing.
  - **Domain Ability 1 (`Pilfer`)**: 1 AP, Range 1 melee attack dealing 1d4 + Finesse physical damage vs Evasion, siphoning 20 CTB initiative ticks directly from target to Burglar (target delayed 20 ticks, Burglar boosted 20 ticks).
  - **Domain Ability 2 (`Flash Powder`)**: 1 AP, Range 2 thrown blast (`aoeRadius: 1`), forcing all enemies in the area to face 180° away (`FORCE_FACING_AWAY`), exposing their REAR arc and inflicting -2 to Attack Rolls for 1 turn.
  - **Innate Passive Trait (`Feline Grace`)**: Immune to Fall Impact Damage (`immuneToFallDamage: true`), cat-like rebound on knockback (vaulting onto cliff tops when pushed into $\Delta h \ge 2$ cliffs, vaulting over obstacles, and taking 0 collision damage at map perimeter boundaries), plus +2 flat Evasion.
  - **AI Profile Mapping**: Configured with `SKIRMISHER` default AI profile.
- **Global Package & Ability Catalog Registration (`src/data/packages/index.ts`)**:
  - Export `CAT_BURGLAR_PACKAGE`, `ROOFTOP_VAULT`, `PILFER`, `FLASH_POWDER`, `FELINE_GRACE`.
  - Register in `CLASS_PACKAGES`, `ABILITIES_BY_ID`, and `PASSIVES_BY_ID`.
- **Knockback Vault Rebound Engine Integration (`src/core/grid/arena.ts`, `src/core/combat/effects/knockbackHandler.ts`)**:
  - Update `calculateKnockback` to support cat-like rebound when target has `immuneToCollisionDamage` / `canVaultOnKnockback`, allowing upward step onto cliffs and vaulting over 1-hex obstacles.
- **Campaign Encounter Budgeting & Token Presentation (`src/core/campaign/encounterGenerator.ts`, `src/ui/combat/tokenAssets.ts`)**:
  - Add `'cat-burglar'` to `TIER3_CLASSES` in `encounterGenerator.ts` for Stage 5+ procedural generation.
  - Add `cat-burglar` badge palette colors to `CLASS_BADGE_PALETTES` in `tokenAssets.ts` (using existing `83_human_male` sprite set).

## Capabilities

### New Capabilities
- `tier-3-cat-burglar`: Defines the complete class package, active combat abilities (`Rooftop Vault`, `Pilfer`, `Flash Powder`), innate passive trait (`Feline Grace`), AI skirmisher heuristics, campaign encounter integration, and UI badge palette for the Tier 3 Cat-burglar class `(0 Fighter, 2 Rogue, 1 Mage)`.

### Modified Capabilities
<!-- None: Grid elevation and displacement systems provide the underlying mechanics; Cat-burglar leverages existing hooks and extends knockback rebound for Feline Grace. -->

## Impact

- `src/data/packages/catBurglar.ts`: New class package definition.
- `src/data/packages/index.ts`: Catalog export and registration.
- `src/core/grid/arena.ts`: Cliff and obstacle rebound support during knockback.
- `src/core/combat/damageEngine.ts`: Collision damage negation for `immuneToCollisionDamage`.
- `src/core/campaign/encounterGenerator.ts`: Enemy unit creation and stage budget mapping.
- `src/ui/combat/tokenAssets.ts`: Class badge palette mapping.
- Vitest test suites: Unit tests for class abilities, tempo siphoning, Flash Powder AoE facing, Feline Grace knockback vaulting, and AI skirmisher decisions.
