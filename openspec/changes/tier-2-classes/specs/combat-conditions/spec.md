# Spec Delta: combat-conditions

## Purpose

Provides core combat engine support for status conditions, Damage-over-Time ticks, behavioral constraints, CTB initiative manipulation, friendly aoeRadius auras, pending ability modifiers, and event-driven passive triggers.

## ADDED Requirements

### Requirement: Active Condition Tracking
The system SHALL maintain an active condition collection on each combat unit where each condition specifies a valid condition type (`POISON`, `BURN`, `CHALLENGED`, `STEALTH`), duration in turns, and a mandatory `sourceUnitId` representing the originating unit.

#### Scenario: Condition application with attribution
- **WHEN** an ability applies a condition to a target unit
- **THEN** an `ActiveCondition` entry is added to the target unit's condition list containing the correct type, duration, and the actor's unit ID as `sourceUnitId`

### Requirement: Turn-Start Damage-Over-Time Resolution
The system SHALL evaluate all active damage-over-time conditions (`POISON` and `BURN`) at the beginning of a unit's combat turn before granting Action Points, applying damage directly to HP and decrementing duration.

#### Scenario: Poison damage tick
- **WHEN** a unit with an active `POISON` condition begins their combat turn
- **THEN** the unit takes 2 unmitigated damage attributed to the `sourceUnitId`
- **THEN** the condition's remaining duration is decremented by 1 turn
- **THEN** if the remaining duration reaches 0, the condition is removed

#### Scenario: Burn damage tick
- **WHEN** a unit with an active `BURN` condition begins their combat turn
- **THEN** the unit takes 2 unmitigated fire damage attributed to the `sourceUnitId`
- **THEN** the condition's remaining duration is decremented by 1 turn
- **THEN** if the remaining duration reaches 0, the condition is removed

#### Scenario: Defeat by damage-over-time
- **WHEN** a unit's current HP is reduced to 0 or below by a turn-start DoT tick
- **THEN** the unit is marked as defeated immediately and their turn terminates without granting AP

### Requirement: Behavioral Condition Enforcement
The system SHALL enforce tactical and behavioral constraints imposed by active conditions, including targeting prevention for `STEALTH` and roll penalties for `CHALLENGED`.

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

### Requirement: CTB Gauge Manipulation & Pre-Encounter Setup
The system SHALL support direct adjustments to a unit's CTB initiative gauge during combat and provide a pre-encounter setup pass allowing passives and scenario modifiers to seed starting initiative or conditions.

#### Scenario: CTB delay execution
- **WHEN** an ability effect with `CTB_DELAY` resolves against a target
- **THEN** the target's `initiativeGauge` is reduced by the specified magnitude, floored at 0

#### Scenario: Pre-encounter setup pass
- **WHEN** a combat encounter is initialized before the first CTB clock tick
- **THEN** a setup pass is evaluated across all units
- **THEN** units with `Tactical Vanguard` receive +25 starting initiative gauge

### Requirement: Friendly AoE Aura Resolution
The system SHALL evaluate the `aoeRadius` of support and buff abilities (`damageType: 'NONE'`) to apply effects to all friendly units within the specified radius.

#### Scenario: Multi-ally buff dispatch
- **WHEN** an ability with `targetType: 'SELF'`, `damageType: 'NONE'`, and `aoeRadius: 3` is executed
- **THEN** the ability's effects are applied to the actor and all friendly units within 3 hexes

### Requirement: Pending Ability Modifiers
The system SHALL support ephemeral `PendingAbilityModifier` entries on combat units that enhance the range, blast radius, or damage of eligible subsequent abilities and automatically expire at the end of the turn.

#### Scenario: Pending modifier enhances next matching ability
- **WHEN** a unit with an active `PendingAbilityModifier` executes an eligible ability matching the allowed archetype
- **THEN** the ability resolves with the extra range and extra AoE radius applied
- **THEN** the pending modifier is cleared upon completion

#### Scenario: Pending modifier expires at turn end
- **WHEN** a unit with an active `PendingAbilityModifier` concludes their turn without executing a matching ability
- **THEN** the pending modifier is purged from the combat unit

### Requirement: Event-Driven Passive Trigger Dispatch
The system SHALL dispatch combat lifecycle events to registered passive handlers when specific triggers occur, including critical attack hits.

#### Scenario: On-crit trigger dispatch
- **WHEN** an attack roll resolves as `CRITICAL_HIT`
- **THEN** the combat engine dispatches an `ON_CRITICAL_HIT` event to the actor's passive handlers
- **THEN** any registered effect (such as `Wild Surge`) is resolved and appended to the combat events
