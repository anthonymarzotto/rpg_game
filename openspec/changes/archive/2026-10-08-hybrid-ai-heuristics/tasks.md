# Tasks

## 1. Engine Heuristics: Support Buffs & Move-and-Buff Evaluation

- [x] 1.1 Extend `scoreBuffAbility` in `src/core/ai/heuristics.ts` to evaluate `INITIATIVE_BOOST` and speed acceleration (e.g. `Witch's Talisman`), prioritizing frontline or low-CTB allies, and verify with unit tests
- [x] 1.2 Extend composite move-and-act evaluation in `src/core/ai/decisionEngine.ts` to generate and score `targetType === 'ALLY'` candidate moves when actor has sufficient AP (>= 2), and verify with unit tests

## 2. Tactical Primer & Kit Heuristics

- [x] 2.1 Implement `SKIRMISHER` tactical primer heuristics in `src/core/ai/heuristics.ts` prioritizing `Stand and Deliver!` against armored enemies prior to physical attacks, and verify with unit tests
- [x] 2.2 Implement `SNIPER` tactical repulsion heuristics in `src/core/ai/heuristics.ts` valuing `KNOCKBACK` displacement (`Eldritch Blast`) against adjacent threats and fallback to armor-bypassing melee (`Pact Blade`), and verify with unit tests
- [x] 2.3 Implement `BRAWLER` shock charge and taunt evaluation in `src/core/ai/heuristics.ts` valuing `Lance Charge` straight-line initiation and `Flamboyant Flourish` taunt/evasion priming, and verify with unit tests
- [x] 2.4 Implement `SUPPORT` effigy manipulation in `src/core/ai/heuristics.ts` prioritizing `Poppet Needle` facing reversal against melee enemies threatening allies, and verify with unit tests

## 3. End-to-End Hybrid Class AI Verification

- [x] 3.1 Author comprehensive decision engine tests in `src/core/ai/decisionEngine.test.ts` for Cavalier (`BRAWLER`), Highwayman (`SKIRMISHER`), Warlock (`SNIPER`), and Witch (`SUPPORT`) verifying autonomous turn execution and combos
- [x] 3.2 Execute complete test suite (`cmd.exe /c npm test`) and production build check (`cmd.exe /c npm run build`) to ensure zero regressions across all AI and combat systems
