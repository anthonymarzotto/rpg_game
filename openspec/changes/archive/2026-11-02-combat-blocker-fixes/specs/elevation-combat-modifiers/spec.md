# Spec Delta: Elevation Combat Modifiers

## MODIFIED Requirements

### Requirement: Vertical Attack Roll Modifiers
The combat attack roll resolver SHALL adjust to-hit calculations based on the elevation difference between attacker and target. Attacking downward across $\Delta h = 1$ SHALL grant a $+2$ bonus to the attack roll. Attacking downward across $\Delta h \ge 2$ SHALL grant Advantage on the d20 attack roll. Attacking upward across $\Delta h = -1$ SHALL inflict a $-2$ penalty on the attack roll. Attacking upward across $\Delta h \le -2$ SHALL inflict Disadvantage on the d20 attack roll.

The attack roll evaluation system SHALL expose a structured attribution breakdown of all constituent bonuses and penalties contributing to the net roll modifier (including base attribute bonus, elevation modifier delta and description, aura penalties, and active conditions), allowing the combat interface and combat log to present transparent calculations to the player.

#### Scenario: Downward attack across 1 level grants +2 attack roll bonus
- **WHEN** an attacker at elevation 1 executes an attack against a target at elevation 0
- **THEN** the attack roll receives a +2 modifier from elevation

#### Scenario: Downward attack across 2 or more levels grants Advantage
- **WHEN** an attacker at elevation 2 executes an attack against a target at elevation 0
- **THEN** the attack roll is made with Advantage

#### Scenario: Upward attack across 1 level suffers -2 attack roll penalty
- **WHEN** an attacker at elevation 0 executes an attack against a target at elevation 1
- **THEN** the attack roll receives a -2 modifier from elevation

#### Scenario: Upward attack across 2 or more levels suffers Disadvantage
- **WHEN** an attacker at elevation 0 executes an attack against a target at elevation 2
- **THEN** the attack roll is made with Disadvantage

#### Scenario: Advantage and Disadvantage cancel to Normal roll
- **WHEN** an attacker has both Advantage (such as attacking from high ground $\Delta h \ge 2$) and Disadvantage (such as being under the Challenged condition targeting another unit)
- **THEN** the d20 attack roll resolves as a Normal roll without Advantage or Disadvantage

#### Scenario: Vertical modifier attribution exposed in attack roll context
- **WHEN** an attacker at elevation 0 attacks an enemy at elevation 1 with a base Finesse attribute of +2
- **THEN** the attack roll context and breakdown records an elevation penalty component of -2 (`Low Ground (-2)`) alongside the base attribute component of +2
- **AND** the net modifier evaluates to 0 while preserving the underlying component attributions
