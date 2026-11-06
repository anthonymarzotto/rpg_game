# Proposal: Arena Camera Panning, Scrolling & Unit Centering

## Why

Currently in tactical combat, the SVG arena viewBox is strictly pinned to the geometric center of the battlefield. When zooming in past 1.0x (up to 1.8x), the perimeter tiles, cliffs, and combatants are cropped outside the visible viewport with no way to pan or scroll the battlefield. This restricts tactical awareness and prevents players from inspecting or targeting units on the battlefield flanks. Introducing freeform camera panning, keyboard navigation, and unit centering solves this problem and makes battlefield exploration tactile and fluid.

## What Changes

- **Right-Click Drag Navigation**: Secondary mouse button (`button === 2`) now acts as a dedicated drag-to-pan gesture across the arena canvas, moving the SVG viewBox 1:1 with the mouse cursor.
- **Conflict-Free Tile Interaction**: Primary left-click remains 100% responsive for tile clicks, movement, and ability targeting without drag-threshold delays.
- **Keyboard Arrow Key Panning**: Arrow keys (Up, Down, Left, Right) smoothly pan the arena camera by configurable increments (40px) when not interacting with text inputs.
- **Zoom-Aware Camera Bounding**: Panning extents dynamically adapt to the current zoom level, ensuring the camera cannot drift off into the void while allowing full edge-to-edge inspection when zoomed in.
- **Initiative Ribbon Unit Centering**: Clicking a combatant chip in the CTB Initiative Ribbon pins their status card and centers the camera viewport on their hex position.
- **View Reset Controls**: The top bar's reset button now restores both zoom to 1.0x and camera pan to the default center `(0, 0)`.
- **Astral Parallax Pan**: The procedural starry background translates subtly (~8% rate) in coordination with camera panning, complementing the existing zoom parallax with deep 2.5D visual perspective.
- **Semantic Version Bump**: Requires a minor version bump from `0.11.0` to `0.12.0` due to new backwards-compatible player-facing tactical UI navigation capabilities.

## Capabilities

### New Capabilities
- `arena-camera-navigation`: Implements viewport panning, 1:1 cursor coordinate translation, keyboard navigation, dynamic boundary clamping, unit hex centering, and backdrop parallax translation for the combat arena.

### Modified Capabilities
- `arena-timeline-ux`: Enhances secondary mouse interaction so right-click dragging pans the camera without erroneously canceling ability targeting if moved, and enhances initiative ribbon chip selection to center the camera on the selected combatant.

## Impact

- **Affected Files**:
  - `src/ui/combat/CombatArena.tsx`: Camera pan state, mouse drag listeners, keyboard arrow key listeners, unit centering callbacks, and reset controls.
  - `src/ui/combat/HexGridSvg.tsx`: ViewBox calculation incorporating pan offset with zoom-aware clamping.
  - `src/ui/combat/InitiativeRibbon.tsx`: Support for unit centering invocation when chips are clicked.
  - `src/ui/combat/arenaBackground.ts`: Extend background transform with subtle parallax pan translation.
  - `src/ui/combat/CombatArena.css`: Grab / grabbing cursor styling for canvas panning.
- **Dependencies & APIs**: No external dependencies added. Uses native SVG viewBox manipulation and standard DOM mouse/keyboard events.
