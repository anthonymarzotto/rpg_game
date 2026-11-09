# Tier 4 Shield-bearer Specification

## Purpose

Defines the complete class package, combat abilities, tactical positioning mechanics, and passive trait for the Tier 4 Shield-bearer (3 Fighter, 1 Rogue, 0 Mage) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Shield-bearer Class Package Resolution
The system SHALL provide a bespoke class package for the Shield-bearer `(3 Fighter, 1 Rogue, 0 Mage)` consisting of signature ability `Bastion Plant`, domain pool abilities `Intercept Step` and `Concussive Slam`, and innate passive trait `Unyielding Stance`.

#### Scenario: Shield-bearer package resolution
- **WHEN** a unit equips the Shield-bearer active class
- **THEN** their core combat abilities resolve to `Bastion Plant`, `Intercept Step`, and `Concussive Slam`
- **THEN** their innate passive trait resolves to `Unyielding Stance`
- **THEN** their default AI tactical profile resolves to `BRAWLER`

### Requirement: Bastion Plant Execution
The system SHALL provide a signature combat ability `Bastion Plant` costing 2 AP that locks the actor in place, grants temporary physical armor, projects a forward Zone of Control stopping enemy movement across the 3 front hexes, and shields allies in the rear arc against ranged damage.

#### Scenario: Successful Bastion Plant stance activation
- **WHEN** a unit executes `Bastion Plant`
- **THEN** the action costs 2 AP
- **THEN** the actor receives a `+3 Armor` stat modifier lasting for 1 turn
- **THEN** the actor's effective movement is reduced to 0 until their next turn
- **THEN** enemies entering the 3 forward hexes relative to the actor's facing have their movement path terminated upon entering
- **THEN** allied units positioned in the actor's rear hex receive 50% damage reduction against incoming ranged attacks for 1 turn

### Requirement: Intercept Step Execution
The system SHALL provide a domain combat ability `Intercept Step` costing 1 AP with range 3 targeting an ally, swapping positions with the target ally and granting them temporary armor.

#### Scenario: Successful Intercept Step position swap
- **WHEN** a unit executes `Intercept Step` targeting an allied unit at distance 1, 2, or 3 hexes
- **THEN** the action costs 1 AP
- **THEN** the actor and the target ally swap hex coordinates in the arena
- **THEN** the target ally receives a `+2 Armor` stat modifier lasting for 1 turn

#### Scenario: Intercept Step targeting invalid unit
- **WHEN** a unit attempts to execute `Intercept Step` targeting an enemy, self, or an ally beyond range 3
- **THEN** the action validation rejects the execution with a descriptive reason

### Requirement: Concussive Slam Execution
The system SHALL provide a domain combat ability `Concussive Slam` costing 1 AP targeting an adjacent enemy, dealing physical damage and applying the Slow condition without displacing the target.

#### Scenario: Concussive Slam hit resolution
- **WHEN** a unit executes `Concussive Slam` on an adjacent enemy target
- **THEN** the action costs 1 AP
- **THEN** an attack roll is resolved against the target's Evasion attribute using `Finesse`
- **THEN** on a solid hit or critical hit, the attack deals `1d4 + Force` physical damage
- **THEN** the target receives the `SLOW` condition (-2 Move) for 1 turn
- **THEN** the target remains in their current hex with no knockback applied

### Requirement: Unyielding Stance Passive Trait
The system SHALL provide an innate passive trait `Unyielding Stance` that renders the unit immune to forced displacement and projects a protective aura giving attackers a -2 penalty on attack rolls targeting adjacent allies.

#### Scenario: Forced displacement immunity
- **WHEN** a unit equipped with `Unyielding Stance` is subjected to a knockback, pull, or slide effect from an attack or terrain hazard
- **THEN** the unit remains in its current hex and is not displaced

#### Scenario: Phalanx protective aura evaluation
- **WHEN** an enemy unit declares an attack against an ally positioned adjacent to a unit equipped with `Unyielding Stance`
- **THEN** the incoming attack roll calculation applies a -2 penalty from the protective aura

### Requirement: Shield-bearer Package Registration and Wildcard Integration
The system SHALL register the Shield-bearer package in the global class package catalog, allowing eligible units to equip the package as their active class or equip `Intercept Step` and `Concussive Slam` into wildcard ability slots.

#### Scenario: Equipping Shield-bearer domain abilities as wildcards
- **WHEN** a unit has unlocked the Shield-bearer node in their constellation
- **THEN** the unit can equip `Intercept Step` or `Concussive Slam` into active wildcard ability slots
- **THEN** combat validation confirms the loadout as valid
