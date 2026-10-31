# Spec Delta

## ADDED Requirements

### Requirement: Combat Log Attack and Damage Presentation
The combat chronicle SHALL format attack check rolls with single spaced operators and present critical hit damage breakdowns with explicit labels distinguishing the maximized base value from the rolled dice.

#### Scenario: Attack roll d20 modifier formatting
- **WHEN** an attack check roll is recorded in the combat log or displayed in the attack card roll chip
- **THEN** both positive and negative modifiers SHALL use single spaced operators (e.g. `16 + 1` or `20 - 2`)
- **AND** double sign notations such as `20+-2` SHALL NOT be displayed

#### Scenario: Critical hit damage breakdown notation
- **WHEN** a damaging attack scores a critical hit
- **THEN** the damage breakdown string SHALL format the dice section with explicit labels as `[Crit: <maxVal> max + <rolledDice> roll]`
- **AND** append attribute modifiers with spaced signs (e.g. `+ 3`) before mitigation subtraction

### Requirement: Chronological Causal Logging and Challenge Defiance Cards
The combat log SHALL log actor attack actions prior to reactive condition triggers and render challenge defiance as a distinct condition card.

#### Scenario: Attack actions precede reactive condition defiance
- **WHEN** an attacker with an active `CHALLENGED` condition attacks a unit other than its designated challenger
- **THEN** the attack execution log entry SHALL be recorded before the condition defiance entry in the combat log

#### Scenario: Challenge defiance card rendering
- **WHEN** a combat log entry records that a unit defied a challenge and became `EXPOSED`
- **THEN** the log panel SHALL render a dedicated card displaying a `⚔️ CHALLENGE DEFIED` badge and warning context note
