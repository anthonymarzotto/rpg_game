# Spec Delta

## Purpose

Defines the complete class package, active combat abilities, kinetic displacement, initiative stagger, defensive stripping, and anti-armor passive trait for the Tier 3 Highwayman class (1 Fighter, 2 Rogue, 0 Mage) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Highwayman Class Package Resolution
The system SHALL provide a bespoke class package for the Highwayman `(1 Fighter, 2 Rogue, 0 Mage)` consisting of signature ability `Point-Blank Buckshot`, domain pool abilities `Stand and Deliver!` and `Gallant Flourish`, innate passive trait `Highway Toll`, and default AI profile `SKIRMISHER`.

#### Scenario: Highwayman package loadout resolution
- **WHEN** a unit equips the Highwayman active class
- **THEN** their signature combat ability resolves to `Point-Blank Buckshot`
- **THEN** their domain combat abilities resolve to `Stand and Deliver!` and `Gallant Flourish`
- **THEN** their innate passive trait resolves to `Highway Toll`
- **THEN** their default AI tactical profile resolves to `SKIRMISHER`

### Requirement: Point-Blank Buckshot Execution
The system SHALL provide a signature combat ability `Point-Blank Buckshot` costing 2 AP with range 1–2 that deals physical damage against target Evasion and displaces the target backward 1 hex with collision risk.

#### Scenario: Successful buckshot execution with knockback
- **WHEN** a unit executes `Point-Blank Buckshot` on an enemy unit at distance 1 or 2
- **THEN** the action consumes 2 AP
- **THEN** an attack roll is resolved against the target's Evasion attribute using Finesse
- **THEN** on a solid hit or critical hit, the attack deals `1d8 + Finesse` physical damage
- **THEN** the target is knocked back 1 hex away from the actor, testing for wall-slam or unit collisions

#### Scenario: Buckshot collision with arena boundary
- **WHEN** a unit executes `Point-Blank Buckshot` on an enemy adjacent to an arena wall along the knockback vector
- **THEN** the target collides with the wall and suffers wall-slam collision damage

### Requirement: Stand and Deliver! Execution
The system SHALL provide a domain combat ability `Stand and Deliver!` costing 1 AP with range 1–2 that executes a non-damaging tactical hold-up against an enemy unit, delaying the target's CTB initiative gauge by 30 ticks and reducing target Armor by 2 for 2 turns.

#### Scenario: Stand and deliver execution
- **WHEN** a unit executes `Stand and Deliver!` on an enemy unit at distance 1 or 2
- **THEN** the action consumes 1 AP without requiring an attack roll
- **THEN** the target's CTB initiative gauge is delayed by 30 ticks
- **THEN** the target receives an active stat modifier of `-2 Armor` lasting for 2 turns

### Requirement: Gallant Flourish Execution
The system SHALL provide a domain combat ability `Gallant Flourish` costing 1 AP with melee range 1 that attacks an adjacent target with physical rapier damage while granting the actor +2 Evasion for 1 turn.

#### Scenario: Gallant flourish execution
- **WHEN** a unit executes `Gallant Flourish` on an adjacent enemy target
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against the target's Evasion attribute using Finesse
- **THEN** on a solid hit or critical hit, the target suffers `1d4 + Finesse` physical damage
- **THEN** the actor receives an active stat modifier of `+2 Evasion` lasting for 1 turn

### Requirement: Highway Toll Passive Trait
The system SHALL provide an innate passive trait `Highway Toll` that adds +2 flat physical damage to attacks executed against any target whose effective Armor is greater than 0.

#### Scenario: Attack against armored target with Highway Toll
- **WHEN** a unit equipped with `Highway Toll` executes a physical attack against a target whose effective Armor is 1 or greater
- **THEN** the damage resolution adds +2 flat damage to raw physical damage prior to armor mitigation

#### Scenario: Attack against unarmored target with Highway Toll
- **WHEN** a unit equipped with `Highway Toll` executes a physical attack against a target whose effective Armor is 0 or less
- **THEN** no passive bonus damage is added

### Requirement: Highwayman Package Registration & Wildcard Integration
The system SHALL register the Highwayman package in the global class package catalog, allowing eligible units to equip the package as their active class or equip `Stand and Deliver!` and `Gallant Flourish` into active wildcard ability slots.

#### Scenario: Equipping Highwayman domain abilities as wildcard
- **WHEN** a unit has unlocked the Highwayman node in their progression constellation
- **THEN** the unit can equip `Stand and Deliver!` or `Gallant Flourish` into active wildcard ability slots
- **THEN** loadout validation confirms the selection as valid
