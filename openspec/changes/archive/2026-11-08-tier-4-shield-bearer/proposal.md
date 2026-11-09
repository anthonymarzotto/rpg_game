# Proposal

## Why

Tier 4 of the celestial constellation progression introduces specialized apex and hybrid archetypes, but currently lacks authored class kits. The **Shield-bearer** (`#05`, Tier 4: `3F, 1R, 0M`) is the direct defensive evolution of the Fighter lineage with a splash of Rogue tactical footwork, filling a critical tactical niche as a pure-defensive frontline anchor and bodyguard. Delivering this kit expands player tactical variety, enables new defensive wildcard synergies, and activates the pre-existing `05_human_male` pixel token asset in live combat.

## What Changes

- Author and register the complete **Shield-bearer** (`#05`) class package:
  - **Signature Ability — Bastion Plant** (2 AP, Self): Grants +3 Armor for 1 turn, locks Move to 0, projects a Phalanx Front (Zone of Control) stopping enemy movement through the 3 forward hexes/edges, and grants 50% ranged damage reduction to allies in the rear arc.
  - **Domain Ability 1 — Intercept Step** (1 AP, Range 3 Ally, Rogue Archetype): Swaps hex coordinates between the Shield-bearer and an adjacent/distant ally up to 3 hexes away, granting the ally +2 Armor for 1 turn.
  - **Domain Ability 2 — Concussive Slam** (1 AP, Range 1 Melee, Fighter Archetype): Deals `1d6 + Force` physical damage vs Evasion and inflicts `SLOW` (-2 Move for 1 turn) without knockback, keeping enemies pinned to the shield.
  - **Innate Passive Trait — Unyielding Stance**: Grants full immunity to forced displacement effects (knockback, pull, shove) and projects a Phalanx Aura reducing hostile attack rolls targeting adjacent allies by -2.
  - **AI Profile**: Configures default AI tactical profile to `BRAWLER` with high frontline engagement and ally proximity weights.
- Whitelist the `05_human_male` pixel sprite token in `AVAILABLE_PIXEL_TOKENS`.
- Register the `shield-bearer` badge palette in `CLASS_BADGE_PALETTES` (Primary `#334155` Slate Iron, Border `#10b981` Emerald Trim).
- Update `docs/plans/ACTIVE.md` item 3.1 to In Progress.

### Versioning Assessment
- **Current Version**: `0.13.0`
- **Target Version**: `0.14.0` (Minor bump)
- **Rationale**: According to Semantic Versioning, introducing a brand-new playable character class package with new combat mechanics (Zone of Control, positional swapping, displacement immunity) and visual assets is a backwards-compatible new gameplay feature.

## Capabilities

### New Capabilities
- `tier-4-shield-bearer`: Defines the complete class package, combat abilities, tactical positioning mechanics, passive trait, and AI heuristic profile for the Tier 4 Shield-bearer.

### Modified Capabilities
- `token-assets`: Whitelists `05_human_male` token sprite and registers the Shield-bearer class badge palette.

## Impact

- `src/data/packages/shieldBearer.ts`: New class package definition file.
- `src/data/packages/index.ts`: Export and register `SHIELD_BEARER_PACKAGE` in global class and ability catalogs.
- `src/ui/combat/tokenAssets.ts`: Register `05_human_male` in `AVAILABLE_PIXEL_TOKENS` and palette in `CLASS_BADGE_PALETTES`.
- `src/core/combat/`: Integration and simulation benchmarks testing Shield-bearer matchups, Bastion Plant damage mitigation, and Intercept Step rescue maneuvers.
