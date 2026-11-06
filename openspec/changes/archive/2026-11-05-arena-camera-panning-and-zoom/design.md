# Design: Arena Camera Panning & Navigation System

## Context

See [proposal.md](proposal.md) for motivation and problem background.

The combat arena uses an SVG element (`.arena-hex-svg`) styled within a flexible container (`.arena-canvas-container`). Zoom is managed dynamically by scaling the SVG `viewBox` width and height (`width = origWidth / zoom`). Prior to this design, the viewBox origin `(x, y)` was hardcoded to `(origX + (origWidth - width)/2, origY + (origHeight - height)/2)`, locking the view to the center.

## Goals / Non-Goals

**Goals:**
- Provide fluid 1:1 right-click mouse drag panning across the arena.
- Retain instantaneous, zero-latency left-click responsiveness for all tile clicks, unit selections, and targeting.
- Provide keyboard arrow key camera panning with safe bounds.
- Dynamically clamp camera panning to zoom-dependent boundaries, preventing the battlefield from drifting out of sight.
- Support instant camera centering on combatants when clicking their chip on the CTB Initiative Ribbon.
- Provide unified view reset restoring zoom to 1.0x and pan to neutral `(0, 0)`.
- Extend the procedural astral backdrop with coordinated parallax panning.

**Non-Goals:**
- Minimap radar overlay or mini-map dragging.
- Touchscreen multi-touch pinch/pan gestures (desktop browser target).
- Free-roaming camera capable of panning into infinite void space.

## Decisions

### Decision 1: Right-Click Drag for Canvas Panning
- **Choice**: Use secondary mouse button (`e.button === 2`) for camera dragging.
- **Rationale**:
  - Left-click is already overloaded with tile movement, targeting, and standee selection. Using left-drag would require a click-versus-drag movement threshold and could cause accidental unit moves or target confirmations.
  - Middle-click is often awkward or uncomfortable on many mouse scroll wheels.
  - Right-click was previously only used to cancel ability targeting back to IDLE. By reserving dragging for right-click and only canceling ability mode if mouse movement was <= 5px, we preserve ability cancellation while gaining a dedicated, conflict-free pan gesture.
- **Alternatives Considered**:
  - *Left-click drag on empty space*: The arena hex field and prism walls fill much of the container; finding empty space to drag is unreliable on large arenas.
  - *Middle-click drag*: Awkward wheel press resistance on many gaming and office mice.

### Decision 2: 1:1 Screen-to-ViewBox Coordinate Translation
- **Choice**: Convert screen pixel deltas to SVG user units using the ratio of viewBox dimensions to container client bounding box:
  ```ts
  const svgDx = -screenDx * (viewBoxWidth / clientRect.width);
  const svgDy = -screenDy * (viewBoxHeight / clientRect.height);
  ```
- **Rationale**: Keeps the point beneath the cursor perfectly anchored throughout the drag gesture, regardless of zoom level (0.6x to 1.8x) or window aspect ratio.

### Decision 3: Dynamic Zoom-Aware Boundary Clamping
- **Choice**:
  ```ts
  const maxPanX = Math.max(0, (origWidth - width) / 2) + 60;
  const maxPanY = Math.max(0, (origHeight - height) / 2) + 60;
  const clampedPanX = Math.max(-maxPanX, Math.min(maxPanX, panX));
  const clampedPanY = Math.max(-maxPanY, Math.min(maxPanY, panY));
  ```
- **Rationale**: At 1.0x zoom, the arena is naturally centered and needs minimal panning. As zoom increases (up to 1.8x), the visible viewBox shrinks and `maxPan` scales proportionally, allowing the player to freely reach every perimeter hex and corner while preventing the battlefield from drifting away.

### Decision 4: Centering on Combatants via Initiative Ribbon
- **Choice**: When a player clicks a chip in `InitiativeRibbon`, invoke an `onCenterUnit(coord)` callback that converts the unit's hex coordinate to projected screen coordinates (`hexToPixel` + `projectElevationY`) and sets `panOffset = clamp(targetPixel - origCenter)`.
- **Rationale**: Naturally complements pinning the unit's status card. When inspecting a combatant in the turn queue, the player immediately sees where they are positioned on the field.

### Decision 5: Parallax Pan in Celestial Backdrop
- **Choice**: Extend `computeBackgroundTransform(config, fieldZoom, panOffset)` to incorporate a subtle translation:
  ```ts
  const panXPercent = -(panOffset.x / 1000) * 8;
  const panYPercent = -(panOffset.y / 1000) * 8;
  ```
- **Rationale**: Matches the existing zoom parallax (`fieldZoom * 0.15`), giving the astral sky a realistic sense of celestial depth behind the hex field.

## Risks / Trade-offs

- **[Context Menu Suppression]** → Right-clicking normally triggers native browser context menus.
  *Mitigation*: Call `e.preventDefault()` on both `onContextMenu` and `onMouseDown` for secondary clicks, and only trigger ability cancellation if the user released without dragging (displacement <= 5px).
- **[Keyboard Shortcut Collisions]** → Arrow keys could scroll the page or interfere with inputs.
  *Mitigation*: Check `document.activeElement` and ignore keydown events if the focused element is an `INPUT`, `TEXTAREA`, or inside a modal dialog. Call `e.preventDefault()` for arrow keys when the arena canvas is active to prevent page scrolling.
