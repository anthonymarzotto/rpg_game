# Spec Delta

## ADDED Requirements

### Requirement: In-Combat Character Card XP Gain Tracker
The combat status overlay card SHALL display an inline XP progression tracker for player units showing projected totals, current battle gains, next level threshold, and ascension readiness across Force, Finesse, and Focus attributes.

#### Scenario: Active player unit displays projected totals and inline gains
- **WHEN** the combat status overlay renders the active player combatant card
- **THEN** the card SHALL display the unit's projected XP for Force, Finesse, and Focus attributes using compact abbreviations (`FRC`, `FIN`, `FOC`), calculated as baseline accumulated XP plus current in-battle XP
- **AND** any attribute with in-battle XP greater than zero SHALL display an inline battle gain badge formatted as `(+N)`
- **AND** any attribute with zero in-battle XP SHALL omit the `(+0)` indicator

#### Scenario: Display next level XP threshold
- **WHEN** the XP progression tracker renders for a unit below the maximum level cap
- **THEN** the section header SHALL display the required XP threshold for the unit's next level
- **AND** when the unit has reached the maximum level cap, the header SHALL display `MAX` with no numeric threshold

#### Scenario: Ascension threshold reached highlight
- **WHEN** a unit's projected total XP in an attribute meets or exceeds the required threshold for their next level
- **THEN** the attribute entry SHALL display an astral gold highlight and an ascension ready glyph `✦`
- **AND** provide tooltip text confirming the attribute qualifies for ascension in Camp

#### Scenario: Inspected allied unit displays XP tracker
- **WHEN** the player hovers over an allied combatant on the hex battlefield or CTB initiative ribbon
- **THEN** the inspected unit card SHALL display the allied unit's XP progression tracker with their projected totals, battle gains, and threshold readiness

#### Scenario: Hostile and non-player units omit XP tracker
- **WHEN** the active unit or inspected unit belongs to an enemy or non-player faction
- **THEN** the status card SHALL NOT render the XP progression tracker
