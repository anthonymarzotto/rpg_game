# Spec Delta: Campaign Game Loop

## MODIFIED Requirements

### Requirement: Start Screen Navigation
The system SHALL provide a root Start Screen presenting options to begin a new campaign expedition across 3 save slots, resume existing saved expeditions, or manage archives via export/import.

#### Scenario: Starting a new game
- **WHEN** the player clicks `[ New Astral Expedition ]` on the Start Screen with at least one open save slot
- **THEN** a new campaign is initialized in the first available slot and the system transitions to the Camp Hub with that slot actively bound

#### Scenario: Continue game placeholder
- **WHEN** all 3 save slots are empty and the player views the Start Screen
- **THEN** `[ Resume Expedition ]` is presented in a disabled state indicating no saved expeditions exist to resume

#### Scenario: Starting a new game when all slots are full
- **WHEN** all 3 save slots are occupied
- **THEN** `[ New Astral Expedition ]` is disabled and guidance prompts the player to manage or delete an existing slot

#### Scenario: Resuming an existing campaign
- **WHEN** at least one save slot is occupied and the player clicks `[ Resume Expedition ]`
- **THEN** the slot selection drawer opens displaying occupied slots with sector, squad, and win/loss stats, allowing the player to resume their chosen expedition

#### Scenario: Managing archives on Start Screen
- **WHEN** the player views the save slots in the archives drawer
- **THEN** the player can export an occupied slot as a JSON file, import a valid JSON save into an empty slot, or delete an existing slot
