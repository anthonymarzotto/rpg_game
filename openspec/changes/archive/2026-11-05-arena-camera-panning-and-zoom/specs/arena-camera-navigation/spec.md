# Spec Delta: Arena Camera Navigation

## Purpose

Provides smooth freeform camera panning, 1:1 mouse right-drag navigation, keyboard arrow navigation, zoom-aware boundary clamping, and celestial background parallax translation for the tactical combat arena.

## ADDED Requirements

### Requirement: Right-Click Drag-to-Pan Navigation
The combat arena viewport SHALL support freeform camera panning using secondary mouse button interaction (`button === 2`), moving the visible arena viewBox 1:1 with cursor displacement on screen while keeping primary left-click actions completely unimpeded.

#### Scenario: Right-drag moves arena viewport 1:1
- **WHEN** the player presses the right mouse button on the arena canvas and drags the cursor
- **THEN** the arena camera viewBox SHALL translate in the direction of the drag scaled precisely to screen pixels
- **AND** the point beneath the cursor SHALL remain anchored to the cursor position throughout the drag
- **AND** default browser context menus SHALL be suppressed

#### Scenario: Dragging suppresses click actions and targeting cancellation
- **WHEN** a right-click drag exceeds the movement threshold of 5 screen pixels
- **THEN** releasing the right mouse button SHALL NOT trigger ability cancellation or tile selection
- **AND** the cursor SHALL display grabbing feedback during the drag gesture

#### Scenario: Left-click interactions remain unaffected
- **WHEN** the player left-clicks on hex tiles, unit standees, or interface controls
- **THEN** normal tile movement, ability execution, and unit selection SHALL execute immediately without drag-delay thresholds

### Requirement: Dynamic Zoom-Aware Camera Boundary Clamping
The combat arena camera SHALL clamp pan offsets dynamically based on the current field zoom level, preventing the battlefield from drifting out of view while enabling complete edge-to-edge inspection when zoomed in.

#### Scenario: Viewport boundaries at default zoom
- **WHEN** field zoom is at default 1.0x (100%)
- **THEN** camera panning SHALL be restrained within a safe margin of the arena center, keeping the full battlefield perimeter in view

#### Scenario: Expanded pan range when zoomed in
- **WHEN** field zoom is greater than 1.0x (e.g. 1.5x to 1.8x)
- **THEN** maximum horizontal and vertical pan bounds SHALL expand proportionally to the magnification factor
- **AND** allow the player to pan the camera until the outermost hex tiles touch the viewport edges

### Requirement: Keyboard Arrow Key Camera Navigation
The combat arena SHALL allow camera panning via keyboard arrow keys when no text inputs or modal dialogs are focused.

#### Scenario: Arrow keys shift camera viewport
- **WHEN** the player presses the Up, Down, Left, or Right arrow key during combat
- **THEN** the camera viewport SHALL shift by a discrete step (40px) in the corresponding direction within the clamped arena boundaries

#### Scenario: Arrow key navigation suspended during modal or input focus
- **WHEN** an export modal, unit customization dialog, or text input is active
- **THEN** arrow key presses SHALL be processed by the focused input and SHALL NOT pan the arena camera

### Requirement: Camera Viewport Reset Controls
The combat arena testbed bar SHALL provide a unified view reset control that restores both zoom magnification and camera panning to default neutral alignment.

#### Scenario: Resetting camera pan and zoom
- **WHEN** the arena camera is panned away from center or field zoom is not 1.0x
- **THEN** the top bar SHALL display the Reset View button
- **AND** clicking Reset View SHALL restore zoom to 1.0x and camera pan offset to (0, 0)

### Requirement: Astral Sky Background Parallax Pan
The combat arena celestial backdrop layer SHALL translate in coordinated subtle parallax with camera panning, complementing zoom parallax with continuous spatial depth.

#### Scenario: Celestial backdrop shifts subtly with camera pan
- **WHEN** the combat arena camera pans across the battlefield
- **THEN** the procedural astral background layer SHALL translate at a reduced parallax rate (~8% of arena pan offset) in opposite coordinate alignment
- **AND** maintain continuous coverage across viewport edges without exposing unrendered backdrop gaps
