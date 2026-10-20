# Spec Delta

## Purpose

Provides interactive bidirectional hover highlighting between initiative queue chips and hex battlefield combatants, transient unit status card inspection, and an optimized, spaced timeline ribbon layout with prominent turn order indicators.

## ADDED Requirements

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
The combat status overlay card SHALL temporarily preview the vitals, defenses, and conditions of any hovered combatant.

#### Scenario: Hovering timeline chip previews unit in status card
- **WHEN** the player hovers over an initiative chip on the timeline ribbon
- **THEN** the `UnitStatusCard` SHALL display the hovered unit's current HP, maximum HP, defense attributes (EVA, RES, ARM, WRD, MOV, SPD), CTB gauge, and active conditions

#### Scenario: Hover ends and view reverts to active or pinned unit
- **WHEN** the cursor leaves the timeline chip or battlefield unit
- **THEN** the `UnitStatusCard` SHALL immediately revert to displaying the pinned unit if one is selected, or the currently active unit otherwise

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
