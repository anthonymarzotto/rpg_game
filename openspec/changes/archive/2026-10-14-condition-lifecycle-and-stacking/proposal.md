# Proposal

## Why

Currently, status conditions are stored in `activeConditions` via unmanaged array `push()`, lacking stacking rules, source attribution updates, and lifecycle management. When multiple units challenge the same target, or when a knight repeatedly uses Challenging Shout, the target accumulates duplicate `CHALLENGED` debuffs, leading to universal disadvantage deadlock. Similarly, DoTs (Poison/Burn) do not support stacking intensity, and lifecycle triggers (DoT ticks, stealth targeting prevention, stealth break on attack, forced facing) are hardcoded across disparate subsystems (`turnClock.ts`, `validator.ts`, `resolver.ts`, `conditionHandler.ts`). Furthermore, the AI decision engine repeatedly casts 0-damage debuffs or ally initiative boosts in a single turn because auxiliary heuristic scores (focus fire, standoff) overcome AP conservation.

Expanding `CONDITION_REGISTRY` into a declarative condition lifecycle manager with explicit stacking policies, while dampening redundant AI debuff and buff evaluations, resolves Bug 6 and Bug 7 cleanly and provides a scalable foundation for all combat status effects.

## What Changes

- **Condition Stacking Policies**:
  - Add `StackingPolicy` to `ConditionDefinition` in `CONDITION_REGISTRY`:
    - `CHALLENGED`: `OVERRIDE_SOURCE` (Taunt Steal — overrides `sourceUnitId` to the latest challenger and refreshes duration; eliminates multi-challenger universal disadvantage).
    - `POISON` & `BURN`: `STACK_INTENSITY` (stacks `damagePerTurn` up to a configured cap of 8, refreshing duration to `max(existing, new)`).
    - `STEALTH`: `REFRESH_DURATION` (refreshes duration to `max(existing, new)`).
- **Decoupled Spatial Effects**:
  - Remove hardcoded forced facing from `conditionHandler.ts` condition application branch.
  - Model forced facing explicitly as an atomic `AbilityEffect` (`{ type: 'FORCE_FACING' }`) in `CHALLENGING_SHOUT` (Knight), aligning with composable ability architecture without polluting `ConditionDefinition` with `.onApplied()`.
- **Condition Lifecycle Dispatchers**:
  - Add `onTurnStart(condition, unit, state)` hook to `ConditionDefinition` to handle DoT damage and return `{ damage, damageType }`, decoupling `turnClock.ts`.
  - Add `canBeTargeted(condition, actor, target, ability)` hook to `ConditionDefinition` for targeting rules (e.g., `STEALTH`), decoupling `validator.ts`.
  - Add `onAfterAction(condition, actor, action)` hook to `ConditionDefinition` for post-action status breaking (e.g., attacking breaks `STEALTH`), decoupling `resolver.ts`.
- **AI Decision & Heuristic Redundancy Dampening (Bug 7 & Witch's Talisman)**:
  - In `decisionEngine.ts`, zero out auxiliary tactical scores (focus-fire, standoff) for zero-damage, zero-utility abilities so they cannot overcome the AP conservation threshold (4.0).
  - In `heuristics.ts`, evaluate target's active conditions before scoring taunts/debuffs (`CHALLENGED`): if the target is already challenged by the actor, score 0.
  - In `heuristics.ts`, evaluate target's existing initiative gauge and active speed buffs before scoring `INITIATIVE_BOOST` / `Witch's Talisman` to prevent repetitive casts on the same turn.

## Capabilities

### Modified Capabilities
- `combat-conditions`: Introduce explicit condition stacking policies (`OVERRIDE_SOURCE`, `STACK_INTENSITY`, `REFRESH_DURATION`), condition lifecycle hooks (`onTurnStart`, `canBeTargeted`, `onAfterAction`), and remove hardcoded condition side-effects.
- `hybrid-ai-heuristics`: Suppress redundant debuff/taunt ability scoring against already afflicted targets and prevent zero-damage abilities from clearing AP conservation thresholds via auxiliary positioning scores.

## Impact

- `src/core/combat/conditions.ts`: `ConditionDefinition` schema expanded with `stackingPolicy`, `onTurnStart`, `canBeTargeted`, `onAfterAction`.
- `src/core/combat/effects/conditionHandler.ts`: Queries `CONDITION_REGISTRY[type].stackingPolicy` on application; removes implicit forced facing on `CHALLENGED`.
- `src/data/packages/knight.ts`: `CHALLENGING_SHOUT` adds explicit `{ type: 'FORCE_FACING' }` effect.
- `src/core/combat/turnClock.ts`: Calls `onTurnStart` lifecycle hook instead of switch on condition strings.
- `src/core/combat/validator.ts`: Calls `canBeTargeted` lifecycle hook for targeting checks.
- `src/core/combat/resolver.ts`: Calls `onAfterAction` lifecycle hook for post-action condition modifications.
- `src/core/ai/decisionEngine.ts` & `src/core/ai/heuristics.ts`: Redundant debuff dampening and zero-damage utility gating.
