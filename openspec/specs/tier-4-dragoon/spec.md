# tier-4-dragoon Specification

## Purpose
Defines the complete class package, combat abilities, tactical positioning mechanics, and passive trait for the Tier 4 Dragoon (3 Fighter, 0 Rogue, 1 Mage) in the celestial constellation progression.

## Requirements

### Requirement: Dragoon Class Package Resolution
The system SHALL provide a bespoke class package for the Dragoon `(3 Fighter, 0 Rogue, 1 Mage)` consisting of signature ability `Dragon Dive`, domain pool abilities `Piercing Thrust` and `Wyrmflame Breath`, and innate passive trait `Coiled Apex`.

#### Scenario: Dragoon package resolution
- **WHEN** a unit equips the Dragoon active class
- **THEN** their core combat abilities resolve to `Dragon Dive`, `Piercing Thrust`, and `Wyrmflame Breath`
- **THEN** their innate passive trait resolves to `Coiled Apex`
- **THEN** their default AI tactical profile resolves to `BRAWLER`

### Requirement: Dragon Dive Execution
The system SHALL provide a signature combat ability `Dragon Dive` costing 2 AP with range 2–3 hexes that vaults over intervening units, obstacles, and cliffs, landing adjacent to the target (prioritizing the far hex in the target's rear arc, with fallback to the near hex along the trajectory), dealing primary physical damage and emitting a secondary kinetic shockwave.

#### Scenario: Successful Dragon Dive vault to far hex
- **WHEN** a unit executes `Dragon Dive` targeting an enemy at distance 2 or 3 hexes where the hex directly behind the enemy along the approach line is unoccupied and walkable
- **THEN** the action costs 2 AP
- **THEN** the actor leaps through the air ignoring intervening obstacles and units to occupy the far hex in the target's rear arc
- **THEN** the actor faces the target
- **THEN** an attack roll is resolved against the target's Evasion attribute
- **THEN** on a solid hit or critical hit, the attack deals `1d6 + Force` physical damage
- **THEN** all hostile units occupying hexes adjacent to the landing hex take `1d4` physical shockwave splash damage

#### Scenario: Dragon Dive fallback to near hex when rear is obstructed
- **WHEN** a unit executes `Dragon Dive` targeting an enemy where the far rear hex is occupied or impassable, but the near hex along the approach trajectory is open
- **THEN** the actor lands in the near hex directly in front of the target
- **THEN** the primary attack and splash shockwave resolve normally

#### Scenario: Dragon Dive rejected when target is surrounded
- **WHEN** a unit attempts to execute `Dragon Dive` on an enemy whose adjacent hexes are all occupied or impassable
- **THEN** the action validation rejects the execution with a descriptive reason stating the target is surrounded

### Requirement: Piercing Thrust Execution
The system SHALL provide a domain combat ability `Piercing Thrust` costing 1 AP with range 2 hexes along a straight hex ray, dealing physical damage to the primary target and piercing through to strike a secondary enemy aligned directly behind them.

#### Scenario: Piercing Thrust hitting aligned targets
- **WHEN** a unit executes `Piercing Thrust` against an adjacent enemy with another enemy standing directly behind them along the straight hex ray
- **THEN** the action costs 1 AP
- **THEN** the primary target takes `1d6 + Force` physical damage vs Evasion
- **THEN** the secondary enemy in the rear hex takes `1d4 + Force` physical piercing damage

#### Scenario: Piercing Thrust against isolated target
- **WHEN** a unit executes `Piercing Thrust` where no unit occupies the second hex along the straight ray
- **THEN** the action resolves normally against the primary target with no collateral damage emitted

### Requirement: Wyrmflame Breath Execution
The system SHALL provide a domain combat ability `Wyrmflame Breath` costing 1 AP that projects a 4-hex forward cone of draconic fire (1 hex at distance 1, and 3 fan hexes at distance 2 relative to the actor's facing), dealing magical damage vs Resolve and inflicting Burn.

#### Scenario: Wyrmflame Breath cone coverage
- **WHEN** a unit executes `Wyrmflame Breath`
- **THEN** the action costs 1 AP
- **THEN** an attack roll is resolved against each enemy occupying the 4 forward cone hexes using Focus vs Resolve
- **THEN** each hit enemy takes `1d4 + Focus` magical damage
- **THEN** each hit enemy receives the `BURN` condition (1 damage per turn for 2 turns)

### Requirement: Coiled Apex Passive Trait & Virtual Height
The system SHALL provide an innate passive trait `Coiled Apex` that grants `Apex Strike` (+2 flat damage when striking targets from higher elevation or Virtual Height) and `Coiled Readiness` (+1 Virtual Height on turn end with unspent AP, max +1).

#### Scenario: Coiled Readiness virtual elevation accumulation
- **WHEN** a unit equipped with `Coiled Apex` ends their active turn with 1 or more unspent AP
- **THEN** the unit receives `+1 Virtual Height` until their next attack roll is resolved

#### Scenario: Virtual Height defensive protection
- **WHEN** an enemy attacks a unit equipped with `Coiled Apex` that has `+1 Virtual Height`
- **THEN** the incoming attack roll calculation applies a -2 low-ground penalty
- **WHEN** an enemy attacks a unit that has `+2 Virtual Height`
- **THEN** the incoming attack roll calculation imposes Disadvantage from low ground

#### Scenario: Virtual Height offensive discharge
- **WHEN** a unit with Virtual Height declares an attack against a target on level ground
- **THEN** the attack roll evaluates with high-ground vantage (+2 bonus for +1 height, Advantage for +2 height)
- **THEN** `Apex Strike` adds `+2 flat damage` to the attack damage calculation
- **THEN** the Virtual Height modifier is consumed upon resolving the attack

#### Scenario: Melee reach validation preserved with Virtual Height
- **WHEN** a unit with `+2 Virtual Height` attacks an adjacent target in melee
- **THEN** the melee reach validation evaluates against physical tile elevation, allowing the attack to proceed without being rejected as vertically out of reach

### Requirement: Dragoon Package Registration and Wildcard Integration
The system SHALL register the Dragoon package in the global class package catalog, whitelist the `07_human_male` pixel token identifier, configure the class badge palette with Deep Dragon Violet and Radiant Crimson, and allow eligible units to equip the package or equip `Piercing Thrust` and `Wyrmflame Breath` as wildcard abilities.

#### Scenario: Equipping Dragoon abilities as wildcards
- **WHEN** a unit has unlocked the Dragoon node in their celestial constellation
- **THEN** the unit can equip `Piercing Thrust` or `Wyrmflame Breath` into active wildcard ability slots
- **THEN** combat validation confirms the loadout as valid
