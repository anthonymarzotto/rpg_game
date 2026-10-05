# Tasks

## 1. Combat Types & Data Models

- [x] 1.1 Extend `src/core/types/ability.ts` with new effect types (`CTB_DELAY`, `FORCE_FACING`, `CONDITION_APPLIED`) and verify TypeScript compiles without error
- [x] 1.2 Define `ActiveCondition` and `PendingAbilityModifier` interfaces in `src/core/combat/types.ts` with mandatory `sourceUnitId` and verify existing tests pass
- [x] 1.3 Add `activeConditions: ActiveCondition[]` and `pendingAbilityModifier?: PendingAbilityModifier` to `CombatUnit` and update factory/mock initializers

## 2. Combat Engine & Effect Pipeline

- [x] 2.1 Implement `ctbDelayHandler` in `src/core/combat/effects/ctbDelayHandler.ts`, register it in `registry.ts`, and verify unit tests confirm gauge reduction floored at 0
- [x] 2.2 Implement `conditionHandler` in `src/core/combat/effects/conditionHandler.ts` to dispatch `STATUS_APPLIED` events with `sourceUnitId`, and register in `registry.ts`
- [x] 2.3 Update `src/core/combat/turnClock.ts` to resolve turn-start `POISON` and `BURN` damage ticks before AP grant, decrement durations, purge expired conditions, and verify with unit tests
- [x] 2.4 Update `src/core/combat/validator.ts` to reject single-target attacks against units with `STEALTH` and verify validation tests
- [x] 2.5 Update `src/core/combat/attackRoll.ts` to apply Disadvantage when `CHALLENGED` by a different unit and grant Advantage when attacking from `STEALTH`, verifying attack roll tests
- [x] 2.6 Update `src/core/combat/resolver.ts` to evaluate `aoeRadius` for friendly buffs (`damageType: 'NONE'`), dispatching effects across all friendly units in radius (powering `Lead the Charge`), and verify with tests
- [x] 2.7 Update `src/core/combat/resolver.ts` to apply and consume `pendingAbilityModifier` when executing eligible Mage abilities (powering `Spell Sculpt`), clearing at turn end in `turnClock.ts`

## 3. Tier 2 Class Packages Authoring

- [x] 3.1 Author `src/data/packages/knight.ts` with `Lead the Charge`, `Challenging Shout`, `Pommel Strike`, and `Tactical Vanguard` passive, verifying package contract
- [x] 3.2 Author `src/data/packages/infiltrator.ts` with `Expose Weakness`, `Smoke Veil`, `Toxic Shiv`, and `Elusive Stride` passive, verifying package contract
- [x] 3.3 Author `src/data/packages/sorcerer.ts` with `Spell Sculpt`, `Ignite`, `Gust`, and `Wild Surge` passive, verifying package contract
- [x] 3.4 Export all Tier 2 packages in `src/data/packages/index.ts` and verify `getClassPackage` resolves for `knight`, `infiltrator`, and `sorcerer`

## 4. Pre-Encounter Setup & Passive Event Triggers

- [x] 4.1 Implement pre-encounter setup pass in `src/core/combat/encounter.ts` that seeds initial state (e.g. +25 initiative gauge for `Tactical Vanguard`), verifying combat initialization tests
- [x] 4.2 Implement `onCriticalHit` event dispatch in `src/core/combat/resolver.ts` and register `wildSurgeHandler` to execute spontaneous 1d3 surges, verifying on-crit tests
- [x] 4.3 Implement `onMove` passive hook for `Elusive Stride` in `src/core/combat/resolver.ts` to grant +2 Evasion until next turn upon spending AP to Move, verifying with tests
- [x] 4.4 Update `src/core/ai/heuristics.ts` to map `infiltrator` to `SKIRMISHER`, `sorcerer` to `SNIPER`, and `knight` to `SUPPORT` in `resolveAIProfile`, and add primer scoring in `decisionEngine.ts` for `Spell Sculpt`, verifying with AI decision tests
- [x] 4.5 Add `02_human_male`, `82_human_male`, and `98_human_male` to `AVAILABLE_PIXEL_TOKENS` in `src/ui/combat/tokenAssets.ts`, verifying token resolution tests pass
- [x] 4.6 Update `assembleEnemySquad` in `src/core/campaign/encounterGenerator.ts` to allow Stage 3+ encounters to spawn Tier 2 enemies (`knight`, `infiltrator`, `sorcerer`) at 40 threat budget, verifying encounter generation tests

## 5. Integration Verification & Progression

- [x] 5.1 Run full Vitest suite (`npm test`) across all combat, progression, and campaign suites to verify zero regressions
- [x] 5.2 Create integration test verifying a Level 0 recruit can advance to Level 2 Knight, Infiltrator, or Sorcerer in Camp, equip their abilities/passives as active and wildcard loadouts, and execute combat trials successfully
