# Proposal

## Why

Currently, `Ability` is defined as a rigid, monolithic property bag with hardcoded scalar fields for `damageProfile`, a single `effect?: AbilityEffect`, and bespoke `conditionalBonus` triggers. This creates severe architectural limitations:
1. An ability cannot cleanly combine multiple effects (e.g. damage + self-armor buff + enemy knockback).
2. Ephemeral in-combat modifications (such as Sorcerer's *Spell Sculpt* priming range and AoE) required ad-hoc, hardcoded branches in `resolver.ts`.
3. Permanent modifications (such as upcoming Phase 4.4 Off-Node Ability Overclocks or Passives) cannot modify abilities without mutating static definitions.
4. Players receive no UI feedback or attribution explaining *why* an ability's stats changed mid-combat or in Camp.

Refactoring abilities into an atomic `effects: readonly AbilityEffect[]` pipeline governed by a universal, declarative `AbilityModifier` engine solves all of these issues while establishing the foundation needed for Phase 4.4 Off-Node progression.

## What Changes

* **Composable Ability Contract (`src/core/types/ability.ts`)**:
  * Retain delivery and action-economy envelope properties (`id`, `name`, `description`, `archetypeTag`, `apCost`, `range`, `aoeRadius`, `targetType`, `defenseTarget`, `attackModifierAttribute`, `oncePerTurn`).
  * Replace monolithic `damageProfile`, `effect`, and `conditionalBonus` with `effects: readonly AbilityEffect[]`.
  * Standardize effects with `targetScope?: 'TARGET' | 'SELF' | 'ALLIES'` and `applyOn?: 'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY'`.
* **Universal Modifier Engine (`src/core/types/modifier.ts`, `src/core/combat/modifiers.ts`)**:
  * Define `AbilityModifier` as a declarative patch supporting:
    * Scalar property overrides (`archetypeTag`, `defenseTarget`, `attackModifierAttribute`, `targetType`).
    * Numeric deltas (`apCost`, `range`, `aoeRadius`).
    * Composable effect injections (`appendEffects`) and effect patching (`effectPatches` for damage die step, die count, and flat damage).
    * Lifecycle metadata (`isPermanent` for overclocks/passives, `durationTurns` for buffs, `consumesOnUse` for primers).
    * Applicability filters (`abilityIds`, `archetypeTags`, `damageTypes`).
  * Implement pure evaluation function `getEffectiveAbility(base, modifiers): EffectiveAbility`.
  * Track property provenance via `EffectiveAbility.attributions: PropertyAttribution[]`.
* **Combat Engine & Package Integration**:
  * Update `executeAbility()` in `src/core/combat/resolver.ts` to evaluate `getEffectiveAbility()` and iterate through the `effects` array, replacing legacy `damageProfile` and `pendingAbilityModifier` logic.
  * Migrate all authored class packages in `src/data/packages/` (Novice, Warrior, Thief, Wizard, Knight, Infiltrator, Sorcerer) to the composable `effects` array.
  * Update combat validation (`validator.ts`) and targeting range calculations to operate on effective ability stats.
* **Combat UI Attribution (`src/ui/combat/ActionBar.tsx`)**:
  * Display celestial `✦` pulse on action buttons with active modifications.
  * Highlight modified AP costs in emerald green if discounted.
  * Render inline attribution badges (e.g. `[✦ +1 Range from Spell Sculpt]`) in hover tooltips and list active augments in a summary footer.

## Capabilities

### New Capabilities
- `composable-abilities`: Composable atomic ability effects pipeline, universal declarative ability modifier engine, provenance attribution tracking, and UI augment indicators.

### Modified Capabilities
*(None. Existing specs describe campaign, camp, and persistence capabilities whose requirements remain intact).*

## Impact

* **Core Types**: `Ability` contract modernized in `src/core/types/ability.ts`; `AbilityModifier` and `EffectiveAbility` added in `src/core/types/modifier.ts`.
* **Combat Engine**: `resolver.ts`, `validator.ts`, and `effects/` updated to evaluate effective abilities and iterate effect arrays.
* **Packages**: All static ability definitions in `src/data/packages/` migrated to new effect arrays.
* **UI**: `ActionBar.tsx` enhanced with inline attribution badges and augment indicators.
* **Compatibility**: Pure refactor of ability representation; gameplay balance and damage calculations remain identical while unlocking future Overclock mechanics.
