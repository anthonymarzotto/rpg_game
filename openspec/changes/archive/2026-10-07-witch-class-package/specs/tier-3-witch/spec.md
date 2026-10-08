# Spec Delta

## Purpose

Defines the complete class package, active combat abilities, poison and turn delay curse, puppet effigy facing manipulation, allied haste talisman, and target-proximity defensive aura for the Tier 3 Witch class (0 Fighter, 1 Rogue, 2 Mage) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Witch Class Package Resolution
The system SHALL provide a bespoke class package for the Witch `(0 Fighter, 1 Rogue, 2 Mage)` consisting of signature ability `Baleful Hex`, domain pool abilities `Poppet Needle` and `Witch's Talisman`, innate passive trait `Misfortune Ward`, and default AI profile `SUPPORT`.

#### Scenario: Witch package loadout resolution
- **WHEN** a unit equips the Witch active class
- **THEN** their signature combat ability resolves to `Baleful Hex`
- **THEN** their domain combat abilities resolve to `Poppet Needle` and `Witch's Talisman`
- **THEN** their innate passive trait resolves to `Misfortune Ward`
- **THEN** their default AI tactical profile resolves to `SUPPORT`

### Requirement: Baleful Hex Execution
The system SHALL provide a signature combat ability `Baleful Hex` costing 1 AP with range 1–3 that deals magical damage against target Resolve using Focus, inflicts the `POISON` status condition for 2 turns, and delays the target's CTB initiative gauge by 20 ticks.

#### Scenario: Successful baleful hex execution
- **WHEN** a unit executes `Baleful Hex` on an enemy unit within range 1 to 3
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus
- **THEN** on a solid hit or critical hit, the attack deals `1d4 + Focus` magical damage
- **THEN** the target receives the `POISON` condition inflicting 2 damage per turn for 2 turns
- **THEN** the target suffers an immediate 20-tick delay to their CTB initiative gauge

### Requirement: Poppet Needle Execution
The system SHALL provide a domain combat ability `Poppet Needle` costing 1 AP with range 1–3 that deals magical damage against target Resolve using Focus, forces the target's directional facing 180° away from the actor, and inflicts -2 Resolve for 2 turns.

#### Scenario: Successful poppet needle execution with facing reversal
- **WHEN** a unit executes `Poppet Needle` on an enemy unit within range 1 to 3
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus
- **THEN** on a solid hit or critical hit, the attack deals `1d6 + Focus` magical damage
- **THEN** the target's facing direction is immediately rotated 180° opposite to the hex direction facing the actor
- **THEN** the target receives a `-2 Resolve` stat modifier for 2 turns

### Requirement: Witch's Talisman Execution
The system SHALL provide a domain combat ability `Witch's Talisman` costing 1 AP with range 1–2 targeting an ally that grants the target ally an immediate 25-tick CTB initiative boost and a +2 Speed modifier for 1 turn.

#### Scenario: Successful talisman buff on allied unit
- **WHEN** a unit executes `Witch's Talisman` on an allied unit within range 1 to 2
- **THEN** the action consumes 1 AP
- **THEN** the target ally immediately gains 25 ticks to their CTB initiative gauge
- **THEN** the target ally receives a `+2 Speed` stat modifier lasting for 1 turn

### Requirement: Misfortune Ward Aura Evaluation
The system SHALL provide an innate passive trait `Misfortune Ward` that projects a target-centric protective aura of radius 2 hexes, applying a -2 penalty to attack rolls for any incoming attack targeting an ally or the Witch standing within 2 hexes of the Witch.

#### Scenario: Enemy attacks ally within misfortune ward aura
- **WHEN** an enemy unit attacks a friendly unit positioned within 2 hexes of an active Witch with `Misfortune Ward`
- **THEN** the enemy's attack roll suffers a -2 penalty
- **THEN** the combat log records the -2 penalty from `Misfortune Ward`

#### Scenario: Enemy attacks ally outside misfortune ward aura
- **WHEN** an enemy unit attacks a friendly unit positioned more than 2 hexes away from the Witch
- **THEN** the enemy's attack roll does not receive a penalty from `Misfortune Ward`

#### Scenario: Enemy attacks Witch within her own aura
- **WHEN** an enemy unit attacks the Witch herself
- **THEN** because the Witch is within 2 hexes of herself, the enemy's attack roll suffers a -2 penalty

### Requirement: Witch Package Registration & Wildcard Integration
The system SHALL register the Witch package in the global class package catalog, allowing eligible units to equip the package as their active class or equip `Poppet Needle` and `Witch's Talisman` into active wildcard ability slots.

#### Scenario: Equipping Witch domain abilities as wildcard
- **WHEN** a unit has unlocked the Witch node in their progression constellation
- **THEN** the unit can equip `Poppet Needle` or `Witch's Talisman` into active wildcard ability slots
- **THEN** loadout validation confirms the selection as valid
