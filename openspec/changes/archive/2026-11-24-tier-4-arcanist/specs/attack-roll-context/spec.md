# Attack Roll Context Delta Specification

## MODIFIED Requirements

### Requirement: Centralized Attack Roll Context Evaluation
The combat system SHALL evaluate all to-hit parameters through a single authoritative evaluation function that resolves the net attack roll modifier, defense target score, defense type, Advantage/Disadvantage state, and mathematical hit probability against a designated target unit. When an ability declares `defenseTarget: 'LOWER_DEFENSE'`, the evaluator SHALL compare the target's effective `Evasion` and effective `Resolve` and select the lower value as `targetDefense`, reporting `defenseType` as `'Evasion'` when `Evasion < Resolve` and `'Resolve'` when `Resolve <= Evasion`.

#### Scenario: Evaluating standard attack roll
- **WHEN** an attack roll context is evaluated for an actor against an in-range target without Advantage or Disadvantage
- **THEN** the context reports `finalAdvantage` as `NORMAL` and computes the exact to-hit probability based on single d20 roll math: `p = (21 - needed) / 20` clamped between 5% and 95%

#### Scenario: Evaluating attack roll under Advantage
- **WHEN** an attack roll context is evaluated where Advantage is active and Disadvantage is absent
- **THEN** the context reports `finalAdvantage` as `ADVANTAGE` and computes hit probability as `1 - (1 - p)^2` clamped between 5% and 95%

#### Scenario: Evaluating attack roll under Disadvantage
- **WHEN** an attack roll context is evaluated where Disadvantage is active and Advantage is absent
- **THEN** the context reports `finalAdvantage` as `DISADVANTAGE` and computes hit probability as `p^2` clamped between 5% and 95%

#### Scenario: Advantage and Disadvantage cancel to Normal
- **WHEN** an attack roll context is evaluated where both Advantage and Disadvantage sources are present simultaneously
- **THEN** the context reports `finalAdvantage` as `NORMAL` and computes hit probability using the standard single-die probability `p`

#### Scenario: Evaluating LOWER_DEFENSE selects the lower of Evasion or Resolve
- **WHEN** an attack roll context is evaluated for an ability with `defenseTarget: 'LOWER_DEFENSE'` against a target with `Evasion 10` and `Resolve 15`
- **THEN** the context reports `targetDefense: 10` and `defenseType: 'Evasion'`
- **WHEN** evaluated against a target with `Evasion 14` and `Resolve 11` (or tied `12` vs `12`)
- **THEN** the context reports `targetDefense` equal to effective `Resolve` and `defenseType: 'Resolve'`
