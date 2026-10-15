# Spec Delta

## MODIFIED Requirements

### Requirement: Ally Buff and Tempo Evaluation
The AI decision system SHALL evaluate ally-targeted abilities (`targetType: 'ALLY'`) during turn decision scoring, assigning utility bonuses to CTB initiative boosts and speed modifiers (`Witch's Talisman`) when targeting allied combatants engaged in melee or lagging on the CTB initiative track. The AI SHALL assign zero utility to initiative-boosting effects if the allied target's initiative gauge is already at or near maximum (>= 80) or if the ally currently has an active positive speed modifier.

#### Scenario: Witch casts Witch's Talisman on frontline ally
- **WHEN** an active Witch unit has 1 AP and an allied combatant within range 2 engaged in melee with an enemy and lagging on initiative (< 80)
- **THEN** the AI evaluates `Witch's Talisman` with positive utility and prioritizes granting the ally CTB acceleration and speed

#### Scenario: Repetitive initiative boost suppressed on high-tempo ally
- **WHEN** an ally currently has an initiative gauge >= 80 or already has an active positive speed modifier
- **THEN** the AI assigns zero utility score to casting `Witch's Talisman` or initiative boosts on that ally

#### Scenario: Composite move-and-buff candidate generation
- **WHEN** an active support unit has sufficient AP (>= 2) and movement to reach an ally out of base ability range
- **THEN** the AI generates and scores composite move-then-buff candidate actions

### Requirement: Universal Modifier Non-Redundancy Guards
The AI decision system SHALL evaluate target active modifiers and active conditions before selecting abilities that apply stat debuffs, buffs, or conditions. The AI SHALL assign zero score to effects that attempt to re-apply an active modifier to a stat already modified in the same direction, or attempt to inflict `CHALLENGED` on a target already challenged by the actor. Additionally, abilities with zero base damage and zero primary utility SHALL NOT receive auxiliary tactical positioning scores (focus-fire or standoff bonuses) that would cause them to clear the AP conservation threshold.

#### Scenario: Hostile attack-roll debuff not repeated on debuffed enemy
- **WHEN** an enemy combatant currently has an active negative attack-roll modifier
- **THEN** the AI assigns zero utility to abilities whose sole or primary hostile effect is an attack-roll penalty against that enemy

#### Scenario: Challenging shout not repeated on already challenged target
- **WHEN** an enemy combatant currently has an active `CHALLENGED` condition where `sourceUnitId` matches the actor's ID
- **THEN** the AI assigns zero utility to abilities applying `CHALLENGED` against that enemy

#### Scenario: Zero-damage zero-utility debuffs do not clear AP conservation
- **WHEN** an ability evaluates with zero damage and zero net utility against valid targets
- **THEN** auxiliary scores for focus-fire and standoff are zeroed
- **THEN** total action score remains below the AP conservation threshold (4.0), causing the actor to conserve remaining AP

#### Scenario: Allied defensive buff not repeated on buffed ally
- **WHEN** a friendly combatant currently has an active positive modifier on armor, ward, or evasion
- **THEN** the AI assigns zero utility to re-applying that same positive stat buff on that target
