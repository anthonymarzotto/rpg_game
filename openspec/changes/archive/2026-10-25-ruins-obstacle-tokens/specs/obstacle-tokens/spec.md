# Spec Delta

## Purpose

Provides centralized resolution, deterministic 8-way rotation selection, preloading, and SVG standee rendering for tactical battlefield obstacle and ruin tokens.

## ADDED Requirements

### Requirement: Obstacle Token Asset Resolution
The system SHALL resolve the asset URL for obstacle tokens matching the requested obstacle type and rotation direction, with support for base URL configuration.

#### Scenario: Resolving ruins token sprite path
- **WHEN** the system resolves the asset path for an obstacle with type `ruins` and rotation `north-west`
- **THEN** it returns the asset URL pointing to `/assets/objects/ruins/rotations/north-west.png`

#### Scenario: Fallback for unmapped obstacle types
- **WHEN** the system resolves an asset path for an unmapped obstacle type
- **THEN** it returns `null`, enabling procedural vector fallback rendering

### Requirement: Deterministic Rotation Selection
The system SHALL deterministically select one of 8 rotation directions (`south`, `south-east`, `east`, `north-east`, `north`, `north-west`, `west`, `south-west`) for an obstacle based on its axial hex coordinates `(q, r)`.

#### Scenario: Varied orientation across battlefield hexes
- **WHEN** obstacle tokens are resolved for different hex coordinates
- **THEN** distinct coordinates receive varied rotation directions across the 8 available orientations

#### Scenario: Stable orientation across renders
- **WHEN** an obstacle token at coordinate `(q, r)` is re-rendered across frame updates or hover events
- **THEN** the resolved rotation direction remains identical without jitter or visual change

### Requirement: Hex Grid Standee Rendering
The tactical combat renderer SHALL display pixel-art obstacle standees centered on obstacle hex tiles, vertically anchored to the hex's projected elevation surface, and rendered with pixelated image filtering and drop shadows.

#### Scenario: Rendering ruins sprite on ground hex
- **WHEN** an obstacle tile with elevation 0 is rendered
- **THEN** an SVG `<image>` element is rendered with width 68 and height 68, centered horizontally on the hex, anchored to the top surface, with drop-shadow styling and pixel-art rendering

#### Scenario: Rendering ruins sprite on elevated hex
- **WHEN** an obstacle tile with elevation `h >= 1` is rendered
- **THEN** the obstacle standee anchor is translated vertically along the screen Y-axis to sit directly on the elevated top surface

### Requirement: Obstacle Asset Preloading
The asset management system SHALL provide all rotation URLs for obstacle token sets to support asynchronous preloading during combat initialization.

#### Scenario: Collecting obstacle token URLs for preloading
- **WHEN** `getObstacleTokenUrls` is invoked for `ruins`
- **THEN** it returns an array containing all 8 rotation image paths
