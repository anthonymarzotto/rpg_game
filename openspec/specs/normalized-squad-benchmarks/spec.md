# Normalized Squad Benchmarks Specification

## Purpose
Provides automated headless 3v3 combat simulation at normalized character level and archetype-weighted attribute parity to evaluate kit balance, action economy, and AI heuristics in isolation from stat deficits.

## Requirements

### Requirement: Normalized Combatant Instantiation
The system SHALL instantiate simulated combatants at a designated target normalized level (default Level 4) with derived vitals computed from that level (32 HP at Level 4). The system SHALL assign mandatory base attributes matching the combatant's class unlock requirements and SHALL distribute any remaining attribute points randomly among the class's required archetypes.

#### Scenario: Pure archetype normalized combatant reaches maximum domain attribute
- **WHEN** a normalized combatant is created at Level 4 for a pure class requiring a single archetype (e.g. Warrior, Thief, or Wizard)
- **THEN** all 4 attribute points are assigned to that class's required archetype (4 Force for Warrior, 4 Finesse for Thief, 4 Focus for Wizard), yielding maximum archetype vitals and 32 HP

#### Scenario: Hybrid archetype normalized combatant distributes remaining points
- **WHEN** a normalized combatant is created at Level 4 for a hybrid class requiring multiple archetypes (e.g. Cavalier requiring 2 Fighter and 1 Rogue)
- **THEN** the combatant receives the minimum requirement in each archetype (2 Force, 1 Finesse) and the remaining 1 point is randomly allocated between Force and Finesse, preserving archetype alignment

#### Scenario: Vitals computation at normalized level parity
- **WHEN** any combatant is generated under normalized Level 4 rules regardless of whether their kit is Tier 1, 2, 3, or 4
- **THEN** their derived maximum HP is exactly 32 points (12 base HP plus 5 HP per level), eliminating tier-based health disparities

### Requirement: Normalized 3v3 Squad Benchmarking
The system SHALL execute automated batch 3v3 combat simulations where both competing squads are composed of combatants instantiated under normalized level rules, collecting granular telemetry on win contribution, damage dealt, survival rate, and ability utilization.

#### Scenario: Executing normalized 3v3 simulation trial batch
- **WHEN** `runSquadSimulation` is invoked with `normalizedLevel` specified (e.g. `normalizedLevel: 4`)
- **THEN** all drafted units on both teams are instantiated at Level 4 with archetype-weighted attributes, and simulation results record win rate and combat performance at level parity

#### Scenario: Isolating class kit balance from stat disparity
- **WHEN** evaluating normalized simulation telemetry across Tier-1, Tier-2, Tier-3, and Tier-4 classes
- **THEN** combat outcomes reflect ability kit synergy, AP economy efficiency, and tactical AI heuristics rather than raw level and HP advantages
