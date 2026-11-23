# Proposal

## Why

The Tier 4 progression roster currently covers martial vanguard (`Shield-bearer`, `3F, 1R, 0M`), aerial lancer (`Dragoon`, `3F, 0R, 1M`), siege artillery (`Ballistician`, `1F, 3R, 0M`), and enchantment disruption (`Philanderer`, `0F, 3R, 1M`), leaving the Fighter/Mage celestial conduit path (`1 Fighter, 0 Rogue, 3 Mage`) without its authored Tier 4 class package: the **Theurge** (`#79`). Adding the Theurge introduces our first dedicated divine/celestial support kit on the Mage tree—single-vessel divine ascension with a mortal recovery cycle (`Henosis` -> `Mortal Ebb`), status condition purification paired with turn acceleration (`Absolution`), elevation-ignoring vertical solar judgment with CTB delay (`Empyrean Pillar`), and a vessel-projected radiant shockwave passive (`Theurgic Synergy`).

## Version Assessment

Per Semantic Versioning, this change introduces a new playable and procedurally generated Tier 4 class package, new status conditions (`HENOSIS`, `MORTAL_EBB`), a status condition purification effect (`CLEANSE`), and a vessel-projected passive damage pulse (`Theurgic Synergy`) without breaking existing saves or APIs. This requires a **minor** version bump from `0.22.0` to **`0.23.0`**.

## What Changes

- **New Tier 4 Class Package — Theurge (`#79`, `1 Fighter, 0 Rogue, 3 Mage`)**:
  - **Signature Ability — `Henosis`** (`2 AP`, Range `0–3`, `MAGE`, `ALLY` [includes Self], `defenseTarget: 'NONE'`, `damageType: 'NONE'`):
    - Bestows the **`HENOSIS`** condition upon a friendly unit or self for **2 turns**, granting **`+2 Attack Roll`, `+2 Armor`, `+2 Ward`, `+1 Move`, and `+1 Speed`**.
    - **Strict 1-Vessel Exclusivity**: A Theurge can sustain only one active `HENOSIS` vessel at a time. While any living unit on the battlefield holds `HENOSIS` originating from the caster (`sourceUnitId === actorUnitId`), `Henosis` cannot be executed. If the active vessel is defeated, the lockout immediately clears.
    - **Mortal Ebb Recovery Aftermath**: When `HENOSIS` expires at the end of the vessel's second turn, the vessel automatically enters **`MORTAL_EBB`** for **1 turn**, suffering **`-1 Attack Roll`, `-1 Armor`, `-1 Ward`, `-1 Move`, and `-1 Speed`**. While a unit is afflicted with `MORTAL_EBB`, it cannot be targeted by `Henosis` (though the Theurge may cast `Henosis` on a different eligible unit).
  - **Domain Ability 1 — `Absolution`** (`1 AP`, Range `0–3`, `MAGE`, `ALLY` [includes Self], `defenseTarget: 'NONE'`, `damageType: 'NONE'`):
    - Purges **all active negative status conditions** from the target ally or self (`POISON`, `BURN`, `EXPOSED`, `BLINDED`, `CHALLENGED`, `TELEMETRY`—excluding `MORTAL_EBB`) and boosts the target's CTB initiative gauge by **`+20 ticks`** (`INITIATIVE_BOOST`, `magnitude: 20`).
  - **Domain Ability 2 — `Empyrean Pillar`** (`1 AP`, Range `1–3`, `MAGE`, `SINGLE_TARGET`, `+Focus vs Resolve`, `damageType: 'MAGICAL'`, `ignoresElevationPenalty: true`):
    - Calls down a vertical column of celestial light that ignores low-ground elevation penalties and deals `1d4 + Focus` magical damage (half on Graze).
    - On **Solid Hit or Critical Hit** (`HIT_OR_CRIT`): Delays the target's CTB initiative gauge by **`20 ticks`** (`CTB_DELAY`, `magnitude: 20`).
  - **Innate Passive Trait — `Theurgic Synergy`**:
    - Whenever the bearer scores a **Solid Hit or Critical Hit** with a `MAGICAL` attack (does not trigger on Graze or Miss), a 1-hex ring of celestial radiance erupts around the bearer's active **`HENOSIS` vessel** (or around the bearer themselves if they have no active living `HENOSIS` vessel), dealing **`1` unmitigated magical damage** to all enemies adjacent to that conduit unit.
