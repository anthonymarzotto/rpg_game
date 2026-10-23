# Spec Delta: Combat Conditions

## MODIFIED Requirements

### Requirement: Behavioral Condition Enforcement
The system SHALL enforce tactical and behavioral constraints imposed by active conditions through declarative condition registry lifecycle hooks: `canBeTargeted` for targeting validation, `evaluateAttackRollContext` for roll advantage/disadvantage, `onAfterAction` for condition removal upon combat actions, and `onTakeDamage` for condition removal upon taking damage.

For the `STEALTH` condition:
- The system SHALL reject hostile single-target abilities directed at a stealthed enemy.
- The system SHALL grant Advantage on outgoing attack rolls and remove `STEALTH` via `onAfterAction` when the stealthed unit executes an attack.
- The system SHALL remove `STEALTH` via `onTakeDamage` when the stealthed unit suffers direct attack damage, AoE splash damage, or fire damage (`damageType: 'MAGICAL'` from `BURN`). Turn-start damage from `POISON` DoT SHALL NOT remove `STEALTH`.
- When an active unit begins their combat turn, if an opposing stealthed unit is within range 1 and positioned within the active unit's `FRONT` combat arc, the system SHALL remove `STEALTH` from that stealthed unit ("Spotted!"). The detected unit SHALL preserve its existing facing. If the stealthed unit is positioned within the active unit's `REAR` or `FLANK` combat arc, `STEALTH` SHALL NOT be removed by proximity.

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
