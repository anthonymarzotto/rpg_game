# Spec Delta: Tier 3 Warlock Class Package

## Purpose

Defines the complete class package, active combat abilities, kinetic displacement beam, armor-bypassing melee strike, demonic burn branding, and dual-layer defensive on-hit passive trait for the Tier 3 Warlock class (1 Fighter, 0 Rogue, 2 Mage) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Warlock Class Package Resolution
The system SHALL provide a bespoke class package for the Warlock `(1 Fighter, 0 Rogue, 2 Mage)` consisting of signature ability `Eldritch Blast`, domain pool abilities `Pact Blade` and `Hellfire Brand`, innate passive trait `Soul Carapace`, and default AI profile `SNIPER`.

#### Scenario: Warlock package loadout resolution
- **WHEN** a unit equips the Warlock active class
- **THEN** their signature combat ability resolves to `Eldritch Blast`
- **THEN** their domain combat abilities resolve to `Pact Blade` and `Hellfire Brand`
- **THEN** their innate passive trait resolves to `Soul Carapace`
- **THEN** their default AI tactical profile resolves to `SNIPER`

### Requirement: Eldritch Blast Execution
The system SHALL provide a signature combat ability `Eldritch Blast` costing 2 AP with range 1–3 that deals magical damage against target Resolve using Focus and knocks the target back 1 hex with wall-slam collision risk.

#### Scenario: Successful eldritch blast execution with knockback
- **WHEN** a unit executes `Eldritch Blast` on an enemy unit within range 1 to 3
- **THEN** the action consumes 2 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus
- **THEN** on a solid hit or critical hit, the attack deals `1d8 + Focus` magical damage
- **THEN** the target is knocked back 1 hex away from the actor, testing for wall-slam or unit collisions
- **THEN** collision damage scales with the actor's Focus attribute

#### Scenario: Eldritch blast collision with wall obstacle
- **WHEN** a unit executes `Eldritch Blast` on an enemy adjacent to an arena wall along the knockback vector
- **THEN** the target collides with the wall and suffers wall-slam collision damage

### Requirement: Pact Blade Execution
The system SHALL provide a domain combat ability `Pact Blade` costing 1 AP with melee range 1 that attacks an adjacent target with magical blade damage vs Resolve, bypassing physical Armor.

#### Scenario: Successful pact blade execution
- **WHEN** a unit executes `Pact Blade` on an adjacent enemy target
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus
- **THEN** on a solid hit or critical hit, the target suffers `1d6 + Focus` magical damage mitigated by target Ward rather than physical Armor

### Requirement: Hellfire Brand Execution
The system SHALL provide a domain combat ability `Hellfire Brand` costing 1 AP with range 1–2 that deals magical damage vs Resolve and inflicts the `BURN` status condition for 2 turns.

#### Scenario: Successful hellfire brand execution
- **WHEN** a unit executes `Hellfire Brand` on an enemy target within range 1 to 2
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus
- **THEN** on a solid hit or critical hit, the target suffers `1d4 + Focus` magical damage
- **THEN** the target receives the `BURN` condition inflicting 2 damage per turn for 2 turns

### Requirement: Soul Carapace Passive Trait
The system SHALL provide an innate passive trait `Soul Carapace` that grants the actor an active stat modifier of `+1 Armor` and `+1 Ward` for 1 turn whenever the actor successfully hits an enemy with a magical ability.

#### Scenario: Soul carapace triggers on magical hit
- **WHEN** a unit equipped with `Soul Carapace` scores a solid hit or critical hit with a magical ability
- **THEN** the unit receives an active stat modifier of `+1 Armor` and `+1 Ward` lasting for 1 turn

#### Scenario: Soul carapace does not trigger on attack miss
- **WHEN** a unit equipped with `Soul Carapace` misses an attack roll
- **THEN** no defensive stat modifier is applied

### Requirement: Warlock Package Registration & Wildcard Integration
The system SHALL register the Warlock package in the global class package catalog, allowing eligible units to equip the package as their active class or equip `Pact Blade` and `Hellfire Brand` into active wildcard ability slots.

#### Scenario: Equipping Warlock domain abilities as wildcard
- **WHEN** a unit has unlocked the Warlock node in their progression constellation
- **THEN** the unit can equip `Pact Blade` or `Hellfire Brand` into active wildcard ability slots
- **THEN** loadout validation confirms the selection as valid
