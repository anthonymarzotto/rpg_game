# Spec Delta: hybrid-ai-heuristics

## ADDED Requirements

### Requirement: Self-Targeting Ability Scope Enforcement
The AI decision system SHALL evaluate abilities declared with `targetType: 'SELF'` strictly against the acting combat unit itself. The AI SHALL NOT evaluate or score abilities declaring `targetType: 'SELF'` against other allied combatants during immediate action scoring or composite move-and-act evaluations.

#### Scenario: Self-only ability not considered for teammates
- **WHEN** an AI combatant with a self-targeting ability (such as `Smoke Veil`) evaluates candidate actions while allied units are present on the battlefield
- **THEN** candidate actions are only generated for the acting unit itself at its current hex or valid movement destinations
- **THEN** no candidate actions targeting allied teammates with the self-only ability are created

#### Scenario: Self-buff evaluated for actor after movement repositioning
- **WHEN** an AI combatant evaluates composite move-and-act sequences with a self-targeting ability
- **THEN** the self-buff utility is scored for the actor at the destination coordinate and executed upon the actor
