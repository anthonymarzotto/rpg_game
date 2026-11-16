# Proposal

## Why

Ability descriptions are currently rendered inconsistently across at least three primary UI surfaces (Camp's Combat Manifest / Progression Drawer, the Trial Action Bar hover tooltip, and the Selected/Pinned Unit card in a Trial), plus secondary Camp inspection views (Class Inspector and Off-Node Domain Skill Draft modal). Because `Ability.description` mixes hardcoded mechanical numbers (e.g., `"1d4 damage"`, `"-2 Armor for 2 turns"`) with flavor text, socketed Astral Augment Shards and in-combat primers (such as *Blood Frenzy* or *Spell Sculpt*) leave the prose description stale and contradictory. Furthermore, `getEffectiveAbility` currently wipes pre-resolved shard `attributions` whenever `activeCu.abilityModifiers` is evaluated in a Trial (`B.10`), and the Action Bar hover tooltip dumps raw internal enum tokens (`SINGLE_TARGET`, `Effect: STAT_MODIFIER (Mag: 2)`).

Unifying ability presentation behind pure thematic flavor text and a deterministic hybrid formatter (scannable Stat Strip pills + generated human-readable Effect Clauses + a compact mechanical 1-liner) ensures every UI surface is accurate, scannable, and dynamically color-coded according to modification precedence (`Normal -> Shard -> In-Trial`).

## Version Bump Assessment

- **Target Version**: `0.19.0` (Minor bump from `0.18.0`)
- **Rationale**: Introduces a new unified hybrid ability description & formatting engine across Camp and Trial UI surfaces, adds 3-tier provenance color-coding (`Normal -> Shard -> In-Trial`), adds hover ability tooltips on pinned unit cards in Trials, and resolves `B.10` / Playtest Scratchpad 1.

## What Changes

- **Pure Thematic Flavor Descriptions**: Rewrite `Ability.description` strings across all authored Novice and Class packages (`src/data/packages/*.ts`) so `description` contains concise, evocative 1-sentence thematic flavor without hardcoded dice, range, or stat numbers that can go stale when augmented.
- **Modifier Provenance & Attribution Preservation (`B.10`)**:
  - Update `getEffectiveAbility` (`src/core/combat/modifiers.ts`) to preserve incoming `attributions`, `appliedModifierIds`, and `attackRollBonus` when composing additional modifiers (e.g., in-trial primers on top of pre-resolved Camp shard abilities) or when `applicable.length === 0`.
  - Introduce a modification provenance tier (`'NORMAL' | 'SHARD' | 'TRIAL'`) on `AbilityModifier` / `PropertyAttribution` and appended `AbilityEffect` entries, enforcing visual precedence `Normal -> Shard -> In-Trial`.
- **Deterministic Ability Description & Effect Formatter**:
  - Create a pure formatting module (`src/core/combat/abilityFormatter.ts`) that resolves any `Ability` or `EffectiveAbility` into:
    1. **Stat Strip Pills**: Scannable parameter pills for Reach/Area (`Melee 1`, `Range 3 • Blast 1`, `Cone 2`, `Self`), Defense Contest (`+FIN vs EVA`, `+FOC vs RES`), Primary/Splash Damage (`1d6 + FRC Physical`, `1d4 Splash`), and AP/HP cost deltas, each tagged with its highest provenance tier (`NORMAL | SHARD | TRIAL`).
    2. **Generated Effect Clauses**: Exhaustive, human-readable clauses for all 24 `AbilityEffectType` variants (including conditional bonus damage, stat modifier breakdowns, forced facing, displacement/collision behavior, primers, and stances), tagged with provenance tier when injected or patched by a shard or in-trial modifier.
    3. **Compact Mechanical 1-Liner**: A concise single-line summary of reach, primary damage/contest, and key effect keywords for compact list rows.
- **Unified UI Presentation Across Camp & Trial Surfaces**:
  - **Camp Combat Manifest, Class Inspector, Waypoint Inspector, & Off-Node Domain Draft Modal** (`HeroProgressionDrawer.tsx`, `OffNodeChoiceModal.tsx`): Render the shared Hybrid Ability view (Flavor line + Stat Strip Pills + Generated Effect Clauses) with Shard color highlights on modified stats and appended effects.
  - **Trial Action Bar Hover Tooltip** (`ActionBar.tsx`): Replace the raw technical enum dump (`SINGLE_TARGET`, `Effect: STAT_MODIFIER (Mag: 2)`) with the shared Hybrid Ability Tooltip (Flavor line + Stat Strip Pills + Generated Effect Clauses + Active Augments footer), colored by `Normal -> Shard -> In-Trial` precedence.
  - **Trial Selected / Pinned Unit Card** (`UnitStatusCard.tsx`): Evaluate `getEffectiveAbility(ability, inspectedCu.abilityModifiers)` for each equipped skill, display the **Compact Mechanical 1-Liner** on the pinned card row (with tier color highlights), and show the full **Hybrid Ability Tooltip** on hover.

## Capabilities

### New Capabilities
<!-- None; all requirements extend existing capabilities -->

### Modified Capabilities
- `composable-abilities`: Preserve existing `attributions` and `appliedModifierIds` across chained `getEffectiveAbility` calls (`B.10`), track modifier provenance tier (`SHARD` vs `TRIAL`) with `Normal -> Shard -> In-Trial` precedence, provide deterministic human-readable formatting for all ability parameters and `AbilityEffectType` variants, and render the unified Hybrid Tooltip on the Action Bar.
- `hero-progression-drawer`: Render the unified Hybrid Ability view (Flavor + Stat Strip Pills + Generated Effect Clauses) with Shard provenance color highlighting in the Combat Manifest, Class Inspector, Waypoint Inspector, and Off-Node Domain Skill Draft modal.
- `arena-timeline-ux`: Evaluate effective abilities on the Pinned Unit inspection card, render the Compact Mechanical 1-Liner on each skill row, and display the full Hybrid Ability Tooltip on hover.

## Impact

- **Core Types & Combat Engine**: `src/core/types/ability.ts`, `src/core/types/modifier.ts`, `src/core/combat/modifiers.ts`, and new `src/core/combat/abilityFormatter.ts`.
- **Authored Data Catalogs**: `src/data/packages/*.ts` (flavor text cleanup on authored abilities) and `src/core/progression/harmonization.ts` (tagging shard modifiers with `'SHARD'` provenance tier).
- **UI Components & Styles**: `src/ui/combat/ActionBar.tsx`, `src/ui/combat/UnitStatusCard.tsx`, `src/ui/camp/HeroProgressionDrawer.tsx`, `src/ui/camp/OffNodeChoiceModal.tsx`, and shared ability description component/styles.
