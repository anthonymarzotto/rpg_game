# Proposal: Normalized Combat Parity Benchmarks & Tier-4 Threat Encounters

## Why

Current 3v3 squad balance simulations draft classes across Tiers 1 through 4, with combatants initialized at their class unlock tier (Level 1 for Tier 1, Level 4 for Tier 4) and attributes equal only to base unlock requirements. This causes a severe stat disparity—Level 4 combatants boast 32 HP, up to 4 Armor, and high attribute bonuses against Level 1 combatants with 17 HP, 0 Armor, and +1 bonuses—masking genuine ability kit, AP economy, and AI heuristic balance. Furthermore, procedural encounter generation (`assembleEnemySquad`) does not yet support recently authored Tier-4 classes (Shield-bearer and Dragoon, 70 threat), artificially restricting hostile trial variety at high threat budgets.

Providing a normalized Level-4 simulation harness with archetype-weighted stat distribution isolates pure kit balance, while integrating Tier-4 classes into encounter generation enables realistic ~150-threat trial playtests with 4–5 units anchored by top-tier adversaries.

## What Changes

- **Normalized Combatant Factory**: Add support in `squadSimulation.ts` / `simulation.ts` to normalize combatant level to a configurable target (default Level 4, 32 HP) and distribute remaining attribute points randomly among required archetypes (pure classes reach 4 in their domain, hybrids split remaining points).
- **Normalized 3v3 Benchmark Test**: Add an automated parity benchmark test (`squadNormalizedBenchmarks.test.ts`) that drafts squads at Level-4 parity and outputs telemetry to evaluate kit effectiveness without stat deficits.
- **Tier-4 Encounter Generation**: Update `assembleEnemySquad` and `encounterGenerator.ts` to support Tier-4 combatants (70 threat: Shield-bearer, Dragoon) for high-threat stages (budget >= 70 / stage >= 5).
- **150-Threat Procedural Trial Playtest**: Add a dedicated playtest suite simulating standard 3–4 unit player vanguards against procedurally generated 150-threat enemy squads (4–5 units).
- **Strategic Roadmap Documentation**: Update `docs/plans/ROADMAP.md` under *Future Systems Exploration* with a roadmap goal for Wayfarer Progression and Augment Shard Balance Simulations.
- **Version Assessment**: Minor version bump to `0.16.0` due to incorporating Tier-4 adversaries into campaign procedural generation and expanding automated balance testing suites.

## Capabilities

### New Capabilities
- `normalized-squad-benchmarks`: Automated headless squad combat benchmarking at normalized character levels and archetype-weighted attribute distributions to measure kit and ability balance in isolation.

### Modified Capabilities
- `encounter-generation`: Expand enemy squad assembly to support Tier-4 hostiles (70 threat) when threat budgets permit, incorporating Shield-bearer and Dragoon into procedural high-threat stage encounters.

## Impact

- **Core Simulation**: `src/core/combat/squadSimulation.ts`, `src/core/combat/simulation.ts`.
- **Encounter Generation**: `src/core/campaign/encounterGenerator.ts`.
- **Tests & Benchmarks**: `src/core/combat/squadBenchmarks.test.ts`, `src/core/combat/squadNormalizedBenchmarks.test.ts`, and `src/core/campaign/threatEncounter.test.ts`.
- **Documentation & Versioning**: `docs/plans/ACTIVE.md`, `docs/plans/ROADMAP.md`, `package.json`, `CHANGELOG.md`.
