# Tasks

## 1. Conditions & Tactical Status Pipeline

- [x] 1.1 Add `'EXPOSED'` to `ConditionType` and `'TARGET_CHALLENGED'` to `AbilityCondition` in `src/core/types/ability.ts`, verifying TypeScript compilation with `cmd.exe /c npm test -- --run`
- [x] 1.2 Implement `EXPOSED` condition definition in `src/core/combat/conditions.ts` with `onIncomingAttackRoll` returning Advantage and `REFRESH_DURATION` stacking policy; verify with unit tests in `src/core/combat/conditions.test.ts`
- [x] 1.3 Extend `onAfterAction` hook and `src/core/combat/resolver.ts` so `CHALLENGED` inflicts `EXPOSED` on the attacker when attacking a unit other than the challenger; verify with unit tests in `src/core/combat/conditions.test.ts` and `src/core/combat/resolver.test.ts`
- [x] 1.4 Implement single-attack consumption of `EXPOSED` in `src/core/combat/resolver.ts` (removing `EXPOSED` upon resolving an incoming attack regardless of hit or miss); verify with unit tests in `src/core/combat/resolver.test.ts`

## 2. Ability Pipeline & Knight Kit Implementation

- [x] 2.1 Implement `TARGET_CHALLENGED` conditional bonus damage evaluation in `src/core/combat/effects/damageHandler.ts` and `src/core/combat/targetPreview.ts`; verify with unit tests in `targetPreview.test.ts` and `resolution.test.ts`
- [x] 2.2 Update `src/data/packages/knight.ts`: add `attackRoll: 2` to `LEAD_THE_CHARGE`, add `TARGET_CHALLENGED` + `1d4` bonus damage to `POMMEL_STRIKE`, and update descriptions; verify with package loadout tests
- [x] 2.3 Update Knight class catalog description in `src/data/classes.ts` to reflect the Commander role; verify catalog unit tests pass

## 3. UI, AI Heuristics & Simulation Verification

- [x] 3.1 Add `EXPOSED` badge and icon rendering (`🎯`) in `src/ui/combat/UnitStatusCard.tsx` and `HexGridSvg.tsx`; verify unit status card tests pass
- [x] 3.2 Update AI heuristics in `src/core/ai/heuristics.ts` so challenged enemies factor in the `EXPOSED` retaliation when choosing targets; verify with test case in `src/core/ai/decisionEngine.test.ts`
- [x] 3.3 Execute the full test suite and run 2v2 support synergy benchmark simulation to verify Knight damage improvement and win rates across partner classes
