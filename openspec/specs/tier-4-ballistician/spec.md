# tier-4-ballistician Specification

## Purpose

Defines the complete class package, combat abilities, delayed bombardment and rough terrain zone mechanics, spotter telemetry, and passive trait for the Tier 4 Ballistician (1 Fighter, 3 Rogue, 0 Mage) in the celestial constellation progression.

## Requirements

### Requirement: Ballistician Class Package Resolution
The system SHALL provide a bespoke class package for the Ballistician `(1 Fighter, 3 Rogue, 0 Mage)` consisting of signature ability `Siege Barrage`, domain pool abilities `Shrapnel Canister` and `Sighting Bolt`, and innate passive trait `Zeroed In`.

#### Scenario: Ballistician package resolution
- **WHEN** a unit equips the Ballistician active class
- **THEN** their core combat abilities resolve to `Siege Barrage`, `Shrapnel Canister`, and `Sighting Bolt`
- **THEN** their innate passive trait resolves to `Zeroed In`
- **THEN** their default AI tactical profile resolves to `SNIPER`

### Requirement: Zeroed In Passive Trait & Stationary Calibration
The system SHALL provide an innate passive trait `Zeroed In` that accumulates +1 stack at the end of the unit's turn if the unit did not move, teleport, or suffer forced displacement during that turn (up to a maximum of 3 stacks). Each stack SHALL grant `+1 Range` on ranged abilities (`range >= 2`), `+1 Attack Roll`, and `-1 Evasion` (with effective Evasion floored at 0). At 3 stacks, `Zeroed In` SHALL additionally grant `+1 AoE Radius` to area-of-effect abilities (`aoeRadius >= 1`). Any voluntary move, teleport, or forced displacement SHALL immediately clear all stacks of `Zeroed In`.

#### Scenario: Accumulating Zeroed In stacks when stationary
- **WHEN** a unit equipped with `Zeroed In` ends their turn without having executed a Move action, teleported, or been displaced during that turn
- **THEN** the unit gains `+1 Zeroed In` stack (up to a maximum of 3 stacks)
- **THEN** each stack increases the effective maximum range of their ranged abilities (`range >= 2`) by `+1`
- **THEN** each stack adds a `+1` bonus to their attack rolls
- **THEN** each stack applies `-1` to their effective Evasion (floored at 0)

#### Scenario: Capstone AoE expansion at 3 stacks
- **WHEN** a unit equipped with `Zeroed In` reaches 3 stacks
- **THEN** their area-of-effect abilities with `aoeRadius >= 1` (`Siege Barrage` and `Shrapnel Canister`) gain `+1 AoE Radius` (expanding from radius 1 to radius 2)

#### Scenario: Clearing Zeroed In stacks on movement or displacement
- **WHEN** a unit with 1 or more `Zeroed In` stacks executes a Move action, teleports, or is displaced by knockback, pull, or position swap
- **THEN** all `Zeroed In` stacks are immediately cleared to 0
- **THEN** the unit's ability ranges, attack roll modifiers, AoE radii, and Evasion return to baseline

### Requirement: Minimum-Range Deadzone Enforcement
The system SHALL enforce a minimum targeting distance (`minRange: 2`) on `Siege Barrage`, `Shrapnel Canister`, and `Sighting Bolt`, rejecting targets or hexes at distance 0 or 1.

#### Scenario: Rejecting adjacent target within deadzone
- **WHEN** a unit attempts to execute `Siege Barrage`, `Shrapnel Canister`, or `Sighting Bolt` targeting an enemy or hex at distance 1
- **THEN** action validation rejects the execution because the target is inside the minimum range deadzone (`distance < 2`)

### Requirement: Siege Barrage Delayed Zone Bombardment
The system SHALL provide a signature combat ability `Siege Barrage` costing 2 AP (`oncePerTurn: true`) with base range 2–4 hexes (`minRange: 2`, `ignoresElevationPenalty: true`) targeting a ground `HEX` (`aoeRadius: 1`). Executing `Siege Barrage` SHALL mark all hexes within the blast radius as an incoming bombardment zone without dealing immediate damage. At the start of the actor's next turn (or at the actor's next scheduled turn slot if the actor is displaced or defeated while the volley is airborne), the bombardment SHALL detonate across all marked hexes, rolling a Finesse-based physical attack roll against the Evasion of each unit occupying a marked hex and dealing `2d8 + Force` physical damage on hit.

#### Scenario: Marking a Siege Barrage bombardment zone
- **WHEN** a unit executes `Siege Barrage` targeting a valid hex at distance 2–4
- **THEN** the action costs 2 AP
- **THEN** the targeted hex and all hexes within `aoeRadius` (radius 1, or radius 2 at 3 stacks of `Zeroed In`) are marked as an active `Siege Barrage` impact zone on the arena
- **THEN** no immediate damage is dealt on the turn of firing

