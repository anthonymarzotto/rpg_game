# Spec Delta

## MODIFIED Requirements

### Requirement: Behavioral Condition Enforcement
The system SHALL enforce tactical and behavioral constraints imposed by active conditions through a declarative condition registry, including targeting prevention for `STEALTH` and roll penalties for `CHALLENGED` applied symmetrically to attack rolls and targeting previews.

#### Scenario: Stealth prevents single-target hostile targeting
- **WHEN** an enemy attempts to execute a single-target ability targeting a unit with the `STEALTH` condition
- **THEN** action validation rejects the execution with an invalid target reason

#### Scenario: Attacking from stealth grants Advantage and breaks stealth
- **WHEN** a unit with the `STEALTH` condition executes an attack
- **THEN** the attack roll evaluates with Advantage
- **THEN** upon completing the action, the `STEALTH` condition is removed

#### Scenario: Challenged condition imposes Disadvantage
- **WHEN** a unit with an active `CHALLENGED` condition attacks a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the attack roll evaluates with Disadvantage

#### Scenario: Challenged condition applies Disadvantage to targeting preview
- **WHEN** a unit with an active `CHALLENGED` condition previews an attack against a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the previewed hit chance is calculated using the Disadvantage formula ($p^2$)
- **THEN** the preview indicates active Disadvantage
