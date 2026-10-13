# Spec Delta

## ADDED Requirements

### Requirement: Declarative Ability AI Hints and Role Metadata
The combat ability contract SHALL support optional declarative AI metadata (`aiHint`) specifying tactical roles (`PRIMER`, `FINISHER`, `DISRUPTION`, `UTILITY`, `DEFENSIVE`) and combo sequencing parameters (required follow-up attack category, minimum combined AP threshold, bonus scoring weight).

#### Scenario: Ability declares primer metadata
- **WHEN** an ability definition declares `aiHint` with role `PRIMER` and follow-up prerequisites
- **THEN** downstream AI decision modules can inspect the metadata without inspecting ability identifiers or class packages

#### Scenario: Wildcard ability retains AI metadata across classes
- **WHEN** a unit equips an ability through a wildcard loadout slot
- **THEN** the ability's `aiHint` is retained and utilized identically by the actor's AI controller regardless of their active class package

### Requirement: Generic Primer Combo Evaluation
The AI decision system SHALL evaluate any ability declaring primer metadata by checking whether the actor has sufficient remaining AP and at least one valid, affordable follow-up ability that can target an enemy within range. When these conditions are satisfied, the AI SHALL award the declared primer utility bonus.

#### Scenario: Primer ability prioritized when follow-up attack is viable
- **WHEN** an AI-controlled actor has sufficient AP for both the primer ability and an in-range follow-up attack
- **THEN** the primer ability is scored with its bonus utility and prioritized for execution

#### Scenario: Primer ability penalized or zeroed when follow-up is unavailable
- **WHEN** an AI-controlled actor lacks the AP required for a follow-up attack or has no hostile targets in range of a follow-up
- **THEN** the primer ability does not receive the primer bonus score

### Requirement: Universal Modifier Non-Redundancy Guards
The AI decision system SHALL evaluate target active modifiers before selecting abilities that apply stat debuffs or buffs, assigning zero score to effects that attempt to re-apply an active modifier to a stat already modified in the same direction.

#### Scenario: Hostile attack-roll debuff not repeated on debuffed enemy
- **WHEN** an enemy combatant currently has an active negative attack-roll modifier
- **THEN** the AI assigns zero utility to abilities whose sole or primary hostile effect is an attack-roll penalty against that enemy

#### Scenario: Allied defensive buff not repeated on buffed ally
- **WHEN** a friendly combatant currently has an active positive modifier on armor, ward, or evasion
- **THEN** the AI assigns zero utility to re-applying that same positive stat buff on that target
