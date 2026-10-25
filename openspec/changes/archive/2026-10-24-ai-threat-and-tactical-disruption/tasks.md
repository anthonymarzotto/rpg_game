# Tasks: AI Threat Scoring, Tactical Movement Denial, and High-Ground Disruption

## 1. Hostile Movement Denial (`SLOW`) & Non-Redundancy Heuristics

- [x] 1.1 Implement `SLOW` effect evaluation in `scoreDebuffAndUtility` (`src/core/ai/heuristics.ts`) to score movement reduction on targets with Move $\ge 2$, and verify via unit test that `Frostbite` scores positive utility against mobile targets.
- [x] 1.2 Implement kiting utility bonus in `scoreDebuffAndUtility` when applying `SLOW` against melee `BRAWLER` threats located at distance $\ge 2$, and verify via unit test that ranged casters prioritize slowing advancing melee threats.
- [x] 1.3 Implement `SLOW` non-redundancy guard in `scoreDebuffAndUtility` suppressing utility and enforcing AP conservation on non-damaging debuffs when the target already has an active negative Move modifier, and verify via unit test that duplicate slow applications are zeroed out.

## 2. High-Ground Disruption & Cliff Plunge (`KNOCKBACK`)

- [x] 2.1 Integrate `state.arena.calculateKnockback` into `KNOCKBACK` evaluation in `scoreDebuffAndUtility` to score cliff plunge fall damage when knockback drops the target down a ledge ($\Delta h \le -2$), and verify via unit test that cliff shoves receive high fall damage utility.
- [x] 2.2 Add vantage disruption scoring when knockback shoves an elevated target down from high ground ($\Delta h \ge 1$), and verify via unit test that perched targets on high ground receive high displacement priority.

## 3. Archetype Threat Weighting & Decision Engine Integration

- [x] 3.1 Implement `scoreTargetThreat` in `src/core/ai/heuristics.ts` mapping archetypes (`SNIPER` $+10.0$, `SUPPORT` $+8.0$, `SKIRMISHER` $+4.0$, `BRAWLER` $0$) and verify via unit tests that threat scores reflect archetype roles.
- [x] 3.2 Integrate `scoreTargetThreat` into immediate single-target ability candidate evaluation in `src/core/ai/decisionEngine.ts`, and verify via unit test that an AI attacker targets an elevated Warlock (`SNIPER`) on high ground over a frontline Warrior (`BRAWLER`) despite low-ground Disadvantage.
- [x] 3.3 Integrate `scoreTargetThreat` into composite move-and-act evaluation in `src/core/ai/decisionEngine.ts`, and verify that repositioning attacks factor in target threat weighting.

## 4. Test Suite Validation & Verification

- [x] 4.1 Run full AI test suite (`vitest run src/core/ai/decisionEngine.test.ts`) and verify all existing and new tactical decision tests pass cleanly without regression.
