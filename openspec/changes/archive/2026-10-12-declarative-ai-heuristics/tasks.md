# Tasks

## 1. Type Contracts and Ability Data Annotation

- [x] 1.1 Add `AbilityAIHint`, `AIRole`, `FollowUpCategory`, and `AIPrimerHint` interfaces to `src/core/types/ability.ts` and verify build compiles cleanly with `npm test -- --run src/core/units/abilities.test.ts`
- [x] 1.2 Annotate primer abilities (`flash_powder` in `src/data/packages/catBurglar.ts`, `blood_frenzy` in `src/data/packages/berserker.ts`, `spell_sculpt` in `src/data/packages/wizard.ts`, `stand_and_deliver` in `src/data/packages/highwayman.ts`) with declarative `aiHint` definitions and verify package unit tests pass with `npm test -- --run src/core/units/packages.test.ts`

## 2. Generic Primer and Universal Redundancy Engine

- [x] 2.1 Implement generic `scorePrimerAbility` in `src/core/ai/heuristics.ts` supporting AP threshold checks, candidate follow-up ability filtering, and in-range target validation, verifying with unit tests in `src/core/ai/decisionEngine.test.ts`
- [x] 2.2 Implement universal debuff and buff redundancy guards in `scoreDebuffAndUtility` and `scoreBuffAbility` within `src/core/ai/heuristics.ts`, eliminating the `ability.id === 'flash_powder'` guard while preserving anti-spam behavior
- [x] 2.3 Replace bespoke `BLOOD_FRENZY` and `SPELL_SCULPT` primer blocks in `src/core/ai/heuristics.ts` with calls to `scorePrimerAbility`, and remove `ability.id === 'pact_blade'` armor-bypass override

## 3. Integration Verification and Cross-Class Testing

- [x] 3.1 Add a unit test in `src/core/ai/decisionEngine.test.ts` verifying that a unit borrowing a primer ability (e.g., Flash Powder) via a wildcard slot evaluates the primer sequence identically without relying on the source class package
- [x] 3.2 Run the full test suite (`npm test`) to verify all existing AI decision engine tests, hybrid class integration tests, and Cat-Burglar combo tests pass without regression
