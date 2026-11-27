# Spec Delta

## MODIFIED Requirements

### Requirement: Reserve Barracks Tray and Filtering
The system SHALL display all roster units not currently in the active vanguard within a reserve barracks tray (Campfire Commons) arranged as a responsive vertically-wrapping grid with vertical scrolling, supporting uncapped roster scaling and filter toggles for category viewing.

#### Scenario: Viewing reserve units
- **WHEN** the player has units in the campaign roster who are not in `activeSquadIds`
- **THEN** those units appear as hero cards in the reserve barracks tray

#### Scenario: Filtering reserve roster
- **WHEN** the player selects a filter such as `Level Ready` or a specific class tag
- **THEN** the reserve barracks tray displays only the units matching the selected filter criteria

#### Scenario: Wrapping and vertically scrolling large reserve rosters
- **WHEN** the reserve roster contains more Wayfarers than fit across a single row
- **THEN** the mini cards wrap across multiple rows in a vertical grid and scroll vertically rather than horizontally
