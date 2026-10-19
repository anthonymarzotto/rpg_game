# Tactical Facing Control Specification

## Purpose
Enables tactical post-move facing reorientation in combat, allowing player units to adjust their defensive arc for 0 AP immediately after moving via an intuitive 6-direction compass ring.

## Requirements

### Requirement: Zero-AP Facing Orientation Resolution
The combat resolution engine SHALL allow the active unit to update their directional facing orientation to any valid hex direction ($0 \le \text{facing} \le 5$) for 0 AP cost during their active turn.

#### Scenario: Successful facing orientation update
- **WHEN** an active unit executes a set-facing action to a specified hex direction during their turn
- **THEN** the unit's facing orientation is updated to that direction, 0 AP is deducted, and combat arcs evaluate relative to the new orientation

#### Scenario: Inactive unit cannot change facing
- **WHEN** a facing change is requested for a unit whose turn is not currently active
- **THEN** the action is rejected and the unit's facing remains unchanged

### Requirement: Post-Move Facing Compass Lifecycle
The combat interaction system SHALL activate a directional facing compass immediately upon completion of a move action by the active player unit. The compass SHALL remain visible and interactive until dismissed by player action.

#### Scenario: Compass activates on move completion
- **WHEN** an active player unit successfully completes a move action to a destination hex
- **THEN** the unit's facing defaults to the movement vector and the 6-direction compass ring appears around the unit

#### Scenario: Compass dismisses on subsequent action selection
- **WHEN** the player selects an ability, clicks Move to move again, clicks End Turn, or clicks an empty hex tile outside the compass
- **THEN** the compass ring is dismissed, leaving the unit's current facing locked in place

### Requirement: Directional Chevron Interaction and Visual Feedback
The hex arena presentation SHALL render a 6-chevron compass ring around the active unit token. The currently active facing chevron SHALL be visually highlighted, and clicking any directional chevron SHALL immediately commit the new facing orientation.

#### Scenario: Selecting a directional chevron updates facing
- **WHEN** the player clicks one of the 6 compass chevrons
- **THEN** the unit's facing immediately updates to that direction, the unit token sprite rotates to match, and the clicked chevron becomes the active highlighted chevron

#### Scenario: Board tiles outside chevrons do not trigger facing turns
- **WHEN** the compass is active and the player clicks an adjacent or distant board hex rather than a chevron
- **THEN** the compass dismisses without altering the unit's facing
