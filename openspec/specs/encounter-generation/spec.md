# Encounter Generation Specification

## Purpose
Generates procedural tactical combat encounters and hex arenas calibrated to composite squad threat and campaign stage index.

## Requirements

### Requirement: Squad Threat Evaluation
The system SHALL compute an aggregate Threat Rating for the active player squad by summing the threat values of all deployed combatants based on their level and archetype progression. When evaluating squad threat for generating upcoming stage encounters, the system SHALL calculate a single-step projected level for each unit by projecting them to `currentLevel + 1` if their accumulated archetype XP meets or exceeds the threshold for their current level.

#### Scenario: Computing squad threat budget
- **WHEN** an active squad consisting of 3 Level-0 Novices is evaluated
- **THEN** the system calculates a base recruit squad threat value of 30 points (10 points per unit)

#### Scenario: Computing pre-ascension projected threat
- **WHEN** an active squad unit has accumulated archetype XP meeting or exceeding their current level threshold (e.g. Level-0 Novice with 5+ Fighter XP)
- **THEN** the system evaluates their threat at their projected level (Level 1, 25 threat points) when generating the next stage encounter

### Requirement: Stage-Scaled Threat Budget
The system SHALL compute the target encounter threat budget anchored directly to the stage deployment budget plus a stage tier hostile bonus equal to approximately one additional hostile of the highest eligible tier unlocked for that stage (Stage 1: +0 pts parity recruit trial, Stage 2: +25 pts Tier 1 bonus, Stage 3–4: +40 pts Tier 2 bonus, Stage 5+: +55 pts Tier 3 bonus), decoupled from deployed player squad size and accumulated pre-ascension XP.

#### Scenario: Threat scaling across stages
- **WHEN** an encounter is generated for Stage 1 versus a later Stage N
- **THEN** the target threat budget increases monotonically anchored to the stage deployment budget plus highest-tier hostile bonus

#### Scenario: Threat decoupled from squad size
- **WHEN** an encounter is generated for a large player squad (e.g. 8 wayfarers) or a party with pre-ascension level projections
- **THEN** the target threat budget remains anchored to the stage deployment budget plus stage tier bonus rather than multiplying uncapped squad threat

### Requirement: Procedural Enemy Composition
The system SHALL assemble an enemy combatant roster whose total threat budget matches the target encounter budget, selecting from verified class packages across Novices (10 threat), Tier-1 classes (25 threat), Tier-2 classes (40 threat), and Tier-3 hybrid classes (55 threat). The system SHALL dynamically spend the threat budget on multiple units of the highest appropriate tiers for the stage rather than capping the squad at one unit per tier, and SHALL NOT enforce an arbitrary 4-unit squad cap on enemy forces.

#### Scenario: Generating enemy squad for recruit party
- **WHEN** generating a Stage 1 encounter for 3 Level-0 Novices
- **THEN** the generated enemy roster consists of recruit-tier enemies whose combined threat equals the recruit budget

#### Scenario: Generating enemy squad for promoted party
- **WHEN** generating an encounter for a party with promoted Level 1+ units
- **THEN** the generated enemy squad incorporates enemies with Tier-1 class kits (Warrior, Thief, Wizard) when budget permits

#### Scenario: Generating enemy squad for Stage 3+ encounters
- **WHEN** generating an encounter for Stage 3 or higher with sufficient threat budget
- **THEN** the generated enemy squad can incorporate multiple Tier-2 class adversaries (Knight, Infiltrator, Sorcerer)

#### Scenario: Generating enemy squad for Stage 5+ encounters
- **WHEN** generating an encounter for Stage 5 or higher with a threat budget of at least 55 points
- **THEN** the generated enemy squad can incorporate Tier-3 hybrid adversaries (Cavalier, Berserker, Highwayman, Warlock, Witch, Cat Burglar) matching the stage budget

#### Scenario: Generating multi-unit Tier-1 enemy squad
- **WHEN** generating an encounter for Stage 2 with a calibrated threat budget of 75 to 85 points
- **THEN** the system can generate multiple Tier-1 adversaries (e.g. 3 Tier-1 units) rather than restricting Tier-1 enemies to a single unit

#### Scenario: Generating multi-unit Tier-2 enemy squad
- **WHEN** generating an encounter for Stage 4 with a calibrated threat budget of 150 to 170 points
- **THEN** the system can generate multiple Tier-2 adversaries alongside supporting units without an artificial 4-unit enemy squad ceiling

### Requirement: Hybrid Enemy Progression and Loadout
The system SHALL initialize generated Tier-1, Tier-2, and Tier-3 enemy units with archetype point advancement and constellations that satisfy their class requirements, assigning their signature abilities, domain abilities, and passive mastery traits. Generated enemies SHALL dynamically select wildcard abilities and wildcard passives from their unlocked constellation lineage rather than hardcoding static Novice starter spells and static Momentum.

#### Scenario: Initializing a Cavalier enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `cavalier`
- **THEN** the unit progression receives 2 Fighter and 1 Rogue archetype advancements, unlocks Cavalier in its constellation, and equips domain abilities and passives derived from its unlocked constellation lineage (e.g. Warrior and Knight domain abilities and passives)

#### Scenario: Initializing a Witch enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `witch`
- **THEN** the unit progression receives 1 Rogue and 2 Mage archetype advancements, unlocks Witch in its constellation, and equips domain abilities and passives derived from its Focus and Finesse lineage

### Requirement: Procedural Arena and Obstacle Generation
The system SHALL generate an arena of radius 3, 4, or 5 containing 2 to 4 non-walkable obstacle hexes and procedural multi-peak terraced elevation (h in [0, 3], default peaks h=2), ensuring guaranteed traversable pathfinding connectivity (without impassable single-step rises of Delta h >= 3) between player deployment hexes in the West and enemy deployment hexes in the East. The arena radius SHALL be dynamically determined: Radius 3 for Stage 1, Radius 4 minimum for Stage 2 and beyond, and expanding to Radius 5 (91 hexes) when the combined total of deployed player and enemy units is 7 or greater.

#### Scenario: Arena generation with traversable connectivity
- **WHEN** `generateStageEncounter` constructs a new battle arena
- **THEN** player spawn hexes and enemy spawn hexes have at least one unblocked, traversable path connecting them across elevation tiers and obstacles

#### Scenario: Expanded radius 4 arena for later stages
- **WHEN** generating an encounter for Stage 2 or higher with fewer than 7 total combatants
- **THEN** the arena radius is set to 4 (61 total hexes)

#### Scenario: Radius 3 arena for initial stage
- **WHEN** generating an encounter for Stage 1 with 6 total combatants
- **THEN** the arena radius is set to 3 (37 total hexes)

#### Scenario: Radius 5 expanded arena for large battles
- **WHEN** generating an encounter where the combined total of player and enemy units is 7 or greater
- **THEN** the arena radius is set to 5 (91 total hexes) with generated deployment coordinates accommodating all placed units

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
