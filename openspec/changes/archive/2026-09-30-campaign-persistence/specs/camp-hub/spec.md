# Spec Delta: Camp Hub

## ADDED Requirements

### Requirement: Manual Campaign Save
The system SHALL provide a manual save action in the Camp Hub header that persists the current campaign state to its bound save slot with immediate visual confirmation.

#### Scenario: Saving campaign from Camp Hub
- **WHEN** the player clicks `[ ✦ Save ]` in the Camp Hub header
- **THEN** the active campaign state is committed to its assigned save slot in IndexedDB

#### Scenario: Save visual feedback
- **WHEN** the save action successfully completes
- **THEN** the button displays a temporary `✦ Saved!` visual confirmation state
