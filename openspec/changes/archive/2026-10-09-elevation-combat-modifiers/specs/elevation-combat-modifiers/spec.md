# Spec Delta

## Purpose

Defines tactical combat rules for 3D elevation differences, including ranged vantage range extensions, downward attack bonuses, upward low-ground penalties, melee vertical reach limits, and kinetic plunging knockback with unmitigated fall impact damage.

## ADDED Requirements

### Requirement: Ranged Elevation Vantage
The ability validation and range evaluation system SHALL extend the effective range of ranged attacks (abilities with base range $\ge 2$) launched from higher ground ($\Delta h \ge +1$) by $+1$ hex per elevation level: $\text{effectiveRange} = \text{baseRange} + \max(0, h_{\text{actor}} - h_{\text{target}})$. Ranged attacks launched from flat ground ($\Delta h = 0$) or lower elevation ($\Delta h \le -1$) SHALL NOT receive range extensions.

#### Scenario: Ranged attack from elevated ridge gains bonus range
- **WHEN** an actor at elevation 2 executes a range 2 attack against a target at elevation 0
- **THEN** the effective range of the attack SHALL be 4 hexes

#### Scenario: Flat ground or upward ranged attack does not extend range
- **WHEN** an actor at elevation 0 targets an enemy at elevation 1 or 0 with a range 2 attack
- **THEN** the effective range of the attack SHALL remain 2 hexes

### Requirement: Vertical Attack Roll Modifiers
The combat attack roll resolver SHALL adjust to-hit calculations based on the elevation difference between attacker and target. Attacking downward across $\Delta h = 1$ SHALL grant a $+2$ bonus to the attack roll. Attacking downward across $\Delta h \ge 2$ SHALL grant Advantage on the d20 attack roll. Attacking upward across $\Delta h = -1$ SHALL inflict a $-2$ penalty on the attack roll. Attacking upward across $\Delta h \le -2$ SHALL inflict Disadvantage on the d20 attack roll.

#### Scenario: Downward attack across 1 level grants +2 attack roll bonus
- **WHEN** an attacker at elevation 1 executes an attack against a target at elevation 0
- **THEN** the attack roll receives a +2 modifier from elevation

#### Scenario: Downward attack across 2 or more levels grants Advantage
- **WHEN** an attacker at elevation 2 executes an attack against a target at elevation 0
- **THEN** the attack roll is made with Advantage

#### Scenario: Upward attack across 1 level suffers -2 attack roll penalty
- **WHEN** an attacker at elevation 0 executes an attack against a target at elevation 1
- **THEN** the attack roll receives a -2 modifier from elevation

#### Scenario: Upward attack across 2 or more levels suffers Disadvantage
- **WHEN** an attacker at elevation 0 executes an attack against a target at elevation 2
- **THEN** the attack roll is made with Disadvantage

#### Scenario: Advantage and Disadvantage cancel to Normal roll
- **WHEN** an attacker has both Advantage (such as attacking from high ground $\Delta h \ge 2$) and Disadvantage (such as being under the Challenged condition targeting another unit)
- **THEN** the d20 attack roll resolves as a Normal roll without Advantage or Disadvantage

### Requirement: Melee Elevation Reach Constraints
The ability validation system SHALL restrict melee attacks (abilities with base range $\le 1$) to adjacent hexes where the absolute elevation difference is at most 1 ($|\Delta h| \le 1$). If the elevation difference between attacker and target is 2 or greater ($|\Delta h| \ge 2$), the system SHALL reject the ability execution as out of reach. Melee attacks directed downward across $\Delta h = 1$ SHALL receive the standard downward $+2$ attack roll bonus.

#### Scenario: Melee attack across 1 level elevation step is permitted
- **WHEN** an attacker at elevation 0 targets an adjacent enemy at elevation 1 with a melee strike
- **THEN** the ability validation SHALL succeed and allow execution

#### Scenario: Melee attack across 2 levels elevation difference is rejected
- **WHEN** an attacker at elevation 0 targets an adjacent enemy at elevation 2 with a melee strike (or elevation 2 strikes downward at elevation 0)
- **THEN** the ability validation SHALL fail with an error indicating the target is vertically out of reach

#### Scenario: Downward melee strike inherits +2 attack roll bonus
- **WHEN** an attacker at elevation 1 strikes an adjacent enemy at elevation 0 with a melee attack
- **THEN** the strike is permitted and gains a +2 attack roll bonus

### Requirement: Kinetic Plunging Knockback and Fall Impact Damage
When a knockback effect displaces a unit into a tile that is 2 or more elevation levels lower ($\Delta h \le -2$) than their displacement origin tile, the target SHALL land on the lower hex and suffer direct Fall Impact Damage equal to $|\Delta h| \times 4$. Fall Impact Damage caused by knockback plunges SHALL NOT be reduced or mitigated by the target unit's Armor or Ward vitals.

#### Scenario: Knockback over a 2-level cliff causes ledge drop and 8 unmitigated fall damage
- **WHEN** a target at elevation 2 is knocked back onto an adjacent tile at elevation 0
- **THEN** the target is displaced to the elevation 0 tile and suffers 8 direct unmitigated fall damage

#### Scenario: Knockback over a 3-level cliff causes ledge drop and 12 unmitigated fall damage
- **WHEN** a target at elevation 3 is knocked back onto an adjacent tile at elevation 0
- **THEN** the target is displaced to the elevation 0 tile and suffers 12 direct unmitigated fall damage

#### Scenario: Knockback down a 1-level step inflicts no fall damage
- **WHEN** a target at elevation 1 is knocked back onto an adjacent tile at elevation 0
- **THEN** the target is displaced to the elevation 0 tile and suffers 0 fall impact damage

### Requirement: Cliff-Slam and Step-Up Displacement
When a knockback trajectory encounters an adjacent hex whose elevation is higher than the current hex by $\Delta h \ge \text{minCliffSlamElevationDelta}$ (default 2), displacement SHALL halt at the cliff base and inflict Wall-Slam (Cliff-Slam) collision damage. When a knockback trajectory encounters an adjacent hex whose elevation difference is exactly $\Delta h = 1$, displacement SHALL push the target up onto the terrace without collision.

#### Scenario: Knockback into a 2-level cliff face halts and inflicts cliff collision damage
- **WHEN** a target at elevation 0 is knocked back toward an adjacent tile at elevation 2
- **THEN** displacement halts at the elevation 0 tile and the target suffers collision damage as a Cliff collision

#### Scenario: Knockback onto a 1-level terrace ascends the step cleanly
- **WHEN** a target at elevation 0 is knocked back toward an adjacent walkable, unoccupied tile at elevation 1
- **THEN** the target is displaced onto the elevation 1 tile without taking collision damage

#### Scenario: Knockback into arena perimeter or obstacle halts with collision
- **WHEN** a target is knocked back into an arena boundary or an unwalkable obstacle at any elevation
- **THEN** displacement halts and collision damage is resolved against the target
