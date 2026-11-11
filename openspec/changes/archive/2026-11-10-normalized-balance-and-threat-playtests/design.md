# Technical Design: Normalized Combat Parity Benchmarks & Tier-4 Threat Encounters

## Context

See `proposal.md` for motivation. Currently, `squadSimulation.ts` uses `createSimulatedCombatant()`, defaulting each unit's level to `classDef.totalPoints` (Level 1 for Tier 1 up to Level 4 for Tier 4) and attributes to exact unlock requirements. This creates extreme stat disparities (17 HP and 0 Armor vs 32 HP and 3-4 Armor) that heavily skew 3v3 win rates and survival metrics toward higher tiers.

In parallel, `encounterGenerator.ts` (`assembleEnemySquad`) only supports enemies up to Tier 3 (55 threat), leaving newly authored Tier-4 classes (Shield-bearer, Dragoon) unused in high-threat procedural encounters.

## Goals / Non-Goals

**Goals:**
- Provide a `normalizedLevel?: number` option in `SquadSimulationOptions` (defaulting to Level 4 in parity tests).
- Implement an archetype-weighted attribute distribution algorithm that fulfills required class attributes and rolls remaining points randomly among the class's non-zero requirement archetypes using seeded RNG.
- Ensure all normalized combatants receive 32 HP (`12 + 5 * 4`) and balanced derived vitals.
- Create `squadNormalizedBenchmarks.test.ts` to execute 100 randomized 3v3 matches at Level-4 parity and report the kit-vs-kit leaderboard.
- Extend `assembleEnemySquad()` in `encounterGenerator.ts` to support Tier-4 combatants (70 threat: `shield-bearer`, `dragoon`) when `budget >= 70` (Stage 5+).
- Create a playtest test verifying procedural generation and combat at ~150 encounter threat (yielding 4–5 units including potential Tier-4 anchors).
- Update `docs/plans/ROADMAP.md` under *Future Systems Exploration* with the Progression & Shard Balance Simulation stretch goal.

**Non-Goals:**
- Randomizing Tier-3/4 wildcard abilities during the normalized benchmark: baseline starter wildcards (`DEFAULT_CLASS_RESONANT_LOADOUTS`) will remain in place to isolate pure kit performance from multi-class wildcard interference.
- Implementing the full Wayfarer Progression and Augment Shard simulator in this change (this is captured on the Roadmap).

## Decisions

### Decision 1: Archetype-Weighted Random Allocation vs Flat Dominant Stat
- **Chosen Approach**: Allocate mandatory requirements first, then roll remaining points up to `targetLevel` randomly among the archetypes required by the class.
- **Rationale**:
  - Pure classes (Warrior, Knight, Thief, Infiltrator, Wizard, Sorcerer) have only one required archetype, so 100% of extra points go into their primary attribute (e.g. Thief reaches 4 Finesse; Warrior reaches 4 Force).
  - Hybrid classes (Cavalier: 2F/1R; Berserker: 2F/1M; Highwayman: 1F/2R) split their remaining point across their natural dual archetypes (e.g. Cavalier rolls 3F/1R or 2F/2R). No points are wasted on unrelated stats (e.g. no Focus for a Knight).
- **Alternatives Considered**:
  - *Completely random across Force/Finesse/Focus*: Rejected because it introduces unwanted noise (e.g. a Knight rolling Focus gains Ward and Resolve but zero attack scaling).
  - *Strictly fixed to dominant stat*: Rejected because it eliminates authentic hybrid build variations (e.g. 2F/2R Cavalier vs 3F/1R Cavalier).

### Decision 2: Controlled Wildcards for Parity Benchmarking
- **Chosen Approach**: Maintain `DEFAULT_CLASS_RESONANT_LOADOUTS` (baseline novice wildcards such as `throw_dart`, `shield_bash`, `momentum`) for the normalized test.
- **Rationale**: Keeps the test focused strictly on comparing class signature/domain abilities and passive traits. If a Level-4 Warrior was granted high-tier wildcards like `Dragon Dive` or `Hellfire Brand`, the telemetry would measure multi-class synergies rather than whether Warrior's core kit is balanced.
- **Alternatives Considered**:
  - *Full constellation draw (like `createEnemyUnit`)*: Reserved for the upcoming progression simulator on the Roadmap.

### Decision 3: Tier-4 Hostile Integration into `assembleEnemySquad`
- **Chosen Approach**: Define `TIER4_CLASSES = ['shield-bearer', 'dragoon'] as const` in `encounterGenerator.ts`. In `assembleEnemySquad(budget, stage, rng)`, if `stage >= 5` and `remaining >= 70`, allow drafting Tier-4 hostiles with probability weighting consistent with Tier 3 (e.g. 75% chance or if remaining equals 70).
- **Rationale**: Allows encounters at 140–200 threat budgets to naturally draft 1 Tier-4 anchor unit accompanied by 3–4 supporting Tier 1/2 or Novice units, achieving the desired 4–5 unit squad composition.
- **Alternatives Considered**:
  - *Creating separate elite encounter generator*: Unnecessary; `assembleEnemySquad` already handles stage thresholds cleanly.

## Risks / Trade-offs

- **[Risk] Attribute variance between matches for hybrid classes** -> *Mitigation*: Pass the match-seeded PRNG to the attribute distribution helper so unit generation remains strictly deterministic and reproducible.
- **[Risk] Test execution duration for 100 matches** -> *Mitigation*: Headless simulation executes at over 15 matches/sec (~6 seconds for 100 matches), comfortably fitting within vitest's standard timeouts.
- **[Risk] Tier-4 enemies overpowering player squads in early campaign** -> *Mitigation*: Enforce `remaining >= 70` and `stage >= 5` thresholds so Tier-4 units only generate in late-stage encounters or high-budget skirmishes.
