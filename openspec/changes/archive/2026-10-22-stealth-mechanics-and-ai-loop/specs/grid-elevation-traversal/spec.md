# Spec Delta: Grid Elevation Traversal

## ADDED Requirements

### Requirement: Front-Arc Detection and Movement Interruption
The movement execution engine SHALL evaluate the active unit's 3-hex `FRONT` combat arc (relative directions 0, 1, and 5 at range 1) after each individual hex step along a planned movement path. If an opposing unit possessing the `STEALTH` condition is located in any of the active unit's 3 frontal hexes, the movement engine SHALL immediately halt further movement at the current step tile, remove the `STEALTH` condition from the detected unit, and log a detection combat event. The detected unit SHALL NOT be rotated and SHALL preserve its current facing. The move action SHALL conclude at the interruption tile, consuming 1 Action Point. Allied stealthed units SHALL NOT trigger detection or movement interruption.

#### Scenario: Movement step into line-of-sight detects stealthed enemy and halts movement
- **WHEN** an active unit executes a multi-hex movement path and steps into a hex where an opposing stealthed unit is within range 1 in the unit's `FRONT` combat arc
- **THEN** the active unit halts movement at that step hex without traversing the remaining path steps
- **THEN** the opposing unit's `STEALTH` condition is removed
- **THEN** the opposing unit's facing is unchanged
- **THEN** the move action completes, consuming 1 Action Point

#### Scenario: Moving with stealthed enemy in flank or rear arc does not halt movement
- **WHEN** an active unit executes a movement path that passes adjacent to an opposing stealthed unit, but the stealthed unit is positioned in the active unit's `FLANK` or `REAR` combat arc
- **THEN** detection is not triggered and the active unit completes its full planned path
- **THEN** the stealthed unit retains `STEALTH`

#### Scenario: Allied stealthed units do not interrupt movement
- **WHEN** an active unit steps into a hex where an allied stealthed unit is within range 1 in the active unit's `FRONT` combat arc
- **THEN** the allied unit remains stealthed and movement is not interrupted
