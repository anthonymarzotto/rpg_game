# Spec Delta: Tier 3 Cavalier

## Purpose

Defines the complete class package, active combat abilities, kinetic displacement mechanics, and passive mastery trait for the Cavalier class (2 Fighter, 1 Rogue) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Cavalier Class Package Resolution
The system SHALL provide a bespoke class package for the Cavalier `(2 Fighter, 1 Rogue, 0 Mage)` consisting of signature ability `Lance Charge`, domain pool abilities `Ride-Through` and `Flamboyant Flourish`, and innate passive trait `Impact Velocity`.

#### Scenario: Cavalier package resolution
- **WHEN** a unit equips the Cavalier active class
- **THEN** their core combat abilities resolve to `Lance Charge`, `Ride-Through`, and `Flamboyant Flourish`
- **THEN** their innate passive trait resolves to `Impact Velocity`
- **THEN** their default AI tactical profile resolves to `BRAWLER`

### Requirement: Lance Charge Execution
The system SHALL provide a signature combat ability `Lance Charge` costing 2 AP that targets an enemy unit located at distance 2 or 3 along an unobstructed straight hex ray, advances the actor to the adjacent destination hex, executes a physical strike, and displaces the target backward 1 hex.

#### Scenario: Successful straight-line lance charge
- **WHEN** a unit executes `Lance Charge` on an enemy unit at distance 2 or 3 in a straight line
- **AND** the destination hex immediately preceding the target is walkable and unoccupied
- **THEN** the action costs 2 AP
- **THEN** the actor is displaced to the destination hex
- **THEN** an attack roll is resolved against the target's Evasion attribute
- **THEN** on a solid hit or critical hit, the attack deals `1d8 + Force` physical damage
- **THEN** the target is knocked back 1 hex away from the actor along the charge line, testing for wall-slam or unit collisions

#### Scenario: Obstructed charge trajectory
- **WHEN** a unit attempts to execute `Lance Charge` against an enemy unit
- **AND** the target is at distance 1, or not in a straight line, or the destination hex is blocked or non-walkable
- **THEN** the action validation rejects the execution with a descriptive reason

### Requirement: Ride-Through Execution
The system SHALL provide a domain combat ability `Ride-Through` costing 1 AP that attacks an adjacent target and pushes the actor through to the hex directly behind the target if open.

#### Scenario: Successful ride-through penetration
- **WHEN** a unit executes `Ride-Through` on an adjacent enemy target
- **AND** the hex directly behind the target along the attack vector is walkable and unoccupied
- **THEN** the action costs 1 AP
- **THEN** the attack deals `1d4 + Finesse` physical damage vs Evasion
- **THEN** the actor moves through the target's hex to occupy the hex directly behind the target

#### Scenario: Blocked exit hex behind target
- **WHEN** a unit executes `Ride-Through` on an adjacent enemy target
- **AND** the hex directly behind the target is occupied or non-walkable
- **THEN** the attack deals `1d4 + Finesse` physical damage vs Evasion
- **THEN** the actor remains in their current hex without displacing

### Requirement: Flamboyant Flourish Execution
The system SHALL provide a domain combat ability `Flamboyant Flourish` costing 1 AP that mocks an adjacent enemy, applying the `CHALLENGED` condition to the target while granting the actor bonus Evasion.

#### Scenario: Flamboyant flourish execution
- **WHEN** a unit executes `Flamboyant Flourish` on an adjacent target
- **THEN** the action costs 1 AP and requires no attack roll
- **THEN** the target receives the `CHALLENGED` condition for 2 turns, imposing Disadvantage on attacks directed at any unit other than the actor
- **THEN** the actor receives an active modifier of `+2 Evasion` lasting for 1 turn

### Requirement: Impact Velocity Passive Trait
The system SHALL provide an innate passive trait `Impact Velocity` that increases wall-slam and collision damage caused by the unit's displacement effects by +2.

#### Scenario: Wall-slam collision with Impact Velocity
- **WHEN** a unit equipped with `Impact Velocity` displaces an enemy into an arena perimeter wall or another unit
- **THEN** the collision damage calculation adds +2 to the resolved impact damage

### Requirement: Cavalier Package Registration & Wildcard Integration
The system SHALL register the Cavalier package in the global class package catalog, allowing eligible units to equip the package as their active class or equip `Ride-Through` and `Flamboyant Flourish` into wildcard ability slots.

#### Scenario: Equipping Cavalier domain abilities as wildcard
- **WHEN** a unit has unlocked the Cavalier node in their constellation
- **THEN** the unit can equip `Ride-Through` or `Flamboyant Flourish` into their active wildcard ability slots
- **THEN** combat validation confirms the loadout as valid
