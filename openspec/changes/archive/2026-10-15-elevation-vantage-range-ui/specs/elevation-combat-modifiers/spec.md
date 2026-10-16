# Spec Delta

## MODIFIED Requirements

### Requirement: Ranged Elevation Vantage
The ability validation and range evaluation system SHALL extend the effective range of ranged attacks (abilities with base range $\ge 2$) launched from higher ground ($\Delta h \ge +1$) by $+1$ hex per elevation level: $\text{effectiveRange} = \text{baseRange} + \max(0, h_{\text{actor}} - h_{\text{target}})$. Ranged attacks launched from flat ground ($\Delta h = 0$) or lower elevation ($\Delta h \le -1$) SHALL NOT receive range extensions. The combat interface and tactical decision system SHALL evaluate this per-tile elevation vantage when projecting active ability range hexes and discovering candidate targets across the arena grid, displaying range highlights and candidate target reticles for all valid tiles and units within extended reach.

#### Scenario: Ranged attack from elevated ridge gains bonus range
- **WHEN** an actor at elevation 2 executes a range 2 attack against a target at elevation 0
- **THEN** the effective range of the attack SHALL be 4 hexes

#### Scenario: Flat ground or upward ranged attack does not extend range
- **WHEN** an actor at elevation 0 targets an enemy at elevation 1 or 0 with a range 2 attack
- **THEN** the effective range of the attack SHALL remain 2 hexes

#### Scenario: High ground vantage projects extended range tiles and candidate reticles in UI
- **WHEN** a player-controlled unit situated at elevation 2 selects a range 3 ability (such as `Spark` or `Arcane Blast`)
- **THEN** the arena grid displays ability range field highlighting on tiles up to distance 5 on elevation 0 ground
- **THEN** any enemy unit standing at distance 4 or 5 on elevation 0 is identified as a candidate target and displays a target candidate reticle

### Requirement: Melee Elevation Reach Constraints
The ability validation system SHALL restrict melee attacks (abilities with base range $\le 1$) to adjacent hexes where the absolute elevation difference is at most 1 ($|\Delta h| \le 1$). If the elevation difference between attacker and target is 2 or greater ($|\Delta h| \ge 2$), the system SHALL reject the ability execution as out of reach unless the actor possesses a trait that ignores elevation penalties. The combat interface SHALL exclude adjacent tiles that exceed this vertical reach limit from the ability range highlight field. Melee attacks directed downward across $\Delta h = 1$ SHALL receive the standard downward $+2$ attack roll bonus.

#### Scenario: Melee attack across 1 level elevation step is permitted
- **WHEN** an attacker at elevation 0 targets an adjacent enemy at elevation 1 with a melee strike
- **THEN** the ability validation SHALL succeed and allow execution

#### Scenario: Melee attack across 2 levels elevation difference is rejected
- **WHEN** an attacker at elevation 0 targets an adjacent enemy at elevation 2 with a melee strike (or elevation 2 strikes downward at elevation 0)
- **THEN** the ability validation SHALL fail with an error indicating the target is vertically out of reach

#### Scenario: Downward melee strike inherits +2 attack roll bonus
- **WHEN** an attacker at elevation 1 strikes an adjacent enemy at elevation 0 with a melee strike
- **THEN** the strike is permitted and gains a +2 attack roll bonus

#### Scenario: Adjacent tiles exceeding vertical reach are excluded from melee range highlight
- **WHEN** an attacker situated at elevation 2 without elevation-ignoring passives selects a melee ability
- **THEN** adjacent hexes at elevation 0 ($|\Delta h| = 2$) are excluded from the ability range highlight field

## ADDED Requirements

### Requirement: Elevation Vantage Preview Feedback
The tactical target preview system SHALL project elevation vantage metadata when a unit targets or inspects an enemy from higher ground. When an attacker on high ground ($\Delta h \ge 1$) targets an enemy with a ranged ability that benefits from range extension, the target preview HUD SHALL display an elevation vantage indicator documenting the additional range granted (e.g. `✦ Vantage (+X Range)`).

#### Scenario: Target preview displays vantage indicator on downward ranged attack
- **WHEN** a player hovers or selects an enemy unit on lower elevation with an active ranged ability
- **THEN** the target preview card header displays a vantage badge indicating the bonus range (`✦ Vantage (+X Range)`)
- **THEN** hit chance calculations reflect applicable elevation attack roll modifiers or Advantage
