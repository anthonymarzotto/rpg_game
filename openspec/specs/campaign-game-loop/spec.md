# Campaign Game Loop Specification

## Purpose
Coordinates top-level application navigation across Start Screen, Camp Hub, Combat Arena, victory/defeat reconciliation, and developer testing modes.

## Requirements

### Requirement: Start Screen Navigation
The system SHALL provide a root Start Screen presenting options to begin a new campaign expedition or continue an existing campaign.

#### Scenario: Starting a new game
- **WHEN** the player clicks `[ New Game ]` on the Start Screen
- **THEN** a new campaign state is created with initial starter Novices and the system transitions to the Camp Hub

#### Scenario: Continue game placeholder
- **WHEN** the player views the Start Screen
- **THEN** `[ Continue ]` is presented in a disabled state indicating that persistent client saves unlock in Phase 3.3

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
