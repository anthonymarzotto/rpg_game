## MODIFIED Requirements

### Requirement: Combatants roll randomized initial initiative gauge on encounter initialization
The system SHALL initialize each combat unit's `initiativeGauge` with an integer value rolled from a 1d20 die (1-20) when constructing a new combat state container. Interactive combat sessions SHALL share a single trial-scoped seeded dice roller across opening initiative, normal-mode player actions, and all hostile AI turns so the PRNG stream progresses continuously across the encounter and never resets between turns.

#### Scenario: All combatants receive initial non-zero initiative gauge
- **WHEN** a new combat encounter state is created via `createCombatState`
- **THEN** every participating player and enemy combatant SHALL have an `initiativeGauge` between 1 and 20 (inclusive) prior to initial clock advancement

#### Scenario: Deterministic initiative rolls with seeded roller
- **WHEN** `createCombatState` is invoked with a seeded dice roller
- **THEN** the initial initiative rolls SHALL be completely deterministic and reproducible across retries with the same seed

#### Scenario: Interactive combat shares a single seeded roller across turns
- **WHEN** an interactive combat encounter initializes opening initiative, resolves normal player attacks, and sequences multiple hostile AI turns
- **THEN** all non-overridden d20 and damage rolls SHALL draw sequentially from the same trial-scoped seeded dice roller without resetting the PRNG seed on consecutive enemy turns

