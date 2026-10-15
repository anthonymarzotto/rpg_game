# Tasks

## 1. Types & Declarative Condition Registry

- [x] 1.1 Extend `AbilityEffect` in `src/core/types/ability.ts` with optional `grantsDisadvantage?: boolean`, `attackRollBonus?: number`, and `attackRollPenalty?: number`, and verify typecheck succeeds with `npm run build`
- [x] 1.2 Create `src/core/combat/conditions.ts` defining `ConditionAttackRollModifier`, `ConditionDefinition`, and `CONDITION_REGISTRY` with handlers for `CHALLENGED` and `STEALTH`, and verify with unit tests in `src/core/combat/conditions.test.ts`

## 2. Centralized Attack Roll Context Evaluator

- [x] 2.1 Implement `evaluateAttackRollContext` in `src/core/combat/attackRoll.ts` evaluating modifiers, defense scores, condition hooks, spatial coordinates (`originCoord`/`targetCoord`), advantage cancellation, and d20 probability math ($p$, $1-(1-p)^2$, $p^2$)
- [x] 2.2 Refactor `resolveAttackRoll` in `src/core/combat/attackRoll.ts` to consume `evaluateAttackRollContext` and verify existing roll tests pass with `npm test -- attackRoll.test.ts`

## 3. Target Preview & AI Heuristics Integration

- [x] 3.1 Refactor `computeAbilityMetrics` in `src/core/combat/targetPreview.ts` to delegate to `evaluateAttackRollContext`, exposing `rollAdvantage` (`'ADVANTAGE' | 'DISADVANTAGE' | 'NORMAL'`) and unified `toHitChance` on `TargetPreview`
- [x] 3.2 Expand `src/core/combat/targetPreview.test.ts` with test coverage for Disadvantage math ($p^2$), Challenged penalties, elevation lookahead, and aura defense adjustments, verifying with `npm test -- targetPreview.test.ts`

## 4. UI Indicators & System Verification

- [x] 4.1 Update `src/ui/combat/UnitStatusCard.tsx` to display compact `(Adv)` and `(Disadv)` indicator badges adjacent to hit chance, and verify component tests pass with `npm test -- UnitStatusCard.test.tsx`
- [x] 4.2 Update `docs/plans/LONGTERM.md` marking Bug 4 completed and verify full regression suite passes with `npm test`
