# Tasks

## 1. Sneak Attack Tuning & Verification

- [x] 1.1 Update `SNEAK_ATTACK` definition in `src/data/packages/thief.ts` to remove `grantsAdvantage: true` from the `FLANK_OR_REAR` condition while retaining `+1d6` precision damage and verify TypeScript builds cleanly.
- [x] 1.2 Update combat resolution unit tests in `src/core/combat/resolution.test.ts` and `src/core/units/loadout.test.ts` to assert that flanked Sneak Attacks do not roll with Advantage unless granted by `STEALTH` or `MOMENTUM`, and verify tests pass.

## 2. Witch Kit Abilities Tuning & Verification

- [x] 2.1 Update `POPPET_NEEDLE` in `src/data/packages/witch.ts` to cost 2 AP and deal `2d4 + Focus` magical damage vs Resolve while retaining the 180° facing reversal and -2 Resolve debuff.
- [x] 2.2 Update `BALEFUL_HEX` in `src/data/packages/witch.ts` to remove direct damage (0 direct damage), retaining `POISON` (2 dmg/turn for 2 turns) and `CTB_DELAY` (20 ticks) vs Resolve.
- [x] 2.3 Update `WITCHS_TALISMAN` in `src/data/packages/witch.ts` to remove the immediate 25-tick CTB boost and grant `+2 Speed` and `+2 Ward` for 1 turn.
- [x] 2.4 Update Witch integration and ability tests in `src/core/combat/witchIntegration.test.ts` and `src/core/combat/abilities12.test.ts` to assert the updated AP costs, 0 direct damage on Baleful Hex, 2d4 damage on Poppet Needle, and Speed/Ward buff on Witch's Talisman, and verify all tests pass.

## 3. Squad Simulation Benchmark Verification

- [x] 3.1 Update `src/core/combat/squadBenchmarks.test.ts` to set `arenaRadius: 4` for 3v3 mixed-tier squad simulations, aligning with Tier-3 campaign standards.
- [x] 3.2 Run the 100-match 3v3 simulation suite via `cmd.exe /c npx vitest run src/core/combat/squadBenchmarks.test.ts` and check telemetry results for win rates, damage taken, and ability cast distributions across all 12 classes.
- [x] 3.3 Update `docs/plans/ACTIVE.md` Item 2.4 to mark the assessment and tuning complete.
