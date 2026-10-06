# Tier 3 Berserker Specification

## Purpose

Defines the complete class package, active combat abilities, sacrificial blood empowerment, frontal sweep mechanics, and low-health passive trait for the Tier 3 Berserker class (2 Fighter, 0 Rogue, 1 Mage) in the celestial constellation progression.

## Requirements

### Requirement: Berserker Class Package Resolution
The system SHALL provide a bespoke class package for the Berserker `(2 Fighter, 0 Rogue, 1 Mage)` consisting of signature ability `Blood Frenzy`, domain pool abilities `Reckless Cleave` and `Ignite Rage`, innate passive trait `Deathbound Fury`, and default AI profile `BRAWLER`.

#### Scenario: Berserker package loadout resolution
- **WHEN** a unit equips the Berserker active class
- **THEN** their signature combat ability resolves to `Blood Frenzy`
- **THEN** their domain combat abilities resolve to `Reckless Cleave` and `Ignite Rage`
- **THEN** their innate passive trait resolves to `Deathbound Fury`
- **THEN** their default AI tactical profile resolves to `BRAWLER`

### Requirement: Blood Frenzy Execution
The system SHALL provide a signature combat ability `Blood Frenzy` costing 1 AP that inflicts 3 points of self-damage on the actor to prime their next physical attack this turn with a +1 die step increase and a +2 bonus to the attack roll.

#### Scenario: Successful blood frenzy activation
- **WHEN** a unit executes `Blood Frenzy` with at least 1 AP and more than 3 current HP
- **THEN** the action consumes 1 AP
- **THEN** the actor suffers 3 points of direct self-damage
- **THEN** an ephemeral ability modifier is attached to the actor targeting physical attacks with `diceStep: 1`, `+2 attack roll bonus`, expiring at turn end or upon consumption

#### Scenario: Lethal self-sacrifice execution
- **WHEN** a unit has 3 or fewer current HP and executes `Blood Frenzy`
- **THEN** the action consumes 1 AP
- **THEN** the actor suffers 3 points of direct self-damage, reducing HP to 0
- **THEN** the actor is marked as defeated and removed from the active arena grid

### Requirement: Reckless Cleave Execution
The system SHALL provide a domain combat ability `Reckless Cleave` costing 2 AP that delivers a physical strike against an adjacent target and sweeps all living enemy units occupying adjacent frontal arc hexes for rolled collateral damage, while imposing a -2 Evasion penalty on the actor for 1 turn.

#### Scenario: Successful reckless cleave with frontal sweep
- **WHEN** a unit executes `Reckless Cleave` on an adjacent enemy target
- **THEN** the action costs 2 AP
- **THEN** an attack roll is resolved against the target's Evasion attribute
- **THEN** on a solid hit or critical hit, the primary target suffers `2d4 + Force` physical damage
- **THEN** all living enemies in the adjacent frontal sweep hexes suffer collateral damage resolved as `rolled 2d4 + Force - Armor`
- **THEN** the actor receives an active stat modifier of `-2 Evasion` lasting for 1 turn

### Requirement: Ignite Rage Execution
The system SHALL provide a domain combat ability `Ignite Rage` costing 1 AP that attacks an adjacent target's Resolve with magical flame, dealing magical damage and inflicting the `BURN` condition for 2 turns.

#### Scenario: Successful ignite rage execution
- **WHEN** a unit executes `Ignite Rage` on an adjacent enemy target
- **THEN** the action costs 1 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus as the attack modifier
- **THEN** on a solid hit or critical hit, the target suffers `1d6 + Focus` magical damage
- **THEN** the target receives the `BURN` condition with magnitude 2 for 2 turns

### Requirement: Deathbound Fury Passive Trait
The system SHALL provide an innate passive trait `Deathbound Fury` that grants +2 flat damage to physical attacks and lowers the Critical Hit threshold to 19–20 whenever the unit's current HP is at or below 50% of their maximum HP.

#### Scenario: Attack execution above 50% max HP
- **WHEN** a unit equipped with `Deathbound Fury` executes an attack while current HP is greater than 50% max HP
- **THEN** damage and critical hit thresholds resolve normally without passive bonus

#### Scenario: Attack execution at or below 50% max HP
- **WHEN** a unit equipped with `Deathbound Fury` executes a physical attack while current HP is at or below 50% max HP
- **THEN** the attack gains +2 flat damage to physical damage dealt
- **THEN** attack rolls of natural 19 or 20 (or beating target DC by 10+) resolve as Critical Hits

### Requirement: Berserker Package Registration & Wildcard Integration
The system SHALL register the Berserker package in the global class package catalog, allowing eligible units to equip the package as their active class or equip `Reckless Cleave` and `Ignite Rage` into wildcard ability slots.

#### Scenario: Equipping Berserker domain abilities as wildcard
- **WHEN** a unit has unlocked the Berserker node in their constellation
- **THEN** the unit can equip `Reckless Cleave` or `Ignite Rage` into active wildcard ability slots
- **THEN** loadout validation confirms the selection as valid
