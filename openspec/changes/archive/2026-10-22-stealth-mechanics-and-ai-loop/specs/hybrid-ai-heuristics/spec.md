# Spec Delta: Hybrid AI Heuristics

## MODIFIED Requirements

### Requirement: Universal Modifier Non-Redundancy Guards
The AI decision system SHALL evaluate target active modifiers and active conditions before selecting abilities that apply stat debuffs, buffs, or conditions. The AI SHALL assign zero score to effects that attempt to re-apply an active modifier to a stat already modified in the same direction, attempt to inflict `CHALLENGED` on a target already challenged by the actor, or attempt to apply `STEALTH` to an actor that currently possesses an active `STEALTH` condition. Additionally, abilities with zero base damage and zero primary utility SHALL NOT receive auxiliary tactical positioning scores (focus-fire or standoff bonuses) that would cause them to clear the AP conservation threshold.

#### Scenario: Hostile attack-roll debuff not repeated on debuffed enemy
- **WHEN** an enemy combatant currently has an active negative attack-roll modifier
- **THEN** the AI assigns zero utility to abilities whose sole or primary hostile effect is an attack-roll penalty against that enemy

#### Scenario: Challenging shout not repeated on already challenged target
- **WHEN** an enemy combatant currently has an active `CHALLENGED` condition where `sourceUnitId` matches the actor's ID
- **THEN** the AI assigns zero utility to abilities applying `CHALLENGED` against that enemy

#### Scenario: Allied defensive buff not repeated on buffed ally
- **WHEN** a friendly combatant currently has an active positive modifier on armor, ward, or evasion
- **THEN** the AI assigns zero utility to re-applying that same positive stat buff on that target

#### Scenario: Smoke Veil not repeated when already stealthed
- **WHEN** an AI-controlled actor currently has an active `STEALTH` condition
- **THEN** the AI assigns zero utility to `Smoke Veil` and any other ability whose primary effect is applying `STEALTH` to self

#### Scenario: Zero-damage zero-utility debuffs do not clear AP conservation
- **WHEN** an ability evaluates with zero damage and zero net utility against valid targets
- **THEN** auxiliary scores for focus-fire and standoff are zeroed
- **THEN** total action score remains below the AP conservation threshold (4.0), causing the actor to conserve remaining AP
