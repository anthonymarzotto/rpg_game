# Arena & Timeline UX Specification

## Purpose

Provides interactive bidirectional hover highlighting between initiative queue chips and hex battlefield combatants, transient unit status card inspection, and an optimized, spaced timeline ribbon layout with prominent turn order indicators.

## Requirements

### Requirement: Bidirectional Hover Highlight
The system SHALL support bidirectional hover highlighting between the CTB initiative ribbon and units on the hex battlefield.

#### Scenario: Hovering timeline chip highlights battlefield combatant
- **WHEN** the player hovers their cursor over an initiative chip on the timeline ribbon
- **THEN** the corresponding unit on the hex battlefield SHALL display an astral hover highlight halo (cyan for allies, crimson for hostiles) around their pedestal base and token standee
- **AND** the combatant name plate SHALL be highlighted in bright white

#### Scenario: Hovering battlefield combatant highlights all corresponding timeline chips
- **WHEN** the player hovers their cursor over a combatant's tile or standee on the hex battlefield
- **THEN** all projected turn chips belonging to that combatant across the lookahead queue SHALL display the highlighted state with an animated spring lift and a glowing aura

#### Scenario: Camera viewport remains stationary on hover
- **WHEN** a player hovers over any timeline chip or battlefield unit
- **THEN** the camera viewport SHALL NOT automatically pan or re-center, maintaining stable visual anchoring

### Requirement: Transient Unit Status Preview on Hover
The combat status overlay card SHALL temporarily preview the vitals, defenses, and conditions of any hovered combatant, and support locking the preview into a persistent pinned inspection card upon selection.

#### Scenario: Hovering timeline chip previews unit in status card
- **WHEN** the player hovers over an initiative chip on the timeline ribbon
- **THEN** the `UnitStatusCard` SHALL display the hovered unit's current HP, maximum HP, defense attributes (EVA, RES, ARM, WRD, MOV, SPD), CTB gauge, and active conditions

#### Scenario: Hover ends and view reverts to active or pinned unit
- **WHEN** the cursor leaves the timeline chip or battlefield unit
- **THEN** the `UnitStatusCard` SHALL immediately revert to displaying the pinned unit if one is selected, or the currently active unit otherwise

#### Scenario: Clicking unit or timeline chip in IDLE mode pins inspection card
- **WHEN** the player clicks any allied or hostile combatant on the hex battlefield or their chip in the timeline ribbon while in `IDLE` action mode
- **THEN** the system SHALL set that combatant as the pinned unit
- **AND** the inspection card SHALL remain persistently displayed under the active unit card even as the cursor moves across the screen
- **AND** the pinned unit on the battlefield SHALL display a distinct selection ring

#### Scenario: Dismissing pinned unit card
- **WHEN** the player clicks an empty tile on the battlefield, clicks the active unit, presses the `Escape` key, or clicks the close button on the pinned card
- **THEN** the system SHALL clear the pinned unit and unpin the inspection card

#### Scenario: Pinned inspection card displays active skill loadout and AP
- **WHEN** a combatant is pinned in the inspection card
- **THEN** the card SHALL display the combatant's remaining AP and CTB gauge
- **AND** the card SHALL display their equipped active ability loadout, including ability name, AP cost, reach/range, and short description

#### Scenario: Entering an action mode clears or suspends pinned card
- **WHEN** the player initiates a `MOVE` action or selects an `ABILITY` to enter targeting mode
- **THEN** the pinned inspector card SHALL yield the secondary card slot to the targeting or movement preview

### Requirement: Streamlined Initiative Ribbon Layout and Turn Order Display
The CTB initiative ribbon SHALL present a minimalist queue anchor, spaced turn chips, and prominent turn order numerals.

#### Scenario: Minimalist queue anchor
- **WHEN** the combat arena renders the initiative ribbon
- **THEN** the ribbon SHALL display a compact hourglass icon anchor `⏳` with tooltip rather than a verbose text header, maximizing available horizontal layout width

#### Scenario: Expanded chip spacing and label width
- **WHEN** initiative chips are rendered in the queue track
- **THEN** chips SHALL be spaced with at least `14px` gap and unit labels SHALL have a minimum width of `56px` to prevent truncation of character names

#### Scenario: Prominent turn order badges
- **WHEN** turn order chips are displayed along the ribbon
- **THEN** the currently active unit SHALL display a `NOW` badge
- **AND** all subsequent upcoming turns SHALL display their ordinal turn order number (`2`, `3`, `4`...) in prominent, high-contrast badges

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

### Requirement: Smart Condition Badges and Rich Tooltips
The system SHALL present active condition badges with clear source attribution and rule mnemonics, and provide instant rich in-engine tooltips on hover.

#### Scenario: Condition badge displays source attribution and effect reminder
- **WHEN** an active condition badge is rendered in a status card or target preview card
- **THEN** the badge SHALL include the condition icon, duration in turns, and attribution indicating the source unit (e.g. `by Garrick`)
- **AND** conditions with tactical penalties or benefits (such as `CHALLENGED` or `EXPOSED`) SHALL display a compact effect reminder (e.g. `Disadv` or `+Adv`)

#### Scenario: Hovering condition badge displays instant rich tooltip
- **WHEN** the player hovers over an active condition badge or stat modifier in the active unit card, pinned card, or timeline ribbon
- **THEN** the system SHALL display an instant, styled in-engine floating tooltip detailing the condition title, duration, source unit, and full mechanical rules without native browser tooltip delay

#### Scenario: Hovering standee status bubble on hex arena displays condition tooltip
- **WHEN** the player hovers their cursor over the status icon bubble above a combatant's standee on the hex battlefield
- **THEN** the system SHALL display the rich condition tooltip directly in the arena viewport adjacent to the combatant

### Requirement: Tactical Targeting Cancellation via Right-Click
The system SHALL allow players to cancel ability targeting and return to neutral idle mode via secondary mouse interaction.

#### Scenario: Right-clicking cancels ability targeting mode
- **WHEN** the player right-clicks anywhere within the hex arena viewport while in `ABILITY` targeting mode
- **THEN** the system SHALL cancel targeting and revert the action mode to `IDLE`
- **AND** suppress the default browser context menu
