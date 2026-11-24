# Proposal

## Why

The Tier 4 progression roster currently covers martial vanguard (`Shield-bearer`, `3F, 1R, 0M`), aerial lancer (`Dragoon`, `3F, 0R, 1M`), siege artillery (`Ballistician`, `1F, 3R, 0M`), enchantment disruption (`Philanderer`, `0F, 3R, 1M`), and celestial support (`Theurge`, `1F, 0R, 3M`), leaving the final Tier 4 coordinate (`0 Fighter, 1 Rogue, 3 Mage`) without its authored class package: the **Arcanist** (`#96`). Adding the Arcanist completes the Tier 4 roster with a precision geometric-and-mathematical sniper caster—introducing the game's first friendly-fire exclusion and ally-transparent magical Line-of-Sight passive (`Exclusion Matrix`), an ally-refracting AoE signature (`Refractive Array`), adaptive lower-defense targeting (`Adaptive Formula`), and an isolated-vs-clustered branching equation (`Distributive Proof`).

## Version Assessment

Per Semantic Versioning, this change introduces a new playable and procedurally generated Tier 4 class package, new declarative passive flags (`excludeFriendlyAoE`, `ignoresAllyLoS`), a new adaptive defense target mode (`LOWER_DEFENSE`), and new composable ability effects (`ALLY_REFRACTION`, `DISTRIBUTIVE_PROOF`) without breaking existing saves or APIs. This requires a **minor** version bump from `0.23.1` to **`0.24.0`**.

## What Changes

