# Spec Delta: Tier 3 Highwayman

## MODIFIED Requirements

### Requirement: Gallant Flourish Execution
The system SHALL provide a domain combat ability `Gallant Flourish` costing 1 AP with melee range 1 that attacks an adjacent target with physical rapier damage, grants the actor +2 Evasion for 1 turn, and performs a 1-hex evasive retreat step directly away from the target.

#### Scenario: Gallant flourish execution
- **WHEN** a unit executes `Gallant Flourish` on an adjacent enemy target
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against the target's Evasion attribute using Finesse
- **THEN** on a solid hit or critical hit, the target suffers `1d4 + Finesse` physical damage
- **THEN** the actor receives an active stat modifier of `+2 Evasion` lasting for 1 turn
- **THEN** the actor performs a 1-hex `RETREAT_STEP` directly away from the target into an unoccupied walkable tile, returning to standoff distance 2

#### Scenario: Gallant flourish retreat obstructed
- **WHEN** a unit executes `Gallant Flourish` and the hex directly opposite the target is occupied or impassable
- **THEN** damage and the +2 Evasion buff are applied normally, while the displacement step is safely skipped without fault

### Requirement: Highway Toll Passive Trait
The system SHALL provide an innate passive trait `Highway Toll` that adds +2 flat physical damage to attacks executed against any target whose base Force attribute is greater than the actor's base Force attribute.

#### Scenario: Attack against armored target with Highway Toll
- **WHEN** a Highwayman (base Force 1) equipped with `Highway Toll` executes a physical attack against a target with base Force 2 or greater
- **THEN** the damage resolution adds +2 flat damage to raw physical damage prior to armor mitigation, regardless of whether the target's current Armor has been reduced to 0 by armor shredding

#### Scenario: Attack against unarmored target with Highway Toll
- **WHEN** a Highwayman equipped with `Highway Toll` executes a physical attack against a target whose base Force is less than or equal to the Highwayman's base Force (Force <= 1)
- **THEN** no passive bonus damage is added
