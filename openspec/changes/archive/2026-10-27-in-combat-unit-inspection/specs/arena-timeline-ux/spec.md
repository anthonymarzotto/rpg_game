# Spec Delta: Arena & Timeline UX

## MODIFIED Requirements

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

## ADDED Requirements

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
