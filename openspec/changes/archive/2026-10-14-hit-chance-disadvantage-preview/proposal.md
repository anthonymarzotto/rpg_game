# Proposal

## Why

Currently, target hit-chance calculations are duplicated and fragmented between `attackRoll.ts` (combat resolution) and `targetPreview.ts` (UI display and AI decision heuristics). In particular, `targetPreview.ts` completely ignores Disadvantage (lacking the mathematical $p^2$ formula), ignores the Knight's `CHALLENGED` condition, ignores low-ground elevation disadvantage, ignores protective auras, and ignores active attack-roll stat modifiers. This causes the UI and AI to display and plan around overly optimistic hit chances that diverge from actual resolution.

Furthermore, condition-based roll modifiers are hardcoded ad-hoc as string checks in `attackRoll.ts`, rather than relying on a declarative condition registry that can easily accommodate future conditions (such as `BLIND`, `PRONE`, etc.).

## What Changes

- **Declarative Condition Definition Registry**: Introduce a condition registry in `src/core/combat/conditions.ts` with typed roll hooks (`onOutgoingAttackRoll`, `onIncomingAttackRoll`) that declare how active conditions modify rolls without hardcoding condition tags across the engine.
- **Unified Attack Roll Context Evaluator**: Implement `evaluateAttackRollContext` in `src/core/combat/attackRoll.ts` as the single source of truth for to-hit calculations, aggregating base attributes, active modifiers, ability effects, condition registry hooks, elevation, auras, and passives with spatial lookahead (`originCoord`).
- **Mathematical Probability Modeling**: Calculate true d20 hit probabilities reflecting Normal ($p$), Advantage ($1 - (1-p)^2$), and Disadvantage ($p^2$) clamped between 5% and 95%.
- **AbilityEffect Roll Properties**: Extend `AbilityEffect` with `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty` so abilities and conditional effects can declaratively modify attack rolls.
- **UI & Preview Integration**: Expose `rollAdvantage` on `TargetPreview` and render `(Adv)` / `(Disadv)` badges in `UnitStatusCard.tsx`. Ensure the AI decision engine evaluates realistic expected damage under Disadvantage.

## Capabilities

### New Capabilities
- `attack-roll-context`: Centralized attack roll context evaluator unifying mathematical hit probability and advantage/disadvantage resolution across preview, AI, and combat execution.

### Modified Capabilities
- `combat-conditions`: Condition effects on attack rolls evaluate through a declarative condition registry, ensuring `CHALLENGED` and `STEALTH` apply consistently to both resolution and previews.
- `composable-abilities`: `AbilityEffect` supports declarative accuracy modifiers and advantage/disadvantage flags.

## Impact

- **Affected Files**:
  - `src/core/types/ability.ts`: Add `grantsDisadvantage`, `attackRollBonus`, `attackRollPenalty` to `AbilityEffect`.
  - `src/core/combat/conditions.ts`: New condition registry module.
  - `src/core/combat/attackRoll.ts`: New `evaluateAttackRollContext` function, refactor `resolveAttackRoll`.
  - `src/core/combat/targetPreview.ts`: Refactor `computeAbilityMetrics` to query `evaluateAttackRollContext`, export `rollAdvantage`.
  - `src/ui/combat/UnitStatusCard.tsx`: Display advantage/disadvantage indicators next to hit chance.
  - `src/core/combat/targetPreview.test.ts`: Comprehensive tests for disadvantage, elevation, auras, and cancelling modifiers.
- **Breaking Changes**: None. All new properties on `AbilityEffect` and `TargetPreview` are optional or backward-compatible extensions.
