# Proposal

## Why

Tactical AI scoring in `heuristics.ts` currently relies on hardcoded ability identifiers (`flash_powder`, `pact_blade`) and ad-hoc effect checks (`BLOOD_FRENZY`, `SPELL_SCULPT`) to orchestrate multi-action combos. Because units can borrow domain abilities across classes via wildcard slots and encounter enemies do not strictly have player class packages, ability scoring must be architected around declarative ability metadata and generic effect semantics rather than one-off rules in the core heuristics engine.

## What Changes

- **Declarative Ability AI Metadata (`AbilityAIHint`)**: Extend the `Ability` interface with an optional `aiHint` field declaring tactical roles (`PRIMER`, `FINISHER`, `DISRUPTION`, `UTILITY`) and combo primer prerequisites (required follow-up attack type, minimum AP threshold, bonus scoring weight).
- **Generic Primer & Combo Evaluator**: Introduce a data-driven primer scoring function in `heuristics.ts` that dynamically evaluates whether the actor has sufficient remaining AP and an in-range follow-up target, eliminating hardcoded `BLOOD_FRENZY`, `SPELL_SCULPT`, and `flash_powder` primer branches.
- **Universal Debuff & Buff Redundancy Guards**: Replace ability-specific anti-spam checks (such as the `flash_powder` attack-roll guard) with generic checks that prevent any debuff or buff from being reapplied if the target already carries that active modifier.
- **Purge Hardcoded Ability Identifiers**: Remove all hardcoded string checks (`ability.id === 'flash_powder'`, `ability.id === 'pact_blade'`) from `heuristics.ts`, delegating armor bypass to natural damage mitigation calculations (`computeAbilityMetrics`) and debuff application to generalized effect handlers.
- **Annotate Existing Class Packages**: Annotate primer abilities across existing packages (`blood_frenzy` in Berserker, `spell_sculpt` in Wizard, `flash_powder` in Cat-Burglar, `stand_and_deliver` in Highwayman) with their declarative `aiHint` definitions.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `hybrid-ai-heuristics`: Generalizes primer coordination, debuff non-redundancy guards, and tactical ability evaluation to operate over declarative `aiHint` metadata and semantic effects instead of hardcoded ability IDs and class packages.

## Impact

- **Core Types**: `src/core/types/ability.ts` gains `AbilityAIHint` and optional `aiHint` on `Ability`.
- **AI Engine**: `src/core/ai/heuristics.ts` and `src/core/ai/decisionEngine.ts` are refactored to use data-driven primer evaluation and generic modifier guards; all `ability.id` checks removed.
- **Data Packages**: Class packages containing primer abilities (`catBurglar.ts`, `berserker.ts`, `wizard.ts`, `highwayman.ts`) declare their `aiHint` metadata.
- **Tests**: Existing decision engine and class integration tests (`decisionEngine.test.ts`, `catBurglarIntegration.test.ts`, etc.) must pass identically, verifying backward compatibility.
