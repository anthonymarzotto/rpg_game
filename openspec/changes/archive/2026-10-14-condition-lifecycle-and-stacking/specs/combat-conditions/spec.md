# Spec Delta

## MODIFIED Requirements

### Requirement: Active Condition Tracking
The system SHALL maintain an active condition collection on each combat unit where each condition specifies a valid condition type (`POISON`, `BURN`, `CHALLENGED`, `STEALTH`), duration in turns, and a mandatory `sourceUnitId` representing the originating unit. When applying a condition that is already present on a target, the system SHALL resolve the conflict according to the condition's registered stacking policy:
- `OVERRIDE_SOURCE`: Overwrite `sourceUnitId` with the new applying actor, refresh duration to the new duration, and preserve single-condition status (used by `CHALLENGED` for taunt steal).
- `STACK_INTENSITY`: Increment `damagePerTurn` up to a configured ceiling (8) and refresh duration to `Math.max(existing, new)` (used by `POISON` and `BURN`).
- `REFRESH_DURATION`: Keep existing properties and refresh duration to `Math.max(existing, new)` (used by `STEALTH`).

#### Scenario: Condition application with attribution
- **WHEN** an ability applies a condition to a target unit that does not currently possess that condition
- **THEN** an `ActiveCondition` entry is added to the target unit's condition list containing the correct type, duration, and the actor's unit ID as `sourceUnitId`

#### Scenario: Challenged taunt steal overrides previous challenger
- **WHEN** a unit with an active `CHALLENGED` condition from Unit A is challenged by Unit B
- **THEN** the existing condition's `sourceUnitId` is updated to Unit B
- **THEN** the condition's `durationTurns` is reset to the new duration
- **THEN** the target possesses exactly one `CHALLENGED` condition

#### Scenario: DoT intensity stacking up to maximum cap
- **WHEN** a unit with an active `POISON` or `BURN` condition takes a new application of the same condition
- **THEN** the condition's `damagePerTurn` is increased by the incoming condition magnitude up to a maximum cap of 8
- **THEN** the condition's `durationTurns` is set to the maximum of its remaining turns and incoming turns
- **THEN** the target possesses exactly one condition of that type

#### Scenario: Stealth duration refresh
- **WHEN** a unit with an active `STEALTH` condition is granted `STEALTH` again
- **THEN** the condition's duration is updated to `Math.max(currentDuration, newDuration)`
- **THEN** the target possesses exactly one `STEALTH` condition

### Requirement: Turn-Start Damage-Over-Time Resolution
The system SHALL evaluate all active conditions at the beginning of a unit's combat turn before granting Action Points by delegating to each condition's registered `onTurnStart` lifecycle hook, applying returned unmitigated damage directly to HP and decrementing duration.

#### Scenario: Poison damage tick
- **WHEN** a unit with an active `POISON` condition begins their combat turn
- **THEN** the registered `onTurnStart` hook resolves damage matching the condition's accumulated `damagePerTurn` (default 2) attributed to the `sourceUnitId`
- **THEN** the condition's remaining duration is decremented by 1 turn
- **THEN** if the remaining duration reaches 0, the condition is removed

#### Scenario: Burn damage tick
- **WHEN** a unit with an active `BURN` condition begins their combat turn
- **THEN** the registered `onTurnStart` hook resolves fire damage matching the condition's accumulated `damagePerTurn` (default 2) attributed to the `sourceUnitId`
- **THEN** the condition's remaining duration is decremented by 1 turn
- **THEN** if the remaining duration reaches 0, the condition is removed

#### Scenario: Defeat by damage-over-time
- **WHEN** a unit's current HP is reduced to 0 or below by a turn-start DoT tick
- **THEN** the unit is marked as defeated immediately and their turn terminates without granting AP

### Requirement: Behavioral Condition Enforcement
The system SHALL enforce tactical and behavioral constraints imposed by active conditions through declarative condition registry lifecycle hooks: `canBeTargeted` for targeting validation, `evaluateAttackRollContext` for roll advantage/disadvantage, and `onAfterAction` for condition removal upon combat actions.

#### Scenario: Stealth prevents single-target hostile targeting
- **WHEN** an enemy attempts to execute a single-target ability targeting a unit with the `STEALTH` condition
- **THEN** `canBeTargeted` rejects the execution with an invalid target reason

#### Scenario: Attacking from stealth grants Advantage and breaks stealth
- **WHEN** a unit with the `STEALTH` condition executes an attack
- **THEN** the attack roll evaluates with Advantage
- **THEN** upon completing the action, the condition's `onAfterAction` hook removes the `STEALTH` condition

#### Scenario: Challenged condition imposes Disadvantage
- **WHEN** a unit with an active `CHALLENGED` condition attacks a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the attack roll evaluates with Disadvantage

#### Scenario: Challenged condition applies Disadvantage to targeting preview
- **WHEN** a unit with an active `CHALLENGED` condition previews an attack against a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the previewed hit chance is calculated using the Disadvantage formula ($p^2$)
- **THEN** the preview indicates active Disadvantage