- **New Tier 4 Class Package — Arcanist (`#96`, `0 Fighter, 1 Rogue, 3 Mage`)**:
  - **Signature Ability — `Refractive Array`** (`2 AP`, Range `1–3`, `aoeRadius: 1`, `MAGE`, `HEX`, `+Focus vs Resolve`, `damageType: 'MAGICAL'`):
    - Projects a geometric arcane blast across a 1-hex radius, dealing `1d4 + Focus` magical damage to every enemy inside the blast (testing each target's Resolve against the single unified spellcast d20 roll).
    - **Ally Refraction (`ALLY_REFRACTION`)**: Allies inside the blast radius are spared by `Exclusion Matrix` (Self follows standard AoE exclusion and does not count as a spared ally). Each spared ally redirects an additional `1d4 + Focus` magical strike onto an enemy inside the blast, spreading round-robin across lowest-current-HP enemies first (cycling if more spared allies than enemies). Each refracted strike tests the unified spellcast d20 roll against its recipient's Resolve and rolls its own `1d4 + Focus` damage dice.
    - No `oncePerTurn` cap (naturally constrained by its 2 AP cost, matching `Henosis`, `Billet-Doux`, `Dragon Dive`, and `Eldritch Blast`).
  - **Domain Ability 1 — `Adaptive Formula`** (`1 AP`, Range `1–3`, `MAGE`, `SINGLE_TARGET`, `+Focus vs LOWER_DEFENSE`, `damageType: 'MAGICAL'`):
    - Fires a calibrated arcane bolt dealing `1d6 + Focus` magical damage that automatically tests whichever of the target's `Evasion` or `Resolve` is lower (preferring `Resolve` on an exact tie).
  - **Domain Ability 2 — `Distributive Proof`** (`1 AP`, Range `1–3`, `ROGUE`, `SINGLE_TARGET`, `+Focus vs Resolve`, `damageType: 'MAGICAL'`):
    - Deals `1d4 + Focus` magical damage to the primary target and evaluates the target's adjacency (`DISTRIBUTIVE_PROOF`):
      - **Isolated (0 adjacent allies of the target):** Inflicts `EXPOSED` (1 turn) on Hit/Crit.
      - **Clustered (1+ adjacent allies of the target):** Distributes `1d4` magical splash damage to all units adjacent to the target (contesting the unified spellcast d20 roll against each adjacent unit's Resolve; friendly units are spared when the caster has `Exclusion Matrix`).
  - **Innate Passive Trait — `Exclusion Matrix`** (`ALWAYS`):
    - **Ally-Transparent Magical LoS (`ignoresAllyLoS: true`)**: Friendly units never obstruct Line of Sight for the bearer's magical abilities (`damageType === 'MAGICAL'` or `archetypeTag === 'MAGE'`).
    - **Zero Friendly Fire (`excludeFriendlyAoE: true`)**: The bearer's hostile AoE attacks, splashes, cones, and delayed bombardments never harm or debuff friendly units, and `HEX`-targeted hostile AoEs may be centered directly on an ally's hex without targeting or harming that ally.
- **Declarative Engine Extensions**:
  - Extends `DefenseTarget` (`src/core/types/ability.ts`) with `'LOWER_DEFENSE'` and updates centralized defense evaluation (`attackRoll.ts`, `resolver.ts`, `targetPreview.ts`, `abilityFormatter.ts`, `decisionEngine.ts`).
  - Extends `PassiveTrait` (`src/core/types/passive.ts`) with `excludeFriendlyAoE?: boolean` and `ignoresAllyLoS?: boolean`, enforced uniformly across `validator.ts`, `resolver.ts`, `battlefieldZones.ts`, `targetPreview.ts`, and `decisionEngine.ts`.
  - Extends `AbilityEffectType` with `'ALLY_REFRACTION'` and `'DISTRIBUTIVE_PROOF'`, with structured combat log outcomes, floating combat text labels (`REFRACT!`, `DISTRIBUTE!`), and formatter clauses.
- **Catalog, AI, Campaign & Token Asset Integration**:
  - Registers `ARCANIST_PACKAGE` (`aiProfile: 'SNIPER'`) in `src/data/packages/`, adds `'arcanist'` to Stage 6+ `TIER4_CLASSES` in `encounterGenerator.ts`, whitelists `'96_human_male'` in `AVAILABLE_PIXEL_TOKENS`, adds the Deep Arcane Violet / Geometric Emerald class badge palette (`#5b21b6` / `#10b981`), and teaches the AI decision engine to value ally-safe AoEs, ally refraction bounces, lower-defense targeting, and isolated-vs-clustered `Distributive Proof` setups.

## Capabilities

### New Capabilities
- `tier-4-arcanist`: Defines the Tier 4 Arcanist (`0 Fighter, 1 Rogue, 3 Mage`) class package, active abilities (`Refractive Array`, `Adaptive Formula`, `Distributive Proof`), innate passive (`Exclusion Matrix`), wildcard compatibility, and campaign/token integration.

### Modified Capabilities
- `composable-abilities`: Support friendly-fire exclusion via `PassiveTrait.excludeFriendlyAoE` on hostile AoEs/splashes (including centering `HEX` AoEs on allies), ally-transparent magical Line of Sight via `PassiveTrait.ignoresAllyLoS`, and new `ALLY_REFRACTION` and `DISTRIBUTIVE_PROOF` atomic ability effects with structured combat log and formatter support.
- `attack-roll-context`: Support `defenseTarget: 'LOWER_DEFENSE'` in centralized attack roll evaluation, resolving the lower of target `Evasion` or `Resolve` (preferring `Resolve` on ties) for combat resolution, target previews, and AI scoring.
- `encounter-generation`: Include `arcanist` in the Tier-4 enemy generation roster (`TIER4_CLASSES`) for Stage 6+ encounters.
- `token-assets`: Whitelist `96_human_male` pixel token assets and register the `arcanist` class badge color palette (`#5b21b6` / `#10b981`).

## Impact

- **Core Types & Combat Engine**: `src/core/types/ability.ts`, `src/core/types/passive.ts`, `src/core/combat/attackRoll.ts`, `src/core/combat/validator.ts`, `src/core/combat/resolver.ts`, `src/core/combat/battlefieldZones.ts`, `src/core/combat/targetPreview.ts`, `src/core/combat/abilityFormatter.ts`.
- **Class Data & Campaign**: `src/data/packages/arcanist.ts`, `src/data/packages/index.ts`, `src/core/campaign/encounterGenerator.ts`, `src/core/ai/decisionEngine.ts`.
- **UI & Assets**: `src/ui/combat/tokenAssets.ts`, `src/ui/combat/useFloatingCombatText.ts` (if label mapping needs `REFRACT`/`DISTRIBUTE` verification).
