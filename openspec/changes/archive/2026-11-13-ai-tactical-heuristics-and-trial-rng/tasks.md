# Tasks

## 1. Unified Trial Seeded Dice Roller & Seed Recording

- [x] 1.1 Expose `public readonly seed: number` on `SeededDiceRoller` in `src/core/combat/dice.ts`, add optional `seed?: number` to `CombatState` and `SerializedCombatState` in `src/core/combat/types.ts`, record `seed` in `createCombatState` (`src/core/combat/resolver.ts`), preserve `seed` in `serializeCombatState` / `deserializeCombatState` (`src/core/combat/stateSerializer.ts`), surface `seed` in `generateTrialMarkdownReport` (`src/core/combat/reportGenerator.ts`), and verify serialization/report unit tests in `src/core/combat/stateSerializer.test.ts` and `src/core/combat/reportGenerator.test.ts` pass.
- [x] 1.2 Update `DevDiceRoller` (`src/ui/combat/devDice.ts`) to accept an optional backing `DiceRoller` for `NORMAL` mode, replace the per-call `new SeededDiceRoller()` default parameter in `executeHostileTurnAsync` (`src/ui/combat/asyncTurnSequencer.ts`) with a module-level `defaultDiceRoller` fallback, wire a single trial-scoped `SeededDiceRoller` per encounter session (init, rematch, reset) in `src/ui/combat/useCombatSimulation.ts`, and add/verify unit tests in `src/ui/combat/asyncTurnSequencer.test.ts` confirming consecutive hostile turns advance the PRNG stream rather than repeating seed `1337`.

## 2. AI Movement Approach & Long-Range Advancement

- [x] 2.1 In `src/core/ai/decisionEngine.ts`, remove the `if (bestAttackFromCand) ... else { reposition }` mutual exclusion so `bestRepositionScore` is always evaluated for every reachable hex and the higher-scoring option is kept, and verify with unit tests in `src/core/ai/decisionEngine.test.ts` that unengaged self/ally buffs no longer cause units to skip turns via `CONSERVE_AP`.
- [x] 2.2 In `src/core/ai/decisionEngine.ts`, allow `SNIPER` and ranged `SUPPORT` units outside `preferredStandoffRange + 1` to score approach moves (`(currentDev - candDev) * 3.5`) when intervening terrain blocks single-step `hasLoS` while keeping the higher `(currentDev - candDev) * 5` weight when `hasLoS` holds, and verify with unit tests in `src/core/ai/decisionEngine.test.ts` that ridge-blocked Snipers advance rather than hold.

## 3. Support Rally, Rescue Swap, and Melee Support Follow-Up

- [x] 3.1 In `scoreBuffAbility` (`src/core/ai/heuristics.ts`), scale AoE positive stat buffs (`aoeRadius > 0`, e.g., `Lead the Charge`) by unbuffed allies within radius (`(unbuffedAlliesInRadius + 1) * 5.0`), gate `POSITION_SWAP` abilities (`Intercept Step`) on `allyMinHostileDist <= 2 && actorMinHostileDist > allyMinHostileDist` with a `+12.0` rescue bonus, and verify both behaviors with unit tests in `src/core/ai/heuristics.test.ts`.
- [x] 3.2 In `src/core/ai/decisionEngine.ts` and `src/core/ai/heuristics.ts`, keep multi-target `Challenging Shout` unrestricted, treat `SUPPORT` units with no ranged damaging attacks (`range >= 2`) as melee closers (`candDist < currentDist`) instead of standoff kiters, award `+8.0` in `scoreDebuffAndUtility` for `TARGET_CHALLENGED` conditional attacks (`Pommel Strike`) against Challenged targets, and verify with unit tests in `src/core/ai/decisionEngine.test.ts` and `src/core/ai/heuristics.test.ts`.

## 4. Team Follow-Up Verification, Anti-Isolation, Flank Dispersion & Coiled Apex

- [x] 4.1 In `src/core/ai/heuristics.ts`, implement `canTeamCapitalizeOnSetup` checking self follow-up AP or any other living allied unit within `getEffectiveMove(ally) + allyMaxAttackRange` of `targetCoord`, gate 1-turn non-damaging negative stat debuffs and non-rescue `FORCE_FACING_AWAY` utility (`Flash Powder`) on `canTeamCapitalizeOnSetup`, and verify in `src/core/ai/heuristics.test.ts` (ensuring both multi-ally and 1v1 self-follow-up scenarios behave as expected).
- [x] 4.2 In `src/core/ai/decisionEngine.ts`, prevent flat/downhill `TELEPORT` (`Rooftop Vault`) no-attack approach moves when walk-reachable, apply an isolation penalty when moving/leaping into `>= 3` hostiles with `0` allies within 3 hexes unless securing a finishing blow, apply a `-2.5` per-adjacent-ally crowding penalty on `candDist >= 2` approach moves to spread units along flank lanes, elevate `apConservationThreshold` to `15.0` on the final 1 AP for `unspentApVirtualHeight` (`Coiled Apex`) units (`virtualElevation === 0`) within 4 hexes of an enemy, and verify all four behaviors in `src/core/ai/decisionEngine.test.ts`.

## 5. Release Notes, Version Bump & Full Verification

- [x] 5.1 Bump `version` in `package.json` from `0.17.0` to `0.17.1` and add a strictly end-user-facing `CHANGELOG.md` entry summarizing the enemy dice variety fix, smarter early-turn enemy positioning/rallying, and Dragoon tactical patience (no technical file/symbol/benchmark details).
- [x] 5.2 Run `cmd.exe /c npm test` and `cmd.exe /c npm run build` and confirm all unit tests and production TypeScript/Vite builds succeed cleanly.

