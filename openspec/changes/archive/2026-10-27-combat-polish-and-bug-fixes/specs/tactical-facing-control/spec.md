# Spec Delta: tactical-facing-control

## MODIFIED Requirements

### Requirement: Directional Chevron Interaction and Visual Feedback
The hex arena presentation SHALL render a 6-chevron compass ring around the active unit token in a dedicated top-level visual overlay layer rendered above all unit tokens and pedestals, ensuring directional chevrons and their hit targets are never obscured or occluded by adjacent unit standees. The currently active facing chevron SHALL be visually highlighted, and clicking any directional chevron SHALL immediately commit the new facing orientation.

#### Scenario: Selecting a directional chevron updates facing
- **WHEN** the player clicks one of the 6 compass chevrons
- **THEN** the unit's facing immediately updates to that direction, the unit token sprite rotates to match, and the clicked chevron becomes the active highlighted chevron

#### Scenario: Board tiles outside chevrons do not trigger facing turns
- **WHEN** the compass is active and the player clicks an adjacent or distant board hex rather than a chevron
- **THEN** the compass dismisses without altering the unit's facing

#### Scenario: Compass chevrons render above adjacent unit standees
- **WHEN** the compass ring is active on a unit that is positioned adjacent to or behind other living units on the battlefield
- **THEN** all 6 directional chevrons render in front of adjacent unit sprites and pedestals without visual clipping
