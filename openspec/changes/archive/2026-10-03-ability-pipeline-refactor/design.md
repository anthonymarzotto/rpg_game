# Design

## Context

Currently, `Ability` is defined in `src/core/types/ability.ts` as a monolithic interface with separate fields for `damageProfile`, `effect?: AbilityEffect`, and `conditionalBonus?: ConditionalBonus`. In `src/core/combat/resolver.ts`, damage calculation is handled by a hardcoded `resolveDamage()` call, while secondary effects are handled separately via `executeAbilityEffects()`. Furthermore, ephemeral modifiers (such as Sorcerer's *Spell Sculpt*) are tracked via a dedicated `pendingAbilityModifier` on `CombatUnit` and resolved via special-case branches in `resolver.ts`.

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/ability-pipeline-refactor/proposal.md) for full motivation and scope.

## Goals / Non-Goals

**Goals:**
* Transform `Ability` into an envelope containing an atomic `effects: readonly AbilityEffect[]` array, where damage, displacement, conditions, and buffs are all first-class composable effects.
* Provide a universal, declarative `AbilityModifier` patch engine that can modify any property of an ability (numeric deltas, property overrides, effect injections, damage die step patches).
* Implement a pure `getEffectiveAbility(base, modifiers): EffectiveAbility` evaluation pipeline that generates structured provenance attributions (`attributions: PropertyAttribution[]`).
* Enable seamless reuse across both out-of-combat (Camp tooltips, Overclocks) and in-combat (Spell Sculpt, Stances, Curses) systems.
* Enhance combat UI (`ActionBar.tsx`) with visual augment indicators (`✦`) and tooltip attribution tags.
* Ensure 100% test compatibility and zero gameplay balance regression across all existing class abilities.

**Non-Goals:**
* Authoring Phase 4.4 Off-Node progression, harmonization surges, or choice modals (reserved for the subsequent `off-node-progression` change).
* Creating a Turing-complete scripting engine for abilities (declarative JSON-serializable patches only).
* Changing baseline action economy rules or tile grid mechanics.

## Decisions

### 1. Composable Effect Array vs. Monolithic Property Bag
* **Decision**: Replace `damageProfile`, `effect`, and `conditionalBonus` with `effects: readonly AbilityEffect[]`. Each effect contains its type, payload, optional `targetScope` (`'TARGET' | 'SELF' | 'ALLIES'`), and optional `applyOn` trigger (`'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY'`).
* **Rationale**: Enables abilities to combine multiple payloads naturally (e.g. `Brace` doing damage to target and armor buff to self; `Toxic Shiv` doing damage and applying poison; `Cleave` doing damage and sweeping).
* **Alternatives Considered**: Keeping `damageProfile` top-level and only making secondary effects an array. Discarded because damage is just another effect, and treating it separately prevents abilities from dealing multiple damage types (e.g. physical + elemental shock) or attaching damage modifiers cleanly.

### 2. Declarative Patch Model vs. Callback Transforms
* **Decision**: Model `AbilityModifier` as a declarative data structure with `deltas`, `overrides`, `appendEffects`, and `effectPatches`, rather than JavaScript functions (`(ability) => ability`).
* **Rationale**: Declarative data structures serialize cleanly to IndexedDB save envelopes, can be inspected by AI heuristics, and allow UI components to generate rich diffs and attribution badges without executing code.
* **Alternatives Considered**: Functional reducer pipeline (`(ab: Ability) => Ability`). Discarded because function closures cannot be persisted to storage or easily introspected for tooltips.

### 3. Pure `getEffectiveAbility` Resolution Pipeline
* **Decision**: Compute effective ability stats on-demand via a pure function `getEffectiveAbility(baseAbility, modifiers): EffectiveAbility`.
* **Rationale**: This function runs identically anywhere: in `ActionBar.tsx` (to display real range/cost), in `validator.ts` (to check AP and reach), in `resolver.ts` (to execute real values), and in Camp Hub (to render permanent overclocks).
* **Alternatives Considered**: Mutating abilities in-place on the `CombatUnit`. Discarded because mutation creates state desynchronization bugs, complicates undo/preview states, and makes testing fragile.

### 4. Canonical Dice Tier Progression
* **Decision**: For die-step modifiers (e.g. Bear Strength upgrading a damage die), implement a standard polyhedral lookup: `STANDARD_DICE_STEPS = [4, 6, 8, 10, 12]`. Stepping up `1d4` by 1 yields `1d6`; stepping up `1d12` clamps at `1d12`.
* **Rationale**: Matches classic tabletop RPG mechanics and provides deterministic, predictable mathematical scaling for future ability overclocks.

### 5. Provenance Attribution Architecture
* **Decision**: `EffectiveAbility` extends `Ability` and adds `attributions: readonly PropertyAttribution[]`. Whenever `getEffectiveAbility` modifies a property (e.g. `range: +1`), it appends an attribution recording the property, the modifier source name, and a human-readable label (`+1 Range`).
* **Rationale**: Allows the combat UI to display inline tags (`[✦ +1 Range from Spell Sculpt]`) and button augment glyphs (`✦`) with zero extra query overhead.

## Risks / Trade-offs

* **[Risk] Migration overhead across existing test suites**: Updating `Ability` removes legacy fields (`damageProfile`, scalar `effect`, `conditionalBonus`), which will cause TypeScript errors across existing test fixtures.
  * **Mitigation**: Perform a direct, complete migration of all test suites to construct abilities using the new `effects: [...]` array. Strictly avoid backwards-compatibility shims, adapters, or fallback fields; the entire codebase will standardize cleanly on the new contract.
* **[Risk] Order of modifier application**: If one modifier overrides an attribute and another adds a delta, execution order could matter.
  * **Mitigation**: Standardize resolution order inside `getEffectiveAbility`: (1) Overrides first, (2) Deltas second, (3) Effect patches/appends third.

## Migration Plan

1. Author new contracts in `src/core/types/ability.ts` and `src/core/types/modifier.ts`.
2. Implement `getEffectiveAbility()` and `upgradeDieSides()` in `src/core/combat/modifiers.ts`.
3. Update `src/core/combat/effects/` handlers to accept `AbilityEffect` and handle `DAMAGE` as an atomic effect handler.
4. Update `src/core/combat/resolver.ts` and `validator.ts` to consume `getEffectiveAbility()`.
5. Update all package definitions in `src/data/packages/` to use the `effects: [...]` array.
6. Directly migrate all mock ability fixtures and unit tests across the codebase to the new format with zero backwards-compatibility layers.
7. Enhance `src/ui/combat/ActionBar.tsx` with attribution badges and augment indicators.
8. Run the full Vitest suite (`npm test`) to ensure zero regressions across all suites.
