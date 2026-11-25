# Proposal

## Why

The Tier 4 progression roster currently covers martial vanguard (`Shield-bearer`, `3F, 1R, 0M`), aerial lancer (`Dragoon`, `3F, 0R, 1M`), and siege artillery (`Ballistician`, `1F, 3R, 0M`), leaving the Rogue/Mage hybrid path (`0 Fighter, 3 Rogue, 1 Mage`) without its authored Tier 4 class package: the **Philanderer** (`#84`). Adding the Philanderer introduces social/enchantment disruption at Tier 4—temporary faction-flip charming (`Billet-Doux`), single-target positional luring (`Beckoning Glance` with `PULL`), myopic dazzling (`Looking-Glass Glare` with `BLINDED`), and a directional front-arc distraction aura (`Captivating Presence`).

## Version Assessment

Per Semantic Versioning, this change introduces a new playable and procedurally generated Tier 4 class package, new status conditions (`CHARMED`, `BLINDED`), a new `PULL` displacement effect handler, and directional front-arc passive aura evaluation without breaking existing saves or APIs. This requires a **minor** version bump from `0.21.0` to **`0.22.0`**.

## What Changes

- **New Tier 4 Class Package — Philanderer (`#84`, `0 Fighter, 3 Rogue, 1 Mage`)**:
  - **Signature Ability — `Billet-Doux`** (`2 AP`, Range 3, `ROGUE`, `SINGLE_TARGET`, `+Finesse vs Resolve`, `damageType: 'NONE'`):
    - On **Critical Hit** (`CRIT_ONLY`): Inflicts **`CHARMED` for 2 turns**.
    - On **Solid Hit** (`HIT_ONLY`): Inflicts **`CHARMED` for 1 turn**.
    - On **Graze** (`GRAZE_ONLY`): Inflicts **`EXPOSED` for 1 turn**.
    - On **Miss**: No effect.
  - **Domain Ability 1 — `Beckoning Glance`** (`1 AP`, Range 3, `ROGUE`, `SINGLE_TARGET`, `+Finesse vs Resolve`, `damageType: 'NONE'`):
    - On **Solid Hit or Critical Hit** (`HIT_OR_CRIT`): Pulls the target **1 hex toward the Philanderer** (`PULL`, `magnitude: 1`), forces the target to face the Philanderer (`FORCE_FACING`), and inflicts **`EXPOSED` for 1 turn**.
  - **Domain Ability 2 — `Looking-Glass Glare`** (`1 AP`, Range 3, `MAGE`, `SINGLE_TARGET`, `+Focus vs Resolve`, `damageType: 'MAGICAL'`):
    - Deals `1d4 + Focus` magical damage (half on Graze).
    - On **Solid Hit or Critical Hit** (`HIT_OR_CRIT`): Inflicts **`BLINDED` for 1 turn**.
  - **Innate Passive Trait — `Captivating Presence`**:
    - Directional front-arc aura (`radius: 3`, `arc: 'FRONT'`): Any hostile unit located within 3 hexes and inside the Philanderer's `FRONT` combat arc (forward 180-degree hemisphere) suffers `-2` to their Attack Roll on any attack they make (against the Philanderer or any ally).
- **New Status Condition — `CHARMED`**:
  - Temporarily flips the bearer's effective combat `faction` (`'ENEMY' <-> 'PLAYER'`) to match the charmer's faction while active.
  - Persists through damage and decrements/clears at the end of the charmed unit's turn, restoring the unit's original faction (`unit.faction`) when removed or expired.
  - Because turn control follows `activeCu.faction`, a charmed enemy (`faction === 'PLAYER'`) is directly controlled by the Player on their turn, while a charmed player hero (`faction === 'ENEMY'`) is controlled by the AI turn sequencer.
  - Encounter victory/defeat evaluation (`FACTION_DEFEATED`) and post-trial Vanguard XP harvest summaries evaluate each unit's permanent base faction (`cu.unit.faction`) so charming the last surviving enemy does not prematurely end the encounter.
- **New Status Condition — `BLINDED` ("Myopic Dazzle")**:
  - Imposes **Disadvantage** on all outgoing attack rolls made by the blinded unit.
  - Clamps the blinded unit's effective maximum targeting range on all abilities to at most **1 hex** (`Math.min(effectiveRange, 1)`).
  - Prevents the blinded unit from spotting adjacent `STEALTH` units during front-arc detection (`evaluateFrontArcDetection`).
- **New Atomic Effect & Outcome — `PULL` and Extended `EffectApplyCondition`**:
  - Adds `'PULL'` to `AbilityEffectType` and registers a `pullHandler` that displaces the target 1 hex along the line toward the actor if the step is walkable and unoccupied (respecting displacement immunity and evaluating ledge plunge fall damage when `dh <= -2`).
  - Extends `EffectApplyCondition` with `'HIT_ONLY'` and `'GRAZE_ONLY'` so non-damaging contested abilities like `Billet-Doux` can differentiate Critical Hit, Solid Hit, and Graze effect payloads.
- **Catalog, AI, Campaign & Token Asset Integration**:
  - Registers `PHILANDERER_PACKAGE` in `src/data/packages/`, adds `'philanderer'` to Stage 6+ `TIER4_CLASSES` in `encounterGenerator.ts`, whitelists `'84_human_male'` in `AVAILABLE_PIXEL_TOKENS`, adds the Velvet Rose badge palette (`#9f1239` / `#f43f5e`), adds UI condition badges for `CHARMED` and `BLINDED`, and teaches the AI decision engine to value `Billet-Doux`, `Beckoning Glance`, and `Looking-Glass Glare`.

## Capabilities

### New Capabilities
- `tier-4-philanderer`: Defines the Tier 4 Philanderer (`0 Fighter, 3 Rogue, 1 Mage`) class package, active abilities (`Billet-Doux`, `Beckoning Glance`, `Looking-Glass Glare`), innate passive (`Captivating Presence`), and campaign/token integration.

### Modified Capabilities
- `combat-conditions`: Add `CHARMED` (temporary faction switch with base-faction objective preservation) and `BLINDED` (outgoing Disadvantage, max range clamped to 1 hex, and disabled front-arc stealth detection).
- `composable-abilities`: Add `PULL` atomic displacement effect, extend `EffectApplyCondition` with `'HIT_ONLY'` and `'GRAZE_ONLY'`, and support directional front-arc attacker penalty auras (`Captivating Presence`).
- `encounter-generation`: Include `philanderer` in the Tier-4 enemy generation roster (`TIER4_CLASSES`) for Stage 6+ encounters.
- `token-assets`: Whitelist `84_human_male` pixel token assets and add the `philanderer` class badge color palette.

## Impact

- **Core Types & Combat Engine**: `src/core/types/ability.ts`, `src/core/types/passive.ts`, `src/core/combat/types.ts`, `src/core/combat/conditions.ts`, `src/core/combat/effects/`, `src/core/combat/auras.ts`, `src/core/combat/validator.ts`, `src/core/combat/resolver.ts`, `src/core/combat/turnClock.ts`, `src/core/combat/objectives.ts`, `src/core/combat/abilityFormatter.ts`.
- **Class Data & Campaign**: `src/data/packages/philanderer.ts`, `src/data/packages/index.ts`, `src/core/campaign/encounterGenerator.ts`, `src/core/ai/heuristics.ts`, `src/core/ai/decisionEngine.ts`.
- **UI**: `src/ui/combat/tokenAssets.ts`, `src/ui/combat/conditionBadges.ts`, `src/ui/combat/useCombatSimulation.ts`, `src/ui/combat/EffectBadgeTooltip.tsx`.
