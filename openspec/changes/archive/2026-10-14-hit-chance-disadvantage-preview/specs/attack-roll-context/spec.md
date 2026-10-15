# Spec Delta

## Purpose

Provides unified, authoritative evaluation of attack roll context, hit probability, and Advantage or Disadvantage across combat action resolution, UI targeting previews, and autonomous AI decision heuristics.

## ADDED Requirements

### Requirement: Centralized Attack Roll Context Evaluation
The combat system SHALL evaluate all to-hit parameters through a single authoritative evaluation function that resolves the net attack roll modifier, defense target score, defense type, Advantage/Disadvantage state, and mathematical hit probability against a designated target unit.

#### Scenario: Evaluating standard attack roll
- **WHEN** an attack roll context is evaluated for an actor against an in-range target without Advantage or Disadvantage
- **THEN** the context reports `finalAdvantage` as `NORMAL` and computes the exact to-hit probability based on single d20 roll math: $p = \frac{21 - \text{needed}}{20}$ clamped between 5% and 95%

#### Scenario: Evaluating attack roll under Advantage
- **WHEN** an attack roll context is evaluated where Advantage is active and Disadvantage is absent
- **THEN** the context reports `finalAdvantage` as `ADVANTAGE` and computes hit probability as $1 - (1 - p)^2$ clamped between 5% and 95%

#### Scenario: Evaluating attack roll under Disadvantage
- **WHEN** an attack roll context is evaluated where Disadvantage is active and Advantage is absent
- **THEN** the context reports `finalAdvantage` as `DISADVANTAGE` and computes hit probability as $p^2$ clamped between 5% and 95%

#### Scenario: Advantage and Disadvantage cancel to Normal
- **WHEN** an attack roll context is evaluated where both Advantage and Disadvantage sources are present simultaneously
- **THEN** the context reports `finalAdvantage` as `NORMAL` and computes hit probability using the standard single-die probability $p$

### Requirement: Spatial Lookahead in Roll Context
The attack roll context evaluator SHALL accept optional hypothetical `originCoord` and `targetCoord` parameters to compute elevation deltas, combat arcs, and flanking status accurately during move-and-act simulations without mutating live combat state.

#### Scenario: Projected elevation advantage from destination hex
- **WHEN** an actor evaluates an attack from a hypothetical `originCoord` on a ridge 2 levels above the target's elevation ($dh \ge 2$)
- **THEN** the evaluated context grants Advantage from high ground even if the actor's current position is on flat ground

### Requirement: UI Target Preview and Advantage Indication
The combat target preview system SHALL derive its `toHitChance`, `targetDefense`, and `defenseType` directly from the centralized attack roll context, and SHALL expose the active `rollAdvantage` state for UI display.

#### Scenario: Target preview displays Disadvantage badge
- **WHEN** a player targets an enemy while under Disadvantage (e.g. Challenged by a different unit)
- **THEN** the target preview reports the penalized hit probability and displays a Disadvantage indicator badge
