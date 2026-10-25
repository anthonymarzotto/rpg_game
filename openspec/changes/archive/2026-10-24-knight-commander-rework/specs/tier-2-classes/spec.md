# Spec Delta

## MODIFIED Requirements

### Requirement: Knight Class Package
The system SHALL provide a bespoke class package for the Knight `(2 Fighter, 0 Rogue, 0 Mage)` consisting of signature ability `Lead the Charge`, domain pool abilities `Challenging Shout` and `Pommel Strike`, and innate passive trait `Tactical Vanguard`.

#### Scenario: Knight package resolution
- **WHEN** a unit equips the Knight active class
- **THEN** their core combat abilities resolve to `Lead the Charge`, `Challenging Shout`, and `Pommel Strike`
- **THEN** their innate passive trait resolves to `Tactical Vanguard`

#### Scenario: Lead the Charge execution
- **WHEN** a unit executes `Lead the Charge`
- **THEN** the action costs 2 AP and does not perform an attack roll
- **THEN** the actor and all allied units within a 3-hex radius receive an active stat modifier granting a +2 bonus to Move distance, a +2 bonus to Speed, and a +2 bonus to attack rolls for 2 turns

#### Scenario: Challenging Shout execution
- **WHEN** a unit executes `Challenging Shout` on a valid target within 3 hexes
- **THEN** the action costs 1 AP
- **THEN** the target immediately rotates to face the challenger
- **THEN** the target receives the `CHALLENGED` condition for 2 turns, inflicting Disadvantage on attacks against any other unit and inflicting `EXPOSED` upon attacking any unit other than the challenger

#### Scenario: Pommel Strike execution
- **WHEN** a unit hits a target with `Pommel Strike`
- **THEN** the attack deals `1d4 + Force` physical damage
- **THEN** on a solid hit or critical hit, the target's CTB initiative gauge is reduced by 20 points (floored at 0)

#### Scenario: Pommel Strike against challenged target
- **WHEN** a unit hits a target possessing the `CHALLENGED` condition with `Pommel Strike`
- **THEN** the attack deals an additional `1d4` physical bonus damage (for a total of `2d4 + Force` physical damage before mitigation)
