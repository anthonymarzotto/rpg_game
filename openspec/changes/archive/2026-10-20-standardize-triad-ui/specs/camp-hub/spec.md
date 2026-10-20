# Spec Delta

## MODIFIED Requirements

### Requirement: Active Vanguard Display
The system SHALL display the currently deployed combat squad (1 to 3 units) in the Active Vanguard dock with individual hero cards indicating name, class, current HP, archetype XP progress bars labeled with canonical discipline names (`Force`, `Finesse`, `Focus`), and high-visibility indicators when a level-up threshold is met.

#### Scenario: Displaying deployed heroes
- **WHEN** the player enters Camp with 3 units assigned to `activeSquadIds`
- **THEN** the Active Vanguard dock renders 3 hero cards displaying their corresponding classes, HP, and XP meters labeled Force, Finesse, and Focus

#### Scenario: Level ready notification
- **WHEN** a deployed hero has accumulated XP in any archetype meeting or exceeding their current level threshold
- **THEN** that hero's card displays a prominent `✦ LEVEL READY` callout badge
