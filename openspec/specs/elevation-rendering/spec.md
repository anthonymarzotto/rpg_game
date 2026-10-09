# Elevation Rendering Specification

## Purpose

Provides faux-3D SVG extruded prism projection, directional relief shading, depth sorting, elevation contour indicators, and fall hazard preview metadata for tactical combat visualization.

## Requirements

### Requirement: Extruded Hex Prism Projection
The combat rendering system SHALL project elevated hex tiles upward along the vertical screen axis by an offset proportional to their elevation: $y_{\text{projected}} = y_{\text{flat}} - (h \times 14\text{px})$. Unit standees, target reticles, and tile overlays located at elevated coordinates SHALL have their anchor positions translated to align with the elevated tile surface.

#### Scenario: Ground-level tile projection
- **WHEN** a hex tile with elevation 0 is rendered
- **THEN** its screen coordinate matches the standard flat 2D projection with zero vertical offset

#### Scenario: Elevated tile projection
- **WHEN** a hex tile with elevation 1 or 2 is rendered
- **THEN** its top polygon surface is projected upward by 14px or 28px respectively along the screen Y-axis

#### Scenario: Unit standee vertical alignment
- **WHEN** a unit occupies a tile with elevation $h \ge 1$
- **THEN** the unit token pedestal and standee graphic are translated to the tile's projected elevation height

### Requirement: Directional Prism Wall Relief Shading
The combat rendering system SHALL render extruded prism side faces beneath elevated tiles ($h \ge 1$) along exposed perimeter edges facing toward the camera (South, Southeast, Southwest) dropping down to the ground plane or adjacent lower step, rendered with darker directional shading to produce a tactile 3D relief effect.

#### Scenario: Rendering extruded walls for elevated tiles
- **WHEN** an elevated tile ($h \ge 1$) is rendered
- **THEN** extruded side wall polygons are rendered beneath its South, Southeast, and Southwest edges with darker shaded styling

#### Scenario: Flat ground tiles have no extruded walls
- **WHEN** a tile with elevation 0 is rendered
- **THEN** no extruded prism wall polygons are generated for that tile

### Requirement: Back-to-Front Depth Sorting
The combat rendering system SHALL sort tiles, extruded prism walls, and combatant tokens using Painter's algorithm in North-to-South depth order (by visual screen depth) so that elevated foreground plateaus cleanly occlude background hexes and units standing at lower elevations.

#### Scenario: Foreground plateau occluding background hexes
- **WHEN** an elevated tile is positioned south of a lower background tile
- **THEN** the elevated tile and its extruded walls are rendered after the background tile in DOM order, cleanly occluding background elements

#### Scenario: Unit token depth ordering
- **WHEN** multiple units are rendered on the battlefield
- **THEN** units are depth-sorted by their projected vertical base coordinates to preserve natural occlusion

### Requirement: Elevation Badges and Contour Markers
The combat rendering system SHALL display elevation indicators or level badges (`+1`, `+2`, `+3`) on elevated tiles, active hover highlights, and target selection rings.

#### Scenario: Elevated tile displays level badge on hover
- **WHEN** a tile with elevation $h \ge 1$ is hovered or targeted
- **THEN** the tile highlight displays an elevation contour indicator or badge reflecting its elevation level

#### Scenario: Ground tile displays no elevation badge
- **WHEN** a tile with elevation 0 is hovered
- **THEN** no positive elevation badge is displayed

### Requirement: Fall Hazard Preview Badge
The combat interface SHALL evaluate reachable path metadata during movement mode and display a prominent warning indicator (`⚠️ Fall Hazard: -X HP`) on any hovered reachable tile whose optimal route incurs unmitigated Fall Impact Damage ($\Delta h \le -2$).

#### Scenario: Safe route hover displays standard move preview
- **WHEN** a player hovers a reachable tile with zero fall damage along the optimal path
- **THEN** the movement preview indicates standard movement without fall hazard warnings

#### Scenario: Cliff jump hover displays fall hazard damage warning
- **WHEN** a player hovers a reachable tile whose path includes a cliff drop inflicting unmitigated fall damage
- **THEN** the interface displays a prominent fall hazard badge indicating the exact HP loss amount (e.g. `-8 HP`)

### Requirement: Occlusion Visibility and Clickability Behind Elevated Terrain
The combat rendering system SHALL ensure units and hexes situated behind elevated terrain remain identifiable and interactive. Extruded prism walls SHALL have pointer events disabled (`pointer-events: none`) to prevent obstructing clicks or hovers on adjacent tiles. Combatant standee graphics, nameplates, and vitals SHALL protrude vertically above intermediate cliffs, and occluded units SHALL remain distinguishable with high-visibility silhouette or standee indicators. When a player hovers or selects an occluded tile during action modes, foreground elevated terrain SHALL support see-through translucency.

#### Scenario: Extruded prism walls do not intercept clicks
- **WHEN** a player clicks or hovers a hex tile adjacent to an elevated prism wall
- **THEN** the click or hover event is received by the target hex rather than swallowed by the extruded wall polygon

#### Scenario: Units behind elevated plateaus remain visible
- **WHEN** a unit occupies a low tile positioned behind an elevated plateau
- **THEN** the unit's upper standee, nameplate, and health bar extend above the plateau boundary with high-visibility styling

#### Scenario: Hovering or selecting occluded tiles renders see-through cutaway
- **WHEN** a reachable or targetable hex behind an elevated plateau is hovered or active
- **THEN** the foreground elevated hex and its walls render with partial transparency so the destination tile and occupant remain fully visible
