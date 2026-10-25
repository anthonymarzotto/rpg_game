# Tier 1 Thief Specification

## Purpose

Defines the combat capabilities, ability execution rules, and tactical positioning conditions for the Tier 1 Thief signature ability Sneak Attack.

## Requirements

### Requirement: Sneak Attack Execution
The system SHALL provide a signature combat ability `Sneak Attack` costing 1 AP with range 1 that deals `1d4 + Force` physical damage against target Evasion using Finesse, and inflicts `+1d6` bonus precision damage when striking a target from their flank or rear combat arc or under an allied pincer, without granting automatic attack roll Advantage.

#### Scenario: Unflanked sneak attack strike
- **WHEN** a unit executes `Sneak Attack` against an enemy target from the target's front arc without an adjacent allied pincer
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against target Evasion using Finesse with normal roll advantage
- **THEN** on a solid hit or critical hit, the attack deals `1d4 + Force` physical damage

#### Scenario: Flank or rear sneak attack strike
- **WHEN** a unit executes `Sneak Attack` against an enemy target from the target's flank or rear arc or with an adjacent allied pincer
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against target Evasion using Finesse with normal roll advantage unless Advantage is granted by another condition or trait
- **THEN** on a solid hit or critical hit, the attack deals `1d4 + 1d6 + Force` physical damage

#### Scenario: Sneak attack from stealth
- **WHEN** a stealthed unit executes `Sneak Attack` against an enemy target
- **THEN** the attack roll receives Advantage from the `STEALTH` condition
- **THEN** if striking from flank or rear or with an allied pincer, the attack deals `1d4 + 1d6 + Force` physical damage
- **THEN** executing the attack breaks stealth

### Requirement: Shadow Step Domain Ability Execution
The system SHALL provide a domain combat ability `Shadow Step` costing 1 AP with range 2 targeting an unoccupied walkable hex (`targetType: 'HEX'`) that teleports the user across flat terrain, strictly restricted to destination hexes at the exact same elevation as the caster ($\Delta h = 0$). The ability execution SHALL fail validation if the destination elevation is higher or lower than the caster's current elevation.

#### Scenario: Phasing through intervening obstacles at same elevation
- **WHEN** a unit executes `Shadow Step` targeting an unoccupied walkable hex 2 hexes away where an intervening hex contains an obstacle or unit, and the destination elevation equals the caster's elevation ($\Delta h = 0$)
- **THEN** the unit teleports to the destination hex without collision or path obstruction, consuming 1 AP

#### Scenario: Rejecting upward cliff ascent
- **WHEN** a unit attempts to execute `Shadow Step` targeting a hex at a higher elevation ($\Delta h > 0$)
- **THEN** ability validation fails and returns an error indicating that Shadow Step cannot change elevation

#### Scenario: Rejecting downward ledge descent
- **WHEN** a unit attempts to execute `Shadow Step` targeting a hex at a lower elevation ($\Delta h < 0$)
- **THEN** ability validation fails and returns an error indicating that Shadow Step cannot change elevation
