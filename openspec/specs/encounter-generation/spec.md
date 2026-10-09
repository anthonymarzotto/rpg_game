# Encounter Generation Specification

## Purpose
Generates procedural tactical combat encounters and hex arenas calibrated to composite squad threat and campaign stage index.

## Requirements

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
The system SHALL assemble an enemy combatant roster whose total threat budget matches the target encounter budget, selecting from verified class packages across Novices (10 threat), Tier-1 classes (25 threat), Tier-2 classes (40 threat), and Tier-3 hybrid classes (55 threat). For Stage 5 and beyond, the system SHALL support spawning Tier-3 hybrid adversaries (Cavalier, Berserker, Highwayman, Warlock, Witch) calibrated to higher stage threat budgets (60–80+ points) while maintaining squad constraints of 2 to 4 combatants.

#### Scenario: Generating enemy squad for recruit party
- **WHEN** generating a Stage 1 encounter for 3 Level-0 Novices
- **THEN** the generated enemy roster consists of recruit-tier enemies whose combined threat equals the recruit budget

#### Scenario: Generating enemy squad for promoted party
- **WHEN** generating an encounter for a party with promoted Level 1+ units
- **THEN** the generated enemy squad incorporates enemies with Tier-1 class kits (Warrior, Thief, Wizard)

#### Scenario: Generating enemy squad for Stage 3+ encounters
- **WHEN** generating an encounter for Stage 3 or higher with sufficient threat budget
- **THEN** the generated enemy squad can incorporate Tier-2 class adversaries (Knight, Infiltrator, Sorcerer)

#### Scenario: Generating enemy squad for Stage 5+ encounters
- **WHEN** generating an encounter for Stage 5 or higher with a threat budget of at least 55 points
- **THEN** the generated enemy squad can incorporate Tier-3 hybrid adversaries (Cavalier, Berserker, Highwayman, Warlock, or Witch) with archetype progression and active loadouts matching their hybrid class definition

### Requirement: Hybrid Enemy Progression and Loadout
The system SHALL initialize generated Tier-3 hybrid enemy units with archetype point advancement and constellations that satisfy the hybrid class requirements, assigning their signature abilities, domain abilities, and passive mastery traits.

#### Scenario: Initializing a Cavalier enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `cavalier`
- **THEN** the unit progression receives 2 Fighter and 1 Rogue archetype advancements, unlocks Cavalier in its constellation, and equips the Cavalier class package

#### Scenario: Initializing a Witch enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `witch`
- **THEN** the unit progression receives 1 Rogue and 2 Mage archetype advancements, unlocks Witch in its constellation, and equips the Witch class package

### Requirement: Procedural Arena and Obstacle Generation
The system SHALL generate an arena of radius 3 or 4 containing 2 to 4 non-walkable obstacle hexes and procedural multi-peak terraced elevation ($h \in [0, 3]$, default peaks $h=2$), ensuring guaranteed traversable pathfinding connectivity (without impassable single-step rises of $\Delta h \ge 3$) between player deployment hexes in the West and enemy deployment hexes in the East. For Stage 3 and beyond, standard encounters SHALL expand to radius 4 (61 hexes) to accommodate multi-peak topography.

#### Scenario: Arena generation with traversable connectivity
- **WHEN** `generateStageEncounter` constructs a new battle arena
- **THEN** player spawn hexes and enemy spawn hexes have at least one unblocked, traversable path connecting them across elevation tiers and obstacles

#### Scenario: Expanded radius 4 arena for later stages
- **WHEN** generating an encounter for Stage 3 or higher
- **THEN** the arena radius is set to 4 (61 total hexes)

### Requirement: Multi-Peak Terraced Elevation Topography
The encounter generation system SHALL procedurally generate terraced elevation maps by seeding 1 to 2 peak foci at elevation $h=2$ (or higher), flood-filling surrounding terraces at elevation $h=1$, maintaining low-ground valleys at $h=0$, and producing tactical sheer cliff drops ($\Delta h \ge 2$), while ensuring player and enemy deployment spawns remain traversable without impassable cliff barriers blocking all routes.

#### Scenario: Procedural elevation seeding with peak and terrace tiers
- **WHEN** an encounter arena is generated with procedural elevation
- **THEN** the generated tiles contain low ground ($h=0$), intermediate terraces ($h=1$), and elevated peaks ($h=2$)

#### Scenario: Preservation of deployment zones traversability
- **WHEN** procedural elevation assigns tile heights across the arena
- **THEN** units in the player deployment zone have traversable paths to engage enemies in the enemy deployment zone

### Requirement: Deterministic Generation and Reroll
The system SHALL construct encounters deterministically when provided with a random number generator seed, enabling identical encounter retries and distinct new battle generation.

#### Scenario: Retrying an encounter
- **WHEN** an encounter is generated using the same stage index and seed as a previous attempt
- **THEN** the resulting arena layout, obstacle placements, and enemy units are identical

#### Scenario: Generating a new encounter for the same stage
- **WHEN** `regenerateCurrentStageEncounter` is called with a distinct seed
- **THEN** a fresh encounter is produced with different enemy compositions or obstacle layouts at the same stage threat budget