#### Scenario: Detonating Siege Barrage at next turn start
- **WHEN** a unit that launched `Siege Barrage` begins their next turn (or their scheduled turn slot arrives after defeat)
- **THEN** the marked bombardment zone detonates and is removed from the arena
- **THEN** for each unit currently occupying any hex in the marked zone, an attack roll using the launcher's Finesse attribute is evaluated against that unit's Evasion
- **THEN** each hit unit takes `2d8 + Force` physical damage (half on Graze)

### Requirement: Shrapnel Canister Stealth Reveal and Rough Terrain Rubble
The system SHALL provide a domain combat ability `Shrapnel Canister` costing 1 AP with base range 2–4 hexes (`minRange: 2`, `ignoresElevationPenalty: true`) targeting a ground `HEX` (`aoeRadius: 1`) with `defenseTarget: 'NONE'` and `damageType: 'NONE'`. Executing `Shrapnel Canister` SHALL immediately remove the `STEALTH` condition from any unit within the blast radius and convert all hexes in the blast radius into **Shrapnel Rubble** rough terrain for 2 turns, increasing the movement point cost to enter each rubble hex by `+2 MP` (`3 MP` total on flat ground).

#### Scenario: Uncloaking stealthed units and deploying Shrapnel Rubble
- **WHEN** a unit executes `Shrapnel Canister` targeting a hex whose blast radius contains a unit with the `STEALTH` condition
- **THEN** the action costs 1 AP and deals no damage
- **THEN** the `STEALTH` condition is immediately stripped from the concealed unit
- **THEN** all hexes within the blast radius become `Shrapnel Rubble` rough terrain for 2 turns

#### Scenario: Traversing Shrapnel Rubble rough terrain
- **WHEN** any unit attempts to move onto a hex containing active `Shrapnel Rubble` on flat ground (`dh = 0`)
- **THEN** pathfinding and reachability evaluate the step entry cost of that hex as `1 base + 2 rubble = 3 MP`
- **THEN** a unit with `Move 3` at the center of a 7-hex rubble cluster can move at most 1 hex into the outer ring with a single 1-AP Move action

### Requirement: Sighting Bolt and Quadrant Telemetry Spotter Lock
The system SHALL provide a domain combat ability `Sighting Bolt` costing 1 AP with base range 2–4 hexes (`minRange: 2`) targeting a single enemy (`SINGLE_TARGET`), resolving a physical attack roll (`attackModifierAttribute: 'finesse'`) against `EVASION`. On hit, `Sighting Bolt` SHALL deal `1d4 + Finesse` physical damage, and on a Solid Hit or Critical Hit (`HIT_OR_CRIT`), it SHALL apply the `EXPOSED` condition and mark the target with **Quadrant Telemetry** (`TELEMETRY`) for 2 turns. While a unit has `TELEMETRY`, any ranged or spell ability (`range >= 2`) executed by an attacker of the opposing faction targeting that unit SHALL gain `+2 Range` and ignore low-ground elevation and ranged cover penalties.

#### Scenario: Landing Sighting Bolt on Solid Hit or Critical Hit
- **WHEN** a unit executes `Sighting Bolt` against an enemy at distance 2–4 and achieves a Solid Hit or Critical Hit
- **THEN** the target takes `1d4 + Finesse` physical damage
- **THEN** the target receives the `EXPOSED` condition (granting Advantage on the next incoming attack)
- **THEN** the target receives the `TELEMETRY` condition for 2 turns

#### Scenario: Sighting Bolt Graze does not apply Telemetry or Exposed
- **WHEN** a unit executes `Sighting Bolt` and the attack roll results in a Graze
- **THEN** the target takes grazed physical damage
- **THEN** neither `EXPOSED` nor `TELEMETRY` is applied

#### Scenario: Allied ranged attack benefiting from Quadrant Telemetry
- **WHEN** an ally (or the Ballistician) targets an enemy marked with `TELEMETRY` using a ranged or spell ability (`range >= 2`)
- **THEN** the effective maximum range of that ability when targeting the marked enemy is increased by `+2` hexes
- **THEN** the attack ignores low-ground elevation penalties and Bastion ranged cover

### Requirement: Ballistician Package Registration and Wildcard Integration
The system SHALL register the Ballistician package in the global class package catalog, whitelist the `65_human_male` pixel token identifier, configure the class badge palette with Engineer Emerald and Safety Crimson, and allow eligible units to equip the package or equip `Shrapnel Canister` and `Sighting Bolt` as wildcard abilities.

#### Scenario: Equipping Ballistician abilities as wildcards
- **WHEN** a unit has unlocked the Ballistician node in their celestial constellation
- **THEN** the unit can equip `Shrapnel Canister` or `Sighting Bolt` into active wildcard ability slots
- **THEN** combat validation confirms the loadout as valid
