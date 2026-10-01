# Campaign Game Loop Specification

## Purpose
Coordinates top-level application navigation across Start Screen, Camp Hub, Combat Arena, victory/defeat reconciliation, and developer testing modes.

## Requirements

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

### Requirement: Combat Victory Transition Hand-off
The system SHALL provide a transition from the Combat Arena victory screen back to Camp that applies campaign victory reconciliation, advances the campaign stage index, and generates the next stage encounter.

#### Scenario: Returning to Camp on victory
- **WHEN** the player completes an encounter with all enemies defeated and clicks `[ Proceed to Camp ]` in the victory screen
- **THEN** in-battle XP is credited to unit `accumulatedXp`, squad HP is fully restored, the stage index advances by 1, and the view switches to Camp Hub

### Requirement: Combat Defeat Transition Hand-off
The system SHALL provide a transition from the Combat Arena defeat screen back to Camp that applies campaign defeat reconciliation, discards in-battle XP from the failed attempt, fully restores squad HP, and preserves the current stage index.

#### Scenario: Retreating to Camp on defeat
- **WHEN** the player's active squad is wiped and the player clicks `[ Retreat to Camp ]` in the defeat screen
- **THEN** the in-battle XP is discarded, squad HP is restored to maximum, the stage index does not change, and the view switches to Camp Hub

### Requirement: Developer Scaffolding Access
The system SHALL provide an unobtrusive navigation toggle allowing developers to bypass the campaign loop and test isolated views such as the Novice Sandbox encounter or raw Constellation Chart.

#### Scenario: Switching to sandbox mode
- **WHEN** a developer selects the sandbox option from the header navigation toggle
- **THEN** the application displays the standalone combat arena sandbox without disrupting the campaign state