- **New Status Conditions (`HENOSIS` & `MORTAL_EBB`) and `CLEANSE` Effect**:
  - Adds `'HENOSIS'` and `'MORTAL_EBB'` to `ConditionType` and `CONDITION_REGISTRY`, contributing their respective stat and attack roll modifiers (`+2/+2/+2/+1/+1` for `HENOSIS`, `-1/-1/-1/-1/-1` for `MORTAL_EBB`) and ticking down at the end of the bearer's turn (`endActiveTurn`), with `HENOSIS` automatically transitioning to 1-turn `MORTAL_EBB` on expiry.
  - Adds `'CLEANSE'` to `AbilityEffectType` and registers a `cleanseHandler` that removes active negative conditions (`POISON`, `BURN`, `EXPOSED`, `BLINDED`, `CHALLENGED`, `TELEMETRY`) while preserving `HENOSIS`, `MORTAL_EBB`, and `STEALTH`.
- **Catalog, AI, Campaign & Token Asset Integration**:
  - Registers `THEURGE_PACKAGE` (`aiProfile: 'SUPPORT'`) in `src/data/packages/`, adds `'theurge'` to Stage 6+ `TIER4_CLASSES` in `encounterGenerator.ts`, whitelists `'79_human_male'` in `AVAILABLE_PIXEL_TOKENS`, adds the Celestial Gold / Empyrean Azure class badge palette (`#1e3a8a` / `#f59e0b`), adds UI condition badges/tooltips for `HENOSIS` and `MORTAL_EBB`, and teaches the AI decision engine to prioritize `Henosis`, `Absolution`, and `Empyrean Pillar`.

## Capabilities

### New Capabilities
- `tier-4-theurge`: Defines the Tier 4 Theurge (`1 Fighter, 0 Rogue, 3 Mage`) class package, active abilities (`Henosis`, `Absolution`, `Empyrean Pillar`), single-vessel `HENOSIS` -> `MORTAL_EBB` lifecycle, innate passive (`Theurgic Synergy`), and campaign/token integration.

### Modified Capabilities
- `combat-conditions`: Add `HENOSIS` (2-turn vessel ascension buff with strict 1-vessel per caster lockout and automatic transition to 1-turn `MORTAL_EBB` on turn-end expiry) and `MORTAL_EBB` (1-turn post-vessel recovery penalty that cannot be cleansed by `Absolution` or re-targeted by `Henosis`).
- `composable-abilities`: Add `CLEANSE` atomic effect for purging negative status conditions and support vessel-projected `Theurgic Synergy` passive radiant pulse on Solid Hit or Critical Hit.
- `encounter-generation`: Include `theurge` in the Tier-4 enemy generation roster (`TIER4_CLASSES`) for Stage 6+ encounters.
- `token-assets`: Whitelist `79_human_male` pixel token assets and add the `theurge` class badge color palette.

## Impact

- **Core Types & Combat Engine**: `src/core/types/ability.ts`, `src/core/types/passive.ts`, `src/core/combat/types.ts`, `src/core/combat/conditions.ts`, `src/core/combat/effectiveVitals.ts`, `src/core/combat/effects/`, `src/core/combat/validator.ts`, `src/core/combat/resolver.ts`, `src/core/combat/turnClock.ts`, `src/core/combat/abilityFormatter.ts`.
- **Class Data & Campaign**: `src/data/packages/theurge.ts`, `src/data/packages/index.ts`, `src/core/campaign/encounterGenerator.ts`, `src/core/ai/decisionEngine.ts`.
- **UI**: `src/ui/combat/tokenAssets.ts`, `src/ui/combat/conditionBadges.ts`, `src/ui/combat/EffectBadgeTooltip.tsx`.
