# Tasks

## 1. Core Data Models & Contracts

- [x] 1.1 Redefine `Ability` and `AbilityEffect` in `src/core/types/ability.ts` with atomic `effects: readonly AbilityEffect[]`, `targetScope`, and `applyOn`, and verify TypeScript compilation
- [x] 1.2 Define `AbilityModifier`, `PropertyAttribution`, and `EffectiveAbility` in `src/core/types/modifier.ts` with full patch and lifecycle interfaces
- [x] 1.3 Add `abilityModifiers: AbilityModifier[]` to `CombatUnit` in `src/core/combat/types.ts` and `abilityModifiers?: AbilityModifier[]` to `UnitLoadout` in `src/core/types/loadout.ts`, verifying mock initializers

## 2. Universal Modifier Engine & Resolution

- [x] 2.1 Implement `upgradeDieSides()` and `STANDARD_DICE_STEPS` in `src/core/combat/modifiers.ts`, verifying die tier stepping behavior with unit tests
- [x] 2.2 Implement pure `getEffectiveAbility(base, modifiers): EffectiveAbility` in `src/core/combat/modifiers.ts` with property overrides, deltas, effect injections, and provenance attribution logging, verifying with unit tests
- [x] 2.3 Implement atomic damage effect handler in `src/core/combat/effects/damageHandler.ts` and register in `defaultEffectRegistry`, verifying damage resolution across hit, crit, graze, and miss outcomes

## 3. Combat Resolver & Engine Pipeline Integration

- [x] 3.1 Update `executeAbility()` in `src/core/combat/resolver.ts` to evaluate `getEffectiveAbility()` and iterate through `effects` array, respecting `targetScope` and `applyOn` conditions
- [x] 3.2 Update `canExecuteAbility()` in `src/core/combat/validator.ts` and targeting range calculations in `src/ui/combat/useCombatSimulation.ts` to evaluate effective AP cost and range via `getEffectiveAbility()`
- [x] 3.3 Replace the ad-hoc `pendingAbilityModifier` in `resolver.ts` and `turnClock.ts` with the unified `AbilityModifier` pipeline (`consumesOnUse`), verifying automatic primer consumption

## 4. Class Packages Migration

- [x] 4.1 Migrate Tier 0 starter abilities in `src/data/packages/novice.ts` to the `effects: [...]` array shape and verify unit tests
- [x] 4.2 Migrate Tier 1 class packages in `src/data/packages/warrior.ts`, `thief.ts`, and `wizard.ts` to `effects: [...]` and verify package contracts
- [x] 4.3 Migrate Tier 2 class packages in `src/data/packages/knight.ts`, `infiltrator.ts`, and `sorcerer.ts` to `effects: [...]` and verify package contracts
- [x] 4.4 Directly migrate all test fixtures and mock abilities across test suites (`abilities.test.ts`, `resolution.test.ts`, `displacement.test.ts`, etc.) to the new `effects: [...]` shape with zero backwards-compatibility shims

## 5. UI Attribution & Augment Indicators

- [x] 5.1 Update `src/ui/combat/ActionBar.tsx` to render celestial `✦` augment indicators on buttons when modified and display discounted AP costs in emerald green
- [x] 5.2 Update `src/ui/combat/ActionBar.tsx` hover tooltip to render inline attribution badges (`[✦ +1 Range from Spell Sculpt]`) and the Active Augments summary list
- [x] 5.3 Update `src/ui/combat/ActionBar.test.tsx` to verify augment badges and attributions render properly for both unmodified and modified abilities

## 6. End-to-End Verification

- [x] 6.1 Run full Vitest test suite (`npm test`) across all combat, progression, and campaign suites to verify 100% test pass rate with zero regressions
- [x] 6.2 Author integration test verifying in-combat primers (*Spell Sculpt*) and permanent overclocks (*Bear Strength*) modify abilities, execute correctly in combat, and record proper attributions
