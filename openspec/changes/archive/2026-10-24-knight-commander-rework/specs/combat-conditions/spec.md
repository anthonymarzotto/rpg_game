# Spec Delta

## MODIFIED Requirements

### Requirement: Active Condition Tracking
The system SHALL maintain an active condition collection on each combat unit where each condition specifies a valid condition type (`POISON`, `BURN`, `CHALLENGED`, `STEALTH`, `EXPOSED`), duration in turns, and a mandatory `sourceUnitId` representing the originating unit. When applying a condition that is already present on a target, the system SHALL resolve the conflict according to the condition's registered stacking policy:
- `OVERRIDE_SOURCE`: Overwrite `sourceUnitId` with the new applying actor, refresh duration to the new duration, and preserve single-condition status (used by `CHALLENGED` for taunt steal).
- `STACK_INTENSITY`: Increment `damagePerTurn` up to a configured ceiling (8) and refresh duration to `Math.max(existing, new)` (used by `POISON` and `BURN`).
- `REFRESH_DURATION`: Keep existing properties and refresh duration to `Math.max(existing, new)` (used by `STEALTH` and `EXPOSED`).

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

#### Scenario: Exposed condition application and refresh
- **WHEN** a unit receives the `EXPOSED` condition
- **THEN** the unit acquires the `EXPOSED` condition for 1 turn (or refreshes duration if already active)

### Requirement: Behavioral Condition Enforcement
The system SHALL enforce tactical and behavioral constraints imposed by active conditions through declarative condition registry lifecycle hooks: `canBeTargeted` for targeting validation, `onOutgoingAttackRoll` and `onIncomingAttackRoll` for roll advantage/disadvantage, `onAfterAction` for condition removal and secondary status triggers upon combat actions, and `onTakeDamage` for condition removal upon taking damage.

For the `STEALTH` condition:
- The system SHALL reject hostile single-target abilities directed at a stealthed enemy.
- The system SHALL grant Advantage on outgoing attack rolls and remove `STEALTH` via `onAfterAction` when the stealthed unit executes an attack.
- The system SHALL remove `STEALTH` via `onTakeDamage` when the stealthed unit suffers direct attack damage, AoE splash damage, or fire damage (`damageType: 'MAGICAL'` from `BURN`). Turn-start damage from `POISON` DoT SHALL NOT remove `STEALTH`.
- When an active unit begins their combat turn, if an opposing stealthed unit is within range 1 and positioned within the active unit's `FRONT` combat arc, the system SHALL remove `STEALTH` from that stealthed unit ("Spotted!"). The detected unit SHALL preserve its existing facing. If the stealthed unit is positioned within the active unit's `REAR` or `FLANK` combat arc, `STEALTH` SHALL NOT be removed by proximity.

For the `CHALLENGED` condition:
- The system SHALL impose Disadvantage on outgoing attack rolls when attacking any target other than the challenger (`sourceUnitId`).
- When a unit with `CHALLENGED` executes an attack action where none of the targets are its challenger (`sourceUnitId`), the condition's `onAfterAction` hook SHALL inflict the `EXPOSED` condition upon the attacking unit. If the attack targets or includes the challenger, `EXPOSED` SHALL NOT be inflicted.

For the `EXPOSED` condition:
- The system SHALL grant Advantage on incoming attack rolls made against a unit with the `EXPOSED` condition.
- When an incoming attack resolves against an `EXPOSED` unit, the system SHALL consume and remove the `EXPOSED` condition immediately, regardless of whether the attack results in a Solid Hit, Critical Hit, Graze, or Miss.

#### Scenario: Stealth prevents single-target hostile targeting
- **WHEN** an enemy attempts to execute a single-target ability targeting a unit with the `STEALTH` condition
- **THEN** `canBeTargeted` rejects the execution with an invalid target reason

#### Scenario: Attacking from stealth grants Advantage and breaks stealth
- **WHEN** a unit with the `STEALTH` condition executes an attack
- **THEN** the attack roll evaluates with Advantage
- **THEN** upon completing the action, the condition's `onAfterAction` hook removes the `STEALTH` condition

#### Scenario: Direct attack damage breaks stealth
- **WHEN** a unit with the `STEALTH` condition suffers direct attack damage or AoE splash damage
- **THEN** the condition's `onTakeDamage` hook removes the `STEALTH` condition

#### Scenario: Burn damage breaks stealth
- **WHEN** a unit with the `STEALTH` condition suffers damage from `BURN`
- **THEN** the condition's `onTakeDamage` hook removes the `STEALTH` condition

#### Scenario: Poison DoT tick does not break stealth
- **WHEN** a unit with the `STEALTH` condition suffers damage from a turn-start `POISON` DoT tick
- **THEN** the condition's `onTakeDamage` hook leaves the `STEALTH` condition active

#### Scenario: Ending turn in enemy front arc reveals stealth on enemy turn start
- **WHEN** a stealthed unit is positioned at range 1 in an enemy's `FRONT` combat arc when that enemy begins their combat turn
- **THEN** the enemy spots the unit and `STEALTH` is removed
- **THEN** the revealed unit's facing is preserved

#### Scenario: Ending turn in enemy rear or flank arc maintains stealth
- **WHEN** a stealthed unit is positioned at range 1 in an enemy's `REAR` or `FLANK` combat arc when that enemy begins their combat turn
- **THEN** the stealthed unit remains hidden in the enemy's blind spot and `STEALTH` is preserved

#### Scenario: Challenged condition imposes Disadvantage
- **WHEN** a unit with an active `CHALLENGED` condition attacks a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the attack roll evaluates with Disadvantage

#### Scenario: Challenged condition applies Disadvantage to targeting preview
- **WHEN** a unit with an active `CHALLENGED` condition previews an attack against a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the previewed hit chance is calculated using the Disadvantage formula ($p^2$)
- **THEN** the preview indicates active Disadvantage

#### Scenario: Challenged unit attacking non-challenger incurs Disadvantage and receives Exposed
- **WHEN** a unit afflicted with `CHALLENGED` attacks a target other than its designated challenger
- **THEN** the attack roll evaluates with Disadvantage
- **THEN** upon completion of the attack action, the attacking unit receives the `EXPOSED` condition

#### Scenario: Challenged unit attacking challenger rolls normally without receiving Exposed
- **WHEN** a unit afflicted with `CHALLENGED` attacks its designated challenger
- **THEN** the attack roll evaluates normally without Disadvantage from `CHALLENGED`
- **THEN** the attacking unit does not receive the `EXPOSED` condition

#### Scenario: Incoming attack against Exposed unit rolls with Advantage and consumes condition
- **WHEN** any unit executes an attack against a target with the `EXPOSED` condition
- **THEN** the attack roll evaluates with Advantage
- **THEN** upon resolving the attack roll, the `EXPOSED` condition is consumed and removed from the target regardless of hit or miss
