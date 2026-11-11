# Tasks

## 1. Normalized Combatant Factory & Parity Simulation

- [x] 1.1 Implement archetype-weighted attribute distribution and normalized combatant creation in `src/core/combat/simulation.ts` and `src/core/combat/squadSimulation.ts`, verifying that pure classes reach 4 in their main stat and hybrids randomly split extra points between required archetypes via unit tests in `src/core/combat/simulation.test.ts`.
- [x] 1.2 Add `normalizedLevel?: number` support to `runSquadSimulation()` in `src/core/combat/squadSimulation.ts`, verifying that all drafted units receive 32 HP at Level 4 and derived vitals match level parity via tests in `src/core/combat/squadSimulation.test.ts`.
- [x] 1.3 Author `src/core/combat/squadNormalizedBenchmarks.test.ts` to execute 100 randomized 3v3 matches at Level-4 parity and print the formatted kit-vs-kit leaderboard, verified by running `npx vitest run src/core/combat/squadNormalizedBenchmarks.test.ts`.

## 2. Tier-4 Encounter Generation & 150-Threat Playtest

- [x] 2.1 Update `assembleEnemySquad()` in `src/core/campaign/encounterGenerator.ts` and hostile bonus threat in `src/core/campaign/threatBudget.ts` to support Tier-4 hostiles (70 threat: `shield-bearer`, `dragoon`) when threat budget is at least 70 points, verified via unit tests in `src/core/campaign/encounterGenerator.test.ts`.
- [x] 2.2 Create `src/core/campaign/threatEncounter.test.ts` to simulate ~150 threat procedural encounters, verifying 4–5 combatant squad assembly and headless combat resolution against a standard player vanguard via `npx vitest run src/core/campaign/threatEncounter.test.ts`.

## 3. Documentation & Strategic Roadmap

- [x] 3.1 Update `docs/plans/ROADMAP.md` under *Future Systems Exploration* to document the Wayfarer Progression & Augment Shard Balance Simulation stretch goal, and sync the active item in `docs/plans/ACTIVE.md` under *In Progress*.

## 4. Version Bump & Build Validation

- [x] 4.1 Bump version to `0.16.0` in `package.json` and document user-facing additions (Tier-4 adversary encounters in late campaign sectors and combat balance tuning) in `CHANGELOG.md` strictly following player-facing release note guidelines without technical or script details.
- [x] 4.2 Run `npm run build` using `cmd.exe /c` to verify clean TypeScript type-checking and successful bundle compilation.
