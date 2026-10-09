# Spec Delta: Encounter Generation

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Hybrid Enemy Progression and Loadout
The system SHALL initialize generated Tier-3 hybrid enemy units with archetype point advancement and constellations that satisfy the hybrid class requirements, assigning their signature abilities, domain abilities, and passive mastery traits.

#### Scenario: Initializing a Cavalier enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `cavalier`
- **THEN** the unit progression receives 2 Fighter and 1 Rogue archetype advancements, unlocks Cavalier in its constellation, and equips the Cavalier class package

#### Scenario: Initializing a Witch enemy
- **WHEN** `createEnemyUnit` creates an enemy unit with class `witch`
- **THEN** the unit progression receives 1 Rogue and 2 Mage archetype advancements, unlocks Witch in its constellation, and equips the Witch class package
