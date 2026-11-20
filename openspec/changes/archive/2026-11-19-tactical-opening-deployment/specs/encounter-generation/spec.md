# Spec Delta

## MODIFIED Requirements

### Requirement: Procedural Arena and Obstacle Generation
The system SHALL generate an arena of radius 3, 4, or 5 containing 2 to 4 non-walkable obstacle hexes and procedural multi-peak terraced elevation (h in [0, 3], default peaks h=2), ensuring guaranteed traversable pathfinding connectivity (without impassable single-step rises of Delta h >= 3) between player deployment hexes in the West and enemy deployment hexes in the East. The arena radius SHALL be dynamically determined: Radius 3 for Stage 1, Radius 4 minimum for Stage 2 and beyond, and expanding to Radius 5 (91 hexes) when the combined total of deployed player and enemy units is 7 or greater.

West (player) and East (enemy) deployment zones SHALL be defined symmetrically using horizontal screen-column projection (`col = 2*q + r`) across the full North-to-South vertical span of the arena:
- Radius 3: `col <= -3` for Player (8 hexes) and `col >= 3` for Enemy (8 hexes)
- Radius 4: `col <= -4` for Player (12 hexes) and `col >= 4` for Enemy (12 hexes)
- Radius 5: `col <= -5` for Player (18 hexes) and `col >= 5` for Enemy (18 hexes)

Non-walkable `RUINS` obstacle hexes SHALL be restricted strictly to the neutral interior strip between the deployment zones (`|col| < threshold`) so all deployment zone hexes remain walkable, while `h=1` elevation terraces MAY spread into deployment zone hexes to provide elevated starting vantage positions.

#### Scenario: Arena generation with traversable connectivity
- **WHEN** `generateStageEncounter` constructs a new battle arena
- **THEN** player spawn hexes and enemy spawn hexes have at least one unblocked, traversable path connecting them across elevation tiers and obstacles

#### Scenario: Expanded radius 4 arena for later stages
- **WHEN** generating an encounter for Stage 2 or higher with fewer than 7 total combatants
- **THEN** the arena radius is set to 4 (61 total hexes) with 12 symmetric West player deployment hexes and 12 symmetric East enemy deployment hexes

#### Scenario: Radius 3 arena for initial stage
- **WHEN** generating an encounter for Stage 1 with 6 total combatants
- **THEN** the arena radius is set to 3 (37 total hexes) with 8 symmetric West player deployment hexes and 8 symmetric East enemy deployment hexes

#### Scenario: Radius 5 expanded arena for large battles
- **WHEN** generating an encounter where the combined total of player and enemy units is 7 or greater
- **THEN** the arena radius is set to 5 (91 total hexes) with 18 symmetric West player deployment hexes and 18 symmetric East enemy deployment hexes spanning the full North-to-South flank range

#### Scenario: Deployment zones allow elevation terraces while excluding obstacles
- **WHEN** `generateArenaTerrain` generates elevation and obstacles for an arena
- **THEN** no non-walkable obstacle is placed on any West or East deployment zone hex
- **AND** `h=1` terrace elevation tiles can be generated within the deployment zones without creating impassable cliff barriers

## ADDED Requirements

### Requirement: Role-Aware Tactical Squad Placement
The encounter generation system SHALL place enemy combatants onto the East deployment zone (and pre-place default player combatants onto the West deployment zone) using a role-aware tactical formation scorer rather than raw roster array index order:
- **Frontline (`BRAWLER`)**: Prioritizes the forward deployment row closest to the arena center (`|2*q + r|` minimum) and central vertical lanes (`|r|` small), applying a spacing penalty against adjacent friendly Brawlers so frontline units spread across the battle line rather than clumping.
- **Backline (`SNIPER` and `SUPPORT`)**: Prioritizes mid-to-back deployment rows behind the frontline, awarding placement bonuses for elevated terrace hexes (`h >= 1`) and screening behind friendly frontline units.
- **Flankers (`SKIRMISHER`)**: Prioritizes outer North and South wing hexes (larger `|r|`) on forward-to-mid rows to establish flanking lanes.

#### Scenario: Enemy frontline Brawlers deploy ahead of backline Snipers and Supports
- **WHEN** `generateStageEncounter` places an enemy squad containing both frontline Brawler units (such as Warrior, Knight, or Shield-bearer) and backline Sniper/Support units (such as Wizard, Sorcerer, Witch, or Ballistician)
- **THEN** the Brawler units are placed on forward East deployment hexes closer to the center (`2*q + r` smaller) than the Sniper/Support units, which are positioned in rear or elevated hexes behind the frontline

#### Scenario: Enemy Skirmishers deploy on North or South flank wings
- **WHEN** `generateStageEncounter` places an enemy squad containing Skirmisher units (such as Thief, Infiltrator, Highwayman, or Cat Burglar) alongside frontline Brawlers
- **THEN** the Skirmisher units are placed on outer North or South wing hexes with larger `|r|` coordinates than the central Brawler frontline

#### Scenario: Large 6+ unit squads spread across the vertical span without clumping
- **WHEN** an encounter is generated in Radius 5 with 6 or more combatants on a side
- **THEN** the tactical formation placer distributes combatants across the vertical span and depth rows of the 18-hex deployment zone rather than bunching all units into a single tight cluster
