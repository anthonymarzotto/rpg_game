# Tasks

## 1. AI Decision Engine & Smoke Veil Loop Fix

- [x] 1.1 In `src/core/ai/heuristics.ts` (`scoreBuffAbility`), add a condition check returning `{ score: 0 }` if an ability applies `STEALTH` and the target already has active `STEALTH`. Verify with unit tests in `src/core/ai/decisionEngine.test.ts`.
- [x] 1.2 Verify that multi-action combos (e.g. Smoke Veil -> Attack -> Smoke Veil when bonus AP is available) remain valid for player and AI by asserting no artificial `oncePerTurn` constraint exists on `Smoke Veil`.

## 2. Extensible Damage Condition Hook (`onTakeDamage`)

- [x] 2.1 In `src/core/combat/conditions.ts`, define `DamageConditionContext` and add the `onTakeDamage` hook to `ConditionDefinition`. Implement the hook on `STEALTH` to remove stealth on direct attacks, AoE splash, or `BURN` damage, while returning `undefined` for `POISON` DoT damage.
- [x] 2.2 In `src/core/combat/resolver.ts` (`applyCombatEvents`), dispatch damage events through `def.onTakeDamage` and filter out conditions returning `{ removeCondition: true }`, logging condition removal.
- [x] 2.3 Add unit tests in `src/core/combat/conditions.test.ts` and `src/core/combat/resolution.test.ts` verifying that attacks, AoE splash, and Burn damage break stealth, while Poison ticks do not.

## 3. Unified Front-Arc Detection Helper & Turn-Start Hook

- [x] 3.1 Implement a reusable detection helper (`evaluateFrontArcDetection`) in `src/core/combat/conditions.ts` (or `detection.ts`) that checks if any opposing stealthed units at distance 1 fall within the detector's 3-hex `FRONT` combat arc (relative directions 0, 1, 5). When detected, remove `STEALTH`, preserve the detected unit's facing, and emit an active-unit-first log entry (`"[Active Unit] spotted [Enemy] in their direct field of view! Stealth broken!"`).
- [x] 3.2 In `src/core/combat/turnClock.ts` (`advanceTurn`), invoke `evaluateFrontArcDetection` for `nextActive` upon turn start.
- [x] 3.3 Add unit tests in `src/core/combat/turnClock.test.ts` verifying that ending a turn in an enemy's `FRONT` arc triggers detection on the enemy's turn start, while ending in `REAR` or `FLANK` arcs maintains stealth.

## 4. Movement Step Detection & Interruption

- [x] 4.1 In `src/core/combat/resolver.ts` (`executeMove`), iterate through the movement path step-by-step; after each step, update facing to the travel vector and invoke `evaluateFrontArcDetection`.
- [x] 4.2 If an opposing stealthed unit is detected in any of the active unit's 3 frontal hexes during movement, halt movement immediately at the current step tile, do not traverse the remaining path, and conclude the move action (1 AP spent).
- [x] 4.3 Add unit tests in `src/core/combat/resolution.test.ts` verifying that moving into line-of-sight of a stealthed unit halts movement at that step, unmasks the enemy without changing the enemy's facing, and allows immediate follow-up actions with remaining AP.

## 5. Integration Verification

- [x] 5.1 Run full project test suite via `cmd.exe /c npm test` to ensure zero regressions across combat, AI, and grid systems.
