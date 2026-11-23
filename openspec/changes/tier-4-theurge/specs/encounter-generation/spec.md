# encounter-generation Specification Delta

## MODIFIED Requirements

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
- **WHEN** generating an encounter with a threat budget of 70 or higher (e.g. Stage 6+ or dedicated high-threat trials)
- **THEN** the generated enemy squad can incorporate Tier-4 adversaries (Shield-bearer, Dragoon, Ballistician, Philanderer, Theurge) matching the stage budget

#### Scenario: Generating multi-unit Tier-1 enemy squad
- **WHEN** generating an encounter for Stage 2 with a calibrated threat budget of 75 to 85 points
- **THEN** the system can generate multiple Tier-1 adversaries (e.g. 3 Tier-1 units) rather than restricting Tier-1 enemies to a single unit

#### Scenario: Generating multi-unit Tier-2 enemy squad
- **WHEN** generating an encounter for Stage 4 with a calibrated threat budget of 150 to 170 points
- **THEN** the system can generate multiple Tier-2 adversaries alongside supporting units without an artificial 4-unit enemy squad ceiling
