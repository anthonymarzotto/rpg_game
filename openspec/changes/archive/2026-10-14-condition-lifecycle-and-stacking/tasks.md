# Tasks

## 1. Condition Registry Lifecycle & Stacking Policy

- [x] 1.1 Expand `ConditionDefinition` interface in `src/core/combat/conditions.ts` to include `stackingPolicy`, `onTurnStart`, `canBeTargeted`, and `onAfterAction`.
- [x] 1.2 Implement condition definitions in `CONDITION_REGISTRY` for `CHALLENGED` (`OVERRIDE_SOURCE`), `POISON` (`STACK_INTENSITY`), `BURN` (`STACK_INTENSITY`), and `STEALTH` (`REFRESH_DURATION`, `canBeTargeted`, `onAfterAction`), and verify with unit tests in `src/core/combat/conditions.test.ts`.

## 2. Effect Application & Decoupled Facing

- [x] 2.1 Update `conditionHandler.ts` to resolve stacking policies via `CONDITION_REGISTRY` instead of blind `activeConditions.push()`.
- [x] 2.2 Remove implicit forced facing from `conditionHandler.ts` for `CHALLENGED`, add `{ type: 'FORCE_FACING' }` to `CHALLENGING_SHOUT` in `src/data/packages/knight.ts`, and verify via `src/core/combat/effects/conditionHandler.test.ts`.

## 3. Subsystem Lifecycle Delegation

- [x] 3.1 Delegate turn-start DoT ticking in `src/core/combat/turnClock.ts` to `conditionDef.onTurnStart`, and verify via `src/core/combat/turnClock.test.ts`.
- [x] 3.2 Delegate targeting constraint checks in `src/core/combat/validator.ts` to `conditionDef.canBeTargeted`, and post-action breaking in `src/core/combat/resolver.ts` to `conditionDef.onAfterAction`, verifying with `src/core/combat/resolution.test.ts`.

## 4. AI Decision Heuristics & Redundancy Dampening

- [x] 4.1 Update `src/core/ai/heuristics.ts` to score 0 for `CHALLENGED` if target is already challenged by actor, and score 0 for `INITIATIVE_BOOST` if target ally has initiative gauge >= 80 or an active speed buff.
- [x] 4.2 Update `src/core/ai/decisionEngine.ts` to zero out auxiliary scores (focusFire, standoff) for zero-damage, zero-utility abilities so they stay below the AP conservation threshold.
- [x] 4.3 Add unit and regression tests in `src/core/ai/decisionEngine.test.ts` and `src/core/ai/heuristics.test.ts` verifying that Knight does not repeat Challenging Shout in the same turn and Witch does not repeatedly cast Talisman on buffed allies.

## 5. Verification & Integration

- [x] 5.1 Run full unit test suite via `cmd.exe /c npm test` and production build via `cmd.exe /c npm run build` to confirm zero regressions.
