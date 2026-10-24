# Spec Delta: Hybrid AI Profiles and Tactical Primer Heuristics

## MODIFIED Requirements

### Requirement: Skirmisher Flank and Armor-Shred Coordination
The AI decision system SHALL prioritize using armor-reducing and CTB-delaying hold-up abilities (`Stand and Deliver!`) on high-armor enemies before executing follow-up physical attacks (`Point-Blank Buckshot`), and SHALL suppress casting `Stand and Deliver!` on the same target multiple times within the same turn.

#### Scenario: Highwayman shreds armor before follow-up attack
- **WHEN** an active Highwayman with 3 AP faces an enemy with positive Armor (> 0)
- **THEN** the AI selects `Stand and Deliver!` to strip target armor and delay their initiative gauge before spending subsequent AP on follow-up attacks

#### Scenario: Duplicate hold-up suppressed on already-primed target in same turn
- **WHEN** an active Highwayman has already executed `Stand and Deliver!` on an enemy during the current turn and retains remaining AP
- **THEN** the AI evaluates subsequent casts of `Stand and Deliver!` on that same enemy with zero primer bonus and zero utility score, directing remaining AP to follow-up attacks or alternative viable actions

#### Scenario: Skirmisher flank position seeking
- **WHEN** an active Highwayman has available movement AP and can flank an enemy
- **THEN** the AI move evaluation awards high utility bonus to repositioning into the target's Flank or Rear arc

### Requirement: Universal Modifier Non-Redundancy Guards
The AI decision system SHALL evaluate target active modifiers and active conditions before selecting abilities that apply stat debuffs, buffs, or conditions. The AI SHALL assign zero score to effects that attempt to re-apply an active modifier to a stat already modified in the same direction, attempt to inflict `CHALLENGED` on a target already challenged by the actor, or attempt to apply `STEALTH` to an actor that currently possesses an active `STEALTH` condition. Additionally, abilities with zero base damage and zero primary utility SHALL NOT receive auxiliary tactical positioning scores (focus-fire or standoff bonuses) that would cause them to clear the AP conservation threshold. Secondary kinetic utility (`CTB_DELAY`) on non-damaging abilities SHALL NOT bypass non-redundancy guards when targeting a foe that already has the negative stat modifier active from the same actor.

#### Scenario: Hostile attack-roll debuff not repeated on debuffed enemy
- **WHEN** an enemy combatant currently has an active negative attack-roll modifier
- **THEN** the AI assigns zero utility to abilities whose sole or primary hostile effect is an attack-roll penalty against that enemy

#### Scenario: Duplicate hold-up with CTB delay suppressed on shredded foe
- **WHEN** an enemy combatant currently has an active negative armor modifier applied by the actor
- **THEN** the AI assigns zero utility to re-casting non-damaging armor shred abilities (`Stand and Deliver!`) on that same target even if the ability contains a CTB delay component

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

## ADDED Requirements

### Requirement: Offensive Ability Self-Buff and Melee Contingency Evaluation
The AI decision system SHALL evaluate offensive abilities that grant `targetScope: 'SELF'` stat modifiers or declare `meleeContingency` hints when scoring candidate actions against enemies. When an AI actor is engaged at distance 1, attacks that provide evasive buffs, displacement retreat, or declare `meleeContingency` (such as `Gallant Flourish`) SHALL receive priority utility scoring to disengage or protect the actor.

#### Scenario: Cornered Skirmisher executes Gallant Flourish in melee
- **WHEN** an AI Skirmisher is adjacent (distance 1) to an enemy and has 1 AP
- **THEN** the AI scores `Gallant Flourish` with defensive melee contingency utility, prioritizing the attack to deal rapier damage, gain +2 Evasion, and trigger a retreat step back to standoff range 2
