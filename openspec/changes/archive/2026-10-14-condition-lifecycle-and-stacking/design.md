# Design

## Context

Status conditions (`POISON`, `BURN`, `CHALLENGED`, `STEALTH`) were previously stored via raw array pushes to `unit.activeConditions`, with logic scattered across:
- `conditionHandler.ts` (raw push + hardcoded forced facing for `CHALLENGED`),
- `turnClock.ts` (hardcoded DoT ticks for `POISON` and `BURN`),
- `validator.ts` (hardcoded check for `STEALTH` invalidating targeting),
- `resolver.ts` (hardcoded post-action filter purging `STEALTH` on attack),
- `decisionEngine.ts` and `heuristics.ts` (auxiliary scores like focus-fire +3 and standoff +2 bypassing AP conservation for zero-damage debuffs, causing repeated spam).

The introduction of `evaluateAttackRollContext` in `CONDITION_REGISTRY` established the pattern of centralizing condition behavior in declarative definitions. This design completes that architectural shift.

## Goals / Non-Goals

**Goals:**
- Provide declarative `StackingPolicy` on `ConditionDefinition` to handle duplicate applications gracefully (`OVERRIDE_SOURCE` for `CHALLENGED`, `STACK_INTENSITY` for `POISON`/`BURN`, `REFRESH_DURATION` for `STEALTH`).
- Decouple physical facing from status conditions by using the existing `FORCE_FACING` atomic `AbilityEffect` on `CHALLENGING_SHOUT`.
- Provide condition lifecycle hooks: `onTurnStart`, `canBeTargeted`, and `onAfterAction` in `ConditionDefinition`.
- Eliminate repetitive AI debuff/buff spam by suppressing auxiliary scores on zero-damage actions and guarding against redundant condition/buff applications.

**Non-Goals:**
- Implementing new conditions (`BLIND`, `PRONE`, `CONFUSED`) — these will utilize this registry in future features.
- Introducing a generic aura or multi-target tick scheduler outside of existing `turnClock.ts` turn events.

## Decisions

### Decision 1: Declarative Stacking Policies vs Custom Hook
- **Choice**: Use a discriminated enum on `ConditionDefinition`:
  ```ts
  export type StackingPolicy = 'OVERRIDE_SOURCE' | 'STACK_INTENSITY' | 'REFRESH_DURATION' | 'IGNORE';
  ```
- **Rationale**:
  - `OVERRIDE_SOURCE`: Implements Taunt Steal. The target retains exactly one `CHALLENGED` condition pointing to the latest challenger, refreshing duration. Prevents universal disadvantage deadlock when two enemies taunt the same unit.
  - `STACK_INTENSITY`: Stacks `damagePerTurn` up to a ceiling of 8 while refreshing duration to `Math.max(existing.durationTurns, incoming.durationTurns)`.
  - `REFRESH_DURATION`: Refreshes duration to `Math.max(existing.durationTurns, incoming.durationTurns)`.
- **Alternatives Considered**: Arbitrary reducer functions `stack(existing, incoming) => ActiveCondition`. Rejected as overly complex; declarative policies are easier to audit and serialize.

### Decision 2: Decoupled `FORCE_FACING` Atomic Effect vs Condition `.onApplied()`
- **Choice**: Model forced facing as an atomic `AbilityEffect` (`type: 'FORCE_FACING'`) on `CHALLENGING_SHOUT`, removing facing manipulation from `conditionHandler.ts` when handling `CHALLENGED`.
- **Rationale**: Forcing facing is an instantaneous spatial effect executed by the ability during attack resolution, not a persistent condition. Composing `{ type: 'FORCE_FACING' }` with `{ type: 'CONDITION', conditionType: 'CHALLENGED' }` adheres directly to the composable abilities architecture and prevents unwanted side-effects on abilities like `FLAMBOYANT_FLOURISH`.
- **Alternatives Considered**: Adding an `.onApplied()` lifecycle hook to `ConditionDefinition`. Rejected because facing is an ability action, not intrinsic to the `CHALLENGED` debuff state itself.

### Decision 3: Declarative Lifecycle Hooks on `ConditionDefinition`
- **Choice**: Add hooks to `ConditionDefinition`:
  - `onTurnStart?(condition, unit, state): { damage?: number; damageType?: DamageType; events?: CombatEvent[] } | void`
  - `canBeTargeted?(condition, actor, target, ability): boolean`
  - `onAfterAction?(condition, actor, action, result): { removeCondition?: boolean } | void`
- **Rationale**: Replaces ad-hoc string checks in `turnClock.ts`, `validator.ts`, and `resolver.ts` with polymorphic condition handlers.

### Decision 4: AI Heuristic Redundancy Dampening
- **Choice**:
  - In `heuristics.ts`, evaluate whether a target is already afflicted with `CHALLENGED` from the acting unit, returning score 0.
  - In `heuristics.ts`, evaluate whether an ally has `initiativeGauge >= 80` or an active speed buff before awarding `INITIATIVE_BOOST` utility, preventing repetitive casting in the same turn.
  - In `decisionEngine.ts`, zero out `focusFire` and `standoff` positioning scores when an ability has zero base damage and zero primary utility. Total action score drops to 0, which is below `apConservationThreshold = 4.0`, causing the AI to conserve remaining AP.

## Risks / Trade-offs

- **[Risk] Existing unit tests check conditionHandler facing behavior**:
  → *Mitigation*: Update unit tests in `conditionHandler.test.ts` to test `FORCE_FACING` via its effect type and verify `CHALLENGING_SHOUT` composition in integration tests.
- **[Risk] DoT intensity stacking could overpower player or boss units**:
  → *Mitigation*: Enforce a hard cap of 8 damage per turn on DoT stacking (4 stacks of 2 dmg/turn).
