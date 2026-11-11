# Spec Delta: Encounter Generation

## MODIFIED Requirements

### Requirement: Stage-Scaled Threat Budget
The system SHALL compute the target encounter threat budget anchored directly to the stage deployment budget plus a stage tier hostile bonus equal to approximately one additional hostile of the highest eligible tier unlocked for that stage (Stage 1: +0 pts parity recruit trial, Stage 2: +25 pts Tier 1 bonus, Stage 3–4: +40 pts Tier 2 bonus, Stage 5: +55 pts Tier 3 bonus, Stage 6+: +70 pts Tier 4 bonus), decoupled from deployed player squad size and accumulated pre-ascension XP.

#### Scenario: Threat scaling across stages
- **WHEN** an encounter is generated for Stage 1 versus a later Stage N
- **THEN** the target threat budget increases monotonically anchored to the stage deployment budget plus highest-tier hostile bonus

#### Scenario: Threat decoupled from squad size
- **WHEN** an encounter is generated for a large player squad (e.g. 8 wayfarers) or a party with pre-ascension level projections
- **THEN** the target threat budget remains anchored to the stage deployment budget plus stage tier bonus rather than multiplying uncapped squad threat

#### Scenario: High-threat stage hostile bonus
- **WHEN** generating an encounter for Stage 6 or beyond with Tier-4 unlocked
- **THEN** the system adds a +70 hostile bonus threat to the stage deployment budget representing a Tier-4 adversary bonus

### Requirement: Procedural Enemy Composition
The system SHALL assemble an enemy combatant roster whose total threat budget matches the target encounter budget, selecting from verified class packages across Novices (10 threat), Tier-1 classes (25 threat), Tier-2 classes (40 threat), Tier-3 hybrid classes (55 threat), and Tier-4 specialized classes (70 threat). The system SHALL dynamically spend the threat budget on multiple units of the highest appropriate tiers for the stage rather than capping the squad at one unit per tier, and SHALL NOT enforce an arbitrary 4-unit squad cap on enemy forces.

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

#### Scenario: Generating enemy squad with Tier-4 adversaries
- **WHEN** generating an encounter with a threat budget of 70 or higher (e.g. Stage 5+ or dedicated high-threat trials)
- **THEN** the generated enemy squad can incorporate Tier-4 adversaries (Shield-bearer, Dragoon) matching the stage budget

#### Scenario: Generating multi-unit Tier-1 enemy squad
- **WHEN** generating an encounter for Stage 2 with a calibrated threat budget of 75 to 85 points
- **THEN** the system can generate multiple Tier-1 adversaries (e.g. 3 Tier-1 units) rather than restricting Tier-1 enemies to a single unit

#### Scenario: Generating multi-unit Tier-2 enemy squad
- **WHEN** generating an encounter for Stage 4 with a calibrated threat budget of 150 to 170 points
- **THEN** the system can generate multiple Tier-2 adversaries alongside supporting units without an artificial 4-unit enemy squad ceiling

### Requirement: Hybrid Enemy Progression and Loadout
The system SHALL initialize generated Tier-1, Tier-2, Tier-3, and Tier-4 enemy units with archetype point advancement and constellations that satisfy their class requirements, assigning their signature abilities, domain abilities, and passive mastery traits. Generated enemies SHALL dynamically select wildcard abilities and wildcard passives from their unlocked constellation lineage rather than hardcoding static Novice starter spells and static Momentum.

#### Scenario: Initializing a Cavalier enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `cavalier`
- **THEN** the unit progression receives 2 Fighter and 1 Rogue archetype advancements, unlocks Cavalier in its constellation, and equips domain abilities and passives derived from its unlocked constellation lineage (e.g. Warrior and Knight domain abilities and passives)

#### Scenario: Initializing a Witch enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `witch`
- **THEN** the unit progression receives 1 Rogue and 2 Mage archetype advancements, unlocks Witch in its constellation, and equips domain abilities and passives derived from its Focus and Finesse lineage

#### Scenario: Initializing a Tier-4 enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `shield-bearer` or `dragoon`
- **THEN** the unit progression receives 4 archetype advancements matching class requirements (e.g. 3 Fighter and 1 Rogue for Shield-bearer, 3 Fighter and 1 Mage for Dragoon) and derives loadout options from unlocked lineage
