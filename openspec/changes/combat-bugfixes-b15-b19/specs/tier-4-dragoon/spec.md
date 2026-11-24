# tier-4-dragoon Specification Delta

## MODIFIED Requirements

### Requirement: Coiled Apex Passive Trait & Virtual Height
The system SHALL provide an innate passive trait `Coiled Apex` that grants `Apex Strike` (+2 flat damage when striking targets from higher elevation or Virtual Height) and `Coiled Readiness` (+1 Virtual Height on turn end with unspent AP, max +1). Armed Virtual Height SHALL persist across subsequent turns until consumed upon resolving the Dragoon's next attack roll, SHALL be counted exactly once during attack roll and target preview elevation evaluation, and SHALL be visually surfaced in the combat HUD and arena overlay.

#### Scenario: Coiled Readiness virtual elevation accumulation
- **WHEN** a unit equipped with `Coiled Apex` ends their active turn with 1 or more unspent AP
- **THEN** the unit receives `+1 Virtual Height` until their next attack roll is resolved

#### Scenario: Coiled Readiness persists across non-attacking turns
- **WHEN** a unit equipped with `Coiled Apex` already holds `+1 Virtual Height` and ends a subsequent non-attacking turn with `0` AP
- **THEN** the unit retains `+1 Virtual Height` until their next attack roll is resolved

#### Scenario: Virtual Height defensive protection
- **WHEN** an enemy attacks a unit equipped with `Coiled Apex` that has `+1 Virtual Height`
- **THEN** the incoming attack roll calculation applies a -2 low-ground penalty (without double-counting into Disadvantage)
- **WHEN** an enemy attacks a unit that has `+2 Virtual Height`
- **THEN** the incoming attack roll calculation imposes Disadvantage from low ground

#### Scenario: Virtual Height offensive discharge
- **WHEN** a unit with `+1 Virtual Height` declares an attack against a target on level ground
- **THEN** the attack roll and target preview evaluate with an effective elevation delta of `+1` (`+2` high-ground attack bonus, NOT double-counted into `+2` Advantage)
- **THEN** `Apex Strike` adds `+2 flat damage` to the attack damage calculation
- **THEN** the Virtual Height modifier is consumed upon resolving the attack

#### Scenario: Melee reach validation preserved with Virtual Height
- **WHEN** a unit with `+2 Virtual Height` attacks an adjacent target in melee
- **THEN** the melee reach validation evaluates against physical tile elevation, allowing the attack to proceed without being rejected as vertically out of reach
