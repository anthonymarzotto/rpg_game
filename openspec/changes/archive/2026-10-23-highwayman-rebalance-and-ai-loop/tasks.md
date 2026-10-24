# Tasks

## 1. Passive & Ability Contract Updates

- [x] 1.1 Update `PassiveTrait` type in `src/core/types/passive.ts` and `damageEngine.ts` to support Force-based passive damage bonuses (`targetForceBonus` or Force comparison), verifying with tests in `src/core/combat/passives.test.ts`.
- [x] 1.2 Update `HIGHWAY_TOLL` in `src/data/packages/highwayman.ts` to grant +2 flat physical damage against targets with base Force greater than actor base Force (Force >= 2), verifying with `src/core/units/packages.test.ts` and `src/core/combat/highwaymanIntegration.test.ts`.
- [x] 1.3 Update `GALLANT_FLOURISH` in `src/data/packages/highwayman.ts` to add `RETREAT_STEP: 1` (`targetScope: 'SELF'`) and `aiHint.meleeContingency`, verifying resolution and displacement execution in `src/core/combat/highwaymanIntegration.test.ts`.

## 2. AI Heuristics & Anti-Loop Decision Logic

- [x] 2.1 Update `scorePrimerAbility` in `src/core/ai/heuristics.ts` to return zero score if the target already has the intended negative modifier active, verifying that hold-up primers do not re-prime already-shredded targets.
- [x] 2.2 Update `scoreDebuffAndUtility` in `src/core/ai/heuristics.ts` so non-damaging abilities with negative stat modifiers cannot bypass non-redundancy guards via secondary `CTB_DELAY` on a target already debuffed by the actor.
- [x] 2.3 Add self-buff evaluation for offensive attack abilities with `targetScope: 'SELF'` stat modifiers (such as `+2 Evasion` on `Gallant Flourish`) and `meleeContingency` disengage scoring in `src/core/ai/heuristics.ts` and `src/core/ai/decisionEngine.ts`.
- [x] 2.4 Add AI decision engine tests in `src/core/ai/decisionEngine.test.ts` verifying Highwayman sequences `Stand and Deliver!` into `Point-Blank Buckshot` at Range 2 and prioritizes `Gallant Flourish` with retreat when engaged at Range 1.

## 3. Benchmark Validation & Telemetry Verification

- [x] 3.1 Execute 1v1 duel suite (`Highwayman vs Cavalier`) in `src/core/combat/simulation.test.ts` and verify duplicate hold-up spamming is eliminated and combat concludes cleanly.
- [x] 3.2 Execute 100-match 3v3 squad combat simulation suite in `src/core/combat/squadBenchmarks.test.ts` and verify Highwayman net damage, ability distribution (Buckshot and Flourish casts), and squad win contribution.
