# Spec Delta

## MODIFIED Requirements

### Requirement: Baleful Hex Execution
The system SHALL provide a signature combat ability `Baleful Hex` costing 1 AP with range 1–3 that resolves an attack roll against target Resolve using Focus, inflicts the `POISON` status condition for 2 turns, and delays the target's CTB initiative gauge by 20 ticks with 0 initial direct damage.

#### Scenario: Successful baleful hex execution
- **WHEN** a unit executes `Baleful Hex` on an enemy unit within range 1 to 3
- **THEN** the action consumes 1 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus
- **THEN** on a solid hit or critical hit, the attack deals 0 direct damage
- **THEN** the target receives the `POISON` condition inflicting 2 damage per turn for 2 turns
- **THEN** the target suffers an immediate 20-tick delay to their CTB initiative gauge

#### Scenario: Baleful hex execution results in graze
- **WHEN** a unit executes `Baleful Hex` and the attack roll results in a graze against target Resolve
- **THEN** the direct damage is 0
- **THEN** the secondary non-damage effects (`POISON` and `CTB_DELAY`) are negated on graze
- **THEN** the combat log notes that secondary effects were negated on graze

### Requirement: Poppet Needle Execution
The system SHALL provide a domain combat ability `Poppet Needle` costing 2 AP with range 1–3 that deals `2d4 + Focus` magical damage against target Resolve using Focus, forces the target's directional facing 180° away from the actor, and inflicts -2 Resolve for 2 turns.

#### Scenario: Successful poppet needle execution with facing reversal
- **WHEN** a unit executes `Poppet Needle` on an enemy unit within range 1 to 3
- **THEN** the action consumes 2 AP
- **THEN** an attack roll is resolved against the target's Resolve attribute using Focus
- **THEN** on a solid hit or critical hit, the attack deals `2d4 + Focus` magical damage
- **THEN** the target's facing direction is immediately rotated 180° opposite to the hex direction facing the actor
- **THEN** the target receives a `-2 Resolve` stat modifier for 2 turns

### Requirement: Witch's Talisman Execution
The system SHALL provide a domain combat ability `Witch's Talisman` costing 1 AP with range 1–2 targeting an ally that grants the target ally a +2 Speed modifier and a +2 Ward modifier for 1 turn.

#### Scenario: Successful talisman buff on allied unit
- **WHEN** a unit executes `Witch's Talisman` on an allied unit within range 1 to 2
- **THEN** the action consumes 1 AP
- **THEN** the target ally receives a `+2 Speed` stat modifier lasting for 1 turn
- **THEN** the target ally receives a `+2 Ward` modifier lasting for 1 turn
- **THEN** no immediate CTB initiative gauge ticks are granted
