# Spec Delta

## Purpose

Generates procedural tactical combat encounters and hex arenas calibrated to composite squad threat and campaign stage index.

## ADDED Requirements

### Requirement: Squad Threat Evaluation
The system SHALL compute an aggregate Threat Rating for the active player squad by summing the threat values of all deployed combatants based on their level and archetype progression.

#### Scenario: Computing squad threat budget
- **WHEN** an active squad consisting of 3 Level-0 Novices is evaluated
- **THEN** the system calculates a base recruit squad threat value of 30 points

### Requirement: Stage-Scaled Threat Budget
The system SHALL compute the target encounter threat budget by multiplying the squad threat rating by a stage scaling factor derived from the campaign stage index.

#### Scenario: Threat scaling across stages
- **WHEN** an encounter is generated for Stage 1 versus a later Stage N
- **THEN** the target threat budget increases monotonically with higher stage indices

### Requirement: Procedural Enemy Composition
The system SHALL assemble an enemy combatant roster whose total threat budget matches the target encounter budget, selecting solely from existing verified class packages (Novice recruits, Warrior, Thief, Wizard).

#### Scenario: Generating enemy squad for recruit party
- **WHEN** generating a Stage 1 encounter for 3 Level-0 Novices
- **THEN** the generated enemy roster consists of recruit-tier enemies whose combined threat equals the recruit budget

#### Scenario: Generating enemy squad for promoted party
- **WHEN** generating an encounter for a party with promoted Level 1+ units
- **THEN** the generated enemy squad incorporates enemies with Tier-1 class kits (Warrior, Thief, Wizard)

### Requirement: Procedural Arena and Obstacle Generation
The system SHALL generate an arena of radius 3 or 4 with 2 to 4 non-walkable obstacle hexes, ensuring guaranteed walkable pathfinding connectivity between player deployment hexes in the West and enemy deployment hexes in the East.

#### Scenario: Arena generation with traversable connectivity
- **WHEN** `generateStageEncounter` constructs a new battle arena
- **THEN** player spawn hexes and enemy spawn hexes have at least one unblocked path connecting them

### Requirement: Deterministic Generation and Reroll
The system SHALL construct encounters deterministically when provided with a random number generator seed, enabling identical encounter retries and distinct new battle generation.

#### Scenario: Retrying an encounter
- **WHEN** an encounter is generated using the same stage index and seed as a previous attempt
- **THEN** the resulting arena layout, obstacle placements, and enemy units are identical

#### Scenario: Generating a new encounter for the same stage
- **WHEN** `regenerateCurrentStageEncounter` is called with a distinct seed
- **THEN** a fresh encounter is produced with different enemy compositions or obstacle layouts at the same stage threat budget
