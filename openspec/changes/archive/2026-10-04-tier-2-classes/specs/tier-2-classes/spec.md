# Spec Delta: tier-2-classes

## Purpose

Defines the complete class packages, active ability loadouts, and passive mastery traits for the three Tier 2 classes (Knight, Infiltrator, Sorcerer) within the celestial constellation progression.

## ADDED Requirements

### Requirement: Knight Class Package
The system SHALL provide a bespoke class package for the Knight `(2 Fighter, 0 Rogue, 0 Mage)` consisting of signature ability `Lead the Charge`, domain pool abilities `Challenging Shout` and `Pommel Strike`, and innate passive trait `Tactical Vanguard`.

#### Scenario: Knight package resolution
- **WHEN** a unit equips the Knight active class
- **THEN** their core combat abilities resolve to `Lead the Charge`, `Challenging Shout`, and `Pommel Strike`
- **THEN** their innate passive trait resolves to `Tactical Vanguard`

#### Scenario: Lead the Charge execution
- **WHEN** a unit executes `Lead the Charge`
- **THEN** the action costs 2 AP and does not perform an attack roll
- **THEN** the actor and all allied units within a 3-hex radius receive a +2 bonus to Move distance and a +2 bonus to Speed for 2 turns

#### Scenario: Challenging Shout execution
- **WHEN** a unit executes `Challenging Shout` on a valid target within 3 hexes
- **THEN** the action costs 1 AP
- **THEN** the target immediately rotates to face the challenger
- **THEN** the target receives the `CHALLENGED` condition for 2 turns, inflicting Disadvantage on attacks against any other unit through their next turn

#### Scenario: Pommel Strike execution
- **WHEN** a unit hits a target with `Pommel Strike`
- **THEN** the attack deals `1d4 + Force` physical damage
- **THEN** on a solid hit or critical hit, the target's CTB initiative gauge is reduced by 20 points (floored at 0)

### Requirement: Infiltrator Class Package
The system SHALL provide a bespoke class package for the Infiltrator `(0 Fighter, 2 Rogue, 0 Mage)` consisting of signature ability `Expose Weakness`, domain pool abilities `Smoke Veil` and `Toxic Shiv`, and innate passive trait `Elusive Stride`.

#### Scenario: Infiltrator package resolution
- **WHEN** a unit equips the Infiltrator active class
- **THEN** their core combat abilities resolve to `Expose Weakness`, `Smoke Veil`, and `Toxic Shiv`
- **THEN** their innate passive trait resolves to `Elusive Stride`

#### Scenario: Expose Weakness execution
- **WHEN** a unit executes `Expose Weakness` on a target within 3 hexes
- **THEN** the action costs 1 AP
- **THEN** the target suffers an active modifier of -2 Armor and -2 Evasion for 2 turns

#### Scenario: Smoke Veil execution
- **WHEN** a unit executes `Smoke Veil`
- **THEN** the action costs 1 AP
- **THEN** the unit gains the `STEALTH` condition for 1 turn, preventing enemies from targeting them with single-target actions
- **THEN** the next attack roll made by the unit from stealth gains Advantage, after which the condition is removed

#### Scenario: Toxic Shiv execution
- **WHEN** a unit hits a target with `Toxic Shiv`
- **THEN** the attack deals `1d4 + Finesse` physical damage
- **THEN** on a solid hit or critical hit, the target receives the `POISON` condition for 2 turns

#### Scenario: Elusive Stride passive trigger
- **WHEN** a unit equipped with `Elusive Stride` executes a Move action during combat
- **THEN** the unit receives a +2 Evasion active modifier lasting until the start of their next turn

### Requirement: Sorcerer Class Package
The system SHALL provide a bespoke class package for the Sorcerer `(0 Fighter, 0 Rogue, 2 Mage)` consisting of signature ability `Spell Sculpt`, domain pool abilities `Ignite` and `Gust`, and innate passive trait `Wild Surge`.

#### Scenario: Sorcerer package resolution
- **WHEN** a unit equips the Sorcerer active class
- **THEN** their core combat abilities resolve to `Spell Sculpt`, `Ignite`, and `Gust`
- **THEN** their innate passive trait resolves to `Wild Surge`

#### Scenario: Spell Sculpt execution
- **WHEN** a unit executes `Spell Sculpt`
- **THEN** the action costs 1 AP and can be executed at most once per turn
- **THEN** an in-combat ability modifier is applied to the unit granting +1 Range and +1 AoE splash radius to their next cast Mage ability
- **THEN** the modifier is consumed upon casting the next spell or expires at the end of the current turn

#### Scenario: Ignite execution
- **WHEN** a unit hits a target with `Ignite`
- **THEN** the attack deals `1d4 + Focus` magical fire damage
- **THEN** on a solid hit or critical hit, the target receives the `BURN` condition for 2 turns

#### Scenario: Gust execution
- **WHEN** a unit executes `Gust` on a target within 3 hexes
- **THEN** the target is pushed 1 hex directly away from the caster along the straight-line hex vector
- **THEN** wall-slam and unit collision rules apply if displacement is obstructed

#### Scenario: Wild Surge passive trigger
- **WHEN** a unit equipped with `Wild Surge` lands a Critical Hit with a magical spell
- **THEN** a wild magic roll (1d3) triggers one spontaneous surge: +1 AP refund, +25 CTB initiative gauge boost, or 2 magic damage to a random enemy in range 3

### Requirement: Package Registration & Loadout Integration
The system SHALL register the Knight, Infiltrator, and Sorcerer packages in the global class package registry, allowing Level 2 units with unlocked constellation nodes to equip them as their active class or equip their abilities into wildcard slots.

#### Scenario: Tier 2 wildcard ability equipping
- **WHEN** a unit has unlocked the Knight node in their constellation but currently has Warrior as their active class
- **THEN** the unit can equip `Challenging Shout` or `Pommel Strike` into their active wildcard ability slots
- **THEN** combat validation confirms the loadout as valid

### Requirement: Tier 2 Procedural Encounter Generation
The system SHALL allow procedural campaign encounter generation at Stage 3 or higher to spawn Tier 2 enemy combatants (`Knight`, `Infiltrator`, `Sorcerer`) calibrated to a 40-point threat budget.

#### Scenario: Tier 2 enemy squad assembly
- **WHEN** an encounter is generated for Stage 3 or higher with at least 40 threat budget remaining
- **THEN** the encounter generator may assemble an enemy unit with an active Tier 2 class (`knight`, `infiltrator`, or `sorcerer`), advancing their progression and deriving Level 2 combat vitals

### Requirement: Tier 2 Pixel Token Whitelist
The system SHALL whitelist the completed pixel token identifiers for Knight (`02_human_male`), Infiltrator (`82_human_male`), and Sorcerer (`98_human_male`) in the token resolution pipeline.

#### Scenario: Tier 2 pixel token resolution
- **WHEN** a unit with an active class of Knight, Infiltrator, or Sorcerer is placed on the battlefield
- **THEN** the token resolver returns the corresponding pixel token asset path for their current facing direction
