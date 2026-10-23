# Design

## Context

Simulation telemetry from 100-match 3v3 squad benchmarks revealed two primary balance distortions (see `proposal.md`):
1. `Sneak Attack` (1 AP) granted both +1d6 bonus damage and automatic d20 Advantage whenever attacking from flank or rear (or with an adjacent ally), doubling crit rates and driving single-turn 24–27 damage bursts across Thief, Infiltrator, and Cat-Burglar.
2. The Tier-3 Witch achieved an anomalous 91.3% squad win rate driven by 3x `Poppet Needle` spam in a single turn, rapid turn-stealing through combined CTB manipulation (`Baleful Hex` -20 ticks, `Witch's Talisman` +25 ticks), and benchmark execution on a radius-3 arena where `Misfortune Ward` covered over 51% of the tiles.

## Goals / Non-Goals

**Goals:**
- Decouple automatic Advantage from `Sneak Attack`, preserving +1d6 precision damage on flank/rear while leaving Advantage to `STEALTH` and `MOMENTUM`.
- Rebalance the Witch's turn cadence around a 2-AP signature attack (`Poppet Needle`) and 1-AP utility options, completely eliminating 3x machine-gun spam without artificial `oncePerTurn` locks.
- Reposition `Baleful Hex` as a pure debuff curse (0 direct damage, inflicting Poison and -20 CTB delay on Hit/Crit, negated on Graze).
- Reposition `Witch's Talisman` as an allied Speed (+2 Speed) and Ward (+2 Ward) booster, establishing a tactical trade-off between delaying impending enemies or accelerating/shielding climbing allies.
- Align the 3v3 squad benchmark arena radius with Tier-3 campaign standards (`arenaRadius: 4`).

**Non-Goals:**
- No artificial `oncePerTurn` cooldowns on Witch or Rogue abilities.
- No redesign of the core CTB initiative clock or condition engine.
- No changes to `Misfortune Ward` passive aura values or radius.

## Decisions

### Decision 1: Remove `grantsAdvantage: true` from Sneak Attack's `FLANK_OR_REAR` Condition
- **Rationale**: The combat engine already awards Advantage natively when an actor attacks from `STEALTH` (`conditions.ts`) or attacks after moving 2+ hexes with `MOMENTUM` (`attackRoll.ts`). Providing Advantage automatically whenever striking from 50% of hex angles (or with any adjacent ally) invalidated the need for stealth and over-inflated hit and crit rates.
- **Alternatives Considered**: 
  - *Keep Advantage and remove +1d6*: Rejected; rogue fantasy relies on precision bonus damage on vulnerable flanks.
  - *Tiered arcs (Advantage on Flank, Bonus Damage on Rear)*: More complex for players to track on the UI than decoupling Advantage to Stealth/Momentum.

### Decision 2: Poppet Needle to 2 AP, 2d4 + Focus Magical Damage
- **Rationale**: Sets up a thematic martial-magical symmetry with Warrior's `Power Strike` (2 AP, 2d6 + Force kinetic blow vs. Evasion at Range 1). At 2 AP, `Poppet Needle` deals 2d4 + Focus (bell-curve 2–8, avg 5.0 + Focus) vs. Resolve at Range 3, keeping its 180° facing reversal and -2 Resolve debuff. In a standard 3-AP turn, the Witch can only cast Poppet Needle once.
- **Alternatives Considered**:
  - *Keep 1 AP, reduce damage to 1d4*: Still permits 3x spamming of facing manipulation and Resolve shredding in one turn.
  - *Add oncePerTurn*: Explicitly rejected to preserve player agency in AP spending.

### Decision 3: Baleful Hex Deals 0 Direct Damage (Pure Occult Curse)
- **Rationale**: `Baleful Hex` was overloaded, doing direct damage, applying poison DoT, and stripping CTB ticks. Removing direct damage emphasizes its occult curse nature. Under `registry.ts`, non-damage effects are automatically negated on `GRAZE`, ensuring that a graze applies 0 damage and 0 debuffs.
- **Alternatives Considered**:
  - *Scale CTB delay by Resolve delta*: Adds formula complexity; a clean 20-tick delay on Hit/Crit with 0 direct damage is intuitive and transparent.

### Decision 4: Witch's Talisman Replaces +25 CTB with +2 Speed and +2 Ward
- **Rationale**: Instant +25 CTB paired with Baleful Hex's -20 CTB created a 45-tick initiative delta within a single turn cycle. Shifting to +2 Speed accelerates the ally's clock tick rate over time, creating a clear dilemma: use 1 AP on `Baleful Hex` to push back an enemy nearing 100 ticks, or use 1 AP on `Witch's Talisman` to accelerate and protect a friendly unit at low gauge.
- **Alternatives Considered**:
  - *Keep CTB boost but reduce magnitude to 10*: Still causes immediate turn-jumping without giving allies defensive utility.

### Decision 5: Benchmark Arena Radius 4
- **Rationale**: `encounterGenerator.ts` generates radius 3 for Tiers 1–2 and radius 4 for Tier 3 encounters. Sizing the 3v3 benchmark to radius 4 (61 hexes) places `Misfortune Ward`'s 2-hex aura at ~31% coverage, correctly evaluating the Witch as a backline support behind a frontline brawler rather than blanketing half the arena.

## Risks / Trade-offs

- **[Risk]** Witch AI might undervalue `Baleful Hex` if `metrics.expectedDamage` is 0.  
  → **Mitigation**: Verify that `scoreDebuffAndUtility` in `heuristics.ts` awards strong utility score for `CTB_DELAY` (5.0–9.0) and hostile status conditions so the AI actively uses it against high-gauge threats.
- **[Risk]** Existing unit tests expecting 1-AP Poppet Needle or Baleful Hex direct damage will break.  
  → **Mitigation**: Update unit tests in `witchIntegration.test.ts` and `resolution.test.ts` to assert the new AP costs and damage profiles.
