# Spec Delta

## MODIFIED Requirements

### Requirement: Procedural Arena and Obstacle Generation
The system SHALL generate an arena of radius 3 or 4 containing 2 to 4 non-walkable obstacle hexes and procedural multi-peak terraced elevation ($h \in [0, 3]$, default peaks $h=2$), ensuring guaranteed traversable pathfinding connectivity (without impassable single-step rises of $\Delta h \ge 3$) between player deployment hexes in the West and enemy deployment hexes in the East. For Stage 3 and beyond, standard encounters SHALL expand to radius 4 (61 hexes) to accommodate multi-peak topography.

#### Scenario: Arena generation with traversable connectivity
- **WHEN** `generateStageEncounter` constructs a new battle arena
- **THEN** player spawn hexes and enemy spawn hexes have at least one unblocked, traversable path connecting them across elevation tiers and obstacles

#### Scenario: Expanded radius 4 arena for later stages
- **WHEN** generating an encounter for Stage 3 or higher
- **THEN** the arena radius is set to 4 (61 total hexes)

## ADDED Requirements

### Requirement: Multi-Peak Terraced Elevation Topography
The encounter generation system SHALL procedurally generate terraced elevation maps by seeding 1 to 2 peak foci at elevation $h=2$ (or higher), flood-filling surrounding terraces at elevation $h=1$, maintaining low-ground valleys at $h=0$, and producing tactical sheer cliff drops ($\Delta h \ge 2$), while ensuring player and enemy deployment spawns remain traversable without impassable cliff barriers blocking all routes.

#### Scenario: Procedural elevation seeding with peak and terrace tiers
- **WHEN** an encounter arena is generated with procedural elevation
- **THEN** the generated tiles contain low ground ($h=0$), intermediate terraces ($h=1$), and elevated peaks ($h=2$)

#### Scenario: Preservation of deployment zones traversability
- **WHEN** procedural elevation assigns tile heights across the arena
- **THEN** units in the player deployment zone have traversable paths to engage enemies in the enemy deployment zone
