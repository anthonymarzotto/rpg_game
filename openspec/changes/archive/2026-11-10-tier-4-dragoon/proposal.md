# Proposal: Tier 4 Dragoon Class Kit & Token Integration

## Why

The celestial progression currently lacks the Tier 4 aerial vanguard class, the Dragoon (`#07`, `3 Fighter, 0 Rogue, 1 Mage`). While Cavalier provides ground-based linear shock cavalry, the battlefield has no class that exploits true three-dimensional hex verticality—vaulting over intervening terrain, obstacles, and enemy lines to strike high-value targets with plunging kinetic shockwaves. Authoring the Dragoon kit completes item 3.2 on the active roadmap, brings token `07_human_male` into active rotation, and introduces unique virtual elevation mechanics that reward conserving Action Points.

## What Changes

- **Dragoon Class Package**: Author `DRAGOON_PACKAGE` in `src/data/packages/dragoon.ts` and register it in `CLASS_PACKAGES`, `ABILITIES_BY_ID`, and `PASSIVES_BY_ID`.
- **Signature Ability (`Dragon Dive`)**: 2 AP, range 2–3 aerial vault over intervening obstacles, units, and cliffs, plunging into the rear hex behind the target (with near-hex fallback if obstructed), dealing `1d8 + Force` physical damage vs Evasion and releasing a `1d4` physical shockwave in a 1-hex radius.
- **Domain Ability 1 (`Piercing Thrust`)**: 1 AP, range 2 straight hex line thrust dealing `1d6 + Force` physical damage to the primary target and piercing through to deal `1d4 + Force` collateral damage to a rear unit aligned behind them.
- **Domain Ability 2 (`Wyrmflame Breath`)**: 1 AP, 4-hex forward cone (1 apex at dist 1, 3 fan at dist 2) dealing `1d4 + Focus` magical damage vs Resolve and inflicting `BURN` for 2 turns.
- **Passive Trait (`Coiled Apex`)**: Innate passive providing `Apex Strike` (+2 flat damage when striking targets at lower elevation, including Virtual Height) and `Coiled Readiness` (+1 Virtual Height per unspent AP on turn end, max +2, operating as an attack roll vantage modifier without triggering melee reach lockouts).
- **Visual Identity & Token Assets**: Whitelist `07_human_male` in `AVAILABLE_PIXEL_TOKENS` and map class badge palette for `dragoon` to Deep Dragon Violet (`#312e81`) with Radiant Draconic Crimson (`#e11d48`) border.
- **AI Archetype Integration**: Register Dragoon with `BRAWLER` profile and configure AI tactical hints for aerial gap-closing and clump punishment.
- **Semantic Versioning**: Target version is **`0.15.0`** (minor version bump from `0.14.1`), adding a new backwards-compatible playable class kit, abilities, and mechanics.

## Capabilities

### New Capabilities
- `tier-4-dragoon`: Defines the complete class package, combat abilities, tactical positioning mechanics, and passive trait for the Tier 4 Dragoon (`3 Fighter, 0 Rogue, 1 Mage`) in the celestial constellation progression.

### Modified Capabilities
*(None; builds on existing ability and combat engine architecture without breaking existing spec requirements).*

## Impact

- `src/data/packages/dragoon.ts`: New class package definition with all abilities, passive trait, and AI profile.
- `src/data/packages/index.ts`: Package export and global lookup catalog registration.
- `src/core/combat/attackRoll.ts` & `src/core/combat/types.ts`: Integration of Virtual Height modifier in combat attack roll context.
- `src/core/combat/resolver.ts` & `src/core/combat/validator.ts`: Aerial jump trajectory resolution (over-vault with near-hex fallback) and line-piercing damage propagation.
- `src/ui/combat/tokenAssets.ts`: Whitelisting `07_human_male` and class badge palette styling.
- `docs/plans/ACTIVE.md`: Item 3.2 tracked in progress.
