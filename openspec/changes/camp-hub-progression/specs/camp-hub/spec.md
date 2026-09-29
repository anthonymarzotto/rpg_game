# Spec Delta

## Purpose
Provides the tactical Camp Hub interface, Active Vanguard dock, Reserve Barracks tray, Smart Two-Way unit swapping, novice recruitment, and expedition reconnaissance.

## ADDED Requirements

### Requirement: Active Vanguard Display
The system SHALL display the currently deployed combat squad (1 to 3 units) in the Active Vanguard dock with individual hero cards indicating name, class, current HP, archetype XP progress bars, and high-visibility indicators when a level-up threshold is met.

#### Scenario: Displaying deployed heroes
- **WHEN** the player enters Camp with 3 units assigned to `activeSquadIds`
- **THEN** the Active Vanguard dock renders 3 hero cards displaying their corresponding classes, HP, and XP meters

#### Scenario: Level ready notification
- **WHEN** a deployed hero has accumulated XP in any archetype meeting or exceeding their current level threshold
- **THEN** that hero's card displays a prominent `✦ LEVEL READY` callout badge

### Requirement: Reserve Barracks Tray and Filtering
The system SHALL display all roster units not currently in the active vanguard within a reserve barracks tray, supporting uncapped roster scaling and filter toggles for category viewing.

#### Scenario: Viewing reserve units
- **WHEN** the player has units in the campaign roster who are not in `activeSquadIds`
- **THEN** those units appear as hero cards in the reserve barracks tray

#### Scenario: Filtering reserve roster
- **WHEN** the player selects a filter such as `Level Ready` or a specific class tag
- **THEN** the reserve barracks tray displays only the units matching the selected filter criteria

### Requirement: Smart Two-Way Unit Swapping
The system SHALL support moving units between the reserve tray and active squad: allowing 1-click deployment into open slots when fewer than 3 units are active, allowing units to be benched if at least 1 hero remains active, and supporting direct 1-click slot replacement when the active squad is full.

#### Scenario: Deploying into an empty slot
- **WHEN** the active squad contains fewer than 3 heroes and the player clicks `[ Deploy ]` on a reserve hero
- **THEN** the reserve hero is appended to `activeSquadIds` and appears in the vanguard dock

#### Scenario: Benching an active hero
- **WHEN** the active squad contains 2 or 3 heroes and the player clicks `[ Bench ]` on an active hero
- **THEN** the unit is removed from `activeSquadIds` and returns to the reserve barracks tray

#### Scenario: Direct slot replacement when full
- **WHEN** the active squad contains 3 heroes, the player initiates swap mode on an active hero slot, and clicks a replacement hero in the reserve
- **THEN** the incoming reserve hero replaces the outgoing hero in `activeSquadIds`

### Requirement: Novice Recruitment
The system SHALL allow players to recruit a fresh Level-0 Novice into the campaign roster from the reserve barracks tray.

#### Scenario: Recruiting a new novice
- **WHEN** the player clicks `[ + Recruit Novice ]` in the reserve barracks tray
- **THEN** a new Level-0 Novice unit with generated starter attributes and zeroed XP is appended to the campaign roster and appears in the reserve

### Requirement: Expedition Reconnaissance and Deployment
The system SHALL display the pending stage encounter information in an Expedition War Room panel, including stage index, threat budget rating, detected enemy unit token chips and classes, and a deployment action that initiates tactical combat with the active squad.

#### Scenario: Viewing stage intel
- **WHEN** the player views the Expedition War Room in Camp
- **THEN** the panel displays the current stage name, threat rating, and visual token chips for each enemy in `currentEncounter.units`

#### Scenario: Deploying active squad to combat
- **WHEN** the player clicks `[ DEPLOY SQUAD ]` with at least 1 active unit assigned
- **THEN** the application transitions from Camp into the Tactical Combat Arena with the active squad and pre-generated encounter
