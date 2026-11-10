# Spec Delta: Encounter Generation

## MODIFIED Requirements

### Requirement: Stage-Scaled Threat Budget
The system SHALL compute the target encounter threat budget anchored directly to the stage deployment budget plus a stage tier hostile bonus equal to approximately one additional hostile of the highest eligible tier unlocked for that stage (Stage 1: +0 pts parity recruit trial, Stage 2: +25 pts Tier 1 bonus, Stage 3–4: +40 pts Tier 2 bonus, Stage 5+: +55 pts Tier 3 bonus), decoupled from deployed player squad size and accumulated pre-ascension XP.

#### Scenario: Threat scaling across stages
- **WHEN** an encounter is generated for Stage 1 versus a later Stage N
- **THEN** the target threat budget increases monotonically anchored to the stage deployment budget plus highest-tier hostile bonus

#### Scenario: Threat decoupled from squad size
- **WHEN** an encounter is generated for a large player squad (e.g. 8 wayfarers) or a party with pre-ascension level projections
- **THEN** the target threat budget remains anchored to the stage deployment budget plus stage tier bonus rather than multiplying uncapped squad threat
