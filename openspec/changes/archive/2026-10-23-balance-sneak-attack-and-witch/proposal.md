# Proposal

## Why

Simulation telemetry reveals that `Sneak Attack` is severely overtuned compared to other 1-AP skills by "double-dipping" into both +1d6 bonus damage and automatic d20 Advantage on easily triggered flank/rear angles. Simultaneously, the Tier-3 Witch commands an anomalous 91.3%–93.5% squad win rate due to rapid 3x `Poppet Needle` spam, instant-turn CTB manipulation (`Baleful Hex` -20 CTB + `Witch's Talisman` +25 CTB), and testing on cramped radius-3 arenas where her 2-hex defensive aura blankets over 51% of the battlefield.

## What Changes

- **Sneak Attack Tuning**: Remove automatic d20 Advantage from `Sneak Attack`'s flank/rear condition; retain the +1d6 precision damage (1d4 + 1d6 + Force on flank/rear for 1 AP). Attacks from `STEALTH` and attacks with `MOMENTUM` continue to grant Advantage natively.
- **Poppet Needle Tuning**: Increase AP cost from 1 AP to 2 AP and shift damage from 1d6 to 2d4 + Focus vs Resolve. Retain 180° forced facing away and -2 Resolve debuff. Eliminates 3x turn spam and establishes a two-beat turn rhythm with 3 AP.
- **Baleful Hex Tuning**: Remove direct damage profile (deals 0 direct damage). Retain `POISON` (2 damage/turn for 2 turns) and `CTB_DELAY` (20 ticks) vs Resolve. On `GRAZE`, secondary effects are negated, cementing its role as a pure occult debuff curse.
- **Witch's Talisman Tuning**: Remove immediate +25 CTB initiative boost. Grants +2 Speed and +2 Ward for 1 turn, establishing a core tactical dilemma: spend 1 AP on `Baleful Hex` to delay an enemy nearing their turn threshold, or spend 1 AP on `Witch's Talisman` to accelerate and shield an ally building initiative.
- **Squad Simulation Benchmark Arena Update**: Update the 3v3 mixed-tier squad benchmark suite to run on `arenaRadius: 4` (61 tiles), matching actual Tier-3 campaign stage generation and properly sizing `Misfortune Ward`'s localized defensive coverage.

## Capabilities

### New Capabilities
- `tier-1-thief`: Formally defines the Tier-1 Thief's signature ability `Sneak Attack`, specifying its 1-AP cost, physical damage against Evasion, conditional +1d6 precision damage on flank/rear or allied pincer, and decoupled Advantage behavior.

### Modified Capabilities
- `tier-3-witch`: Modifies requirements for `Baleful Hex` (pure debuff curse with 0 direct damage), `Poppet Needle` (2 AP, 2d4 + Focus magical damage, 180° spin, -2 Resolve), and `Witch's Talisman` (+2 Speed and +2 Ward, removing immediate CTB gauge boost).

## Impact

- **Packages & Data**: `src/data/packages/thief.ts` (`SNEAK_ATTACK`), `src/data/packages/witch.ts` (`BALEFUL_HEX`, `POPPET_NEEDLE`, `WITCHS_TALISMAN`).
- **Combat Resolver & AI**: Minor adjustments to AI scoring or heuristics where abilities with 0 direct damage evaluate `CTB_DELAY` and `POISON`.
- **Tests & Benchmarks**: Unit tests for Witch abilities in `src/core/combat/witchIntegration.test.ts`, Rogue abilities in `src/core/combat/resolution.test.ts`, and squad simulation benchmark in `src/core/combat/squadBenchmarks.test.ts`.
