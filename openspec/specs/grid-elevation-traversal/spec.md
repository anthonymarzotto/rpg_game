# Grid Elevation Traversal Specification

## Purpose

Defines discrete hexagonal grid elevation, weighted climbing and step traversal costs, voluntary ledge drops with unmitigated fall damage, safe-route pathfinding, and continuous 3D line-of-sight raycasting.

## Requirements

### Requirement: Discrete Hex Elevation Model
The spatial grid system SHALL represent discrete integer elevation levels $h \in [0, 3]$ for each hex tile. Tiles without explicit elevation SHALL default to elevation 0.

#### Scenario: Default tile elevation
- **WHEN** an arena tile is instantiated without an explicit elevation parameter
- **THEN** its elevation level SHALL be 0

#### Scenario: Elevated tile query
- **WHEN** an arena tile is created with elevation 1, 2, or 3
- **THEN** querying the tile coordinate SHALL return the assigned integer elevation level

### Requirement: Weighted Elevation Step Cost
The pathfinding and movement validation system SHALL calculate the Movement Point (MP) cost of each adjacent step as $1 + \max(0, \text{elevation}_{\text{to}} - \text{elevation}_{\text{from}})$. Flat steps ($\Delta h = 0$) and downward steps ($\Delta h \le -1$) SHALL cost 1 MP. Ascending an elevation difference of $\Delta h = +1$ SHALL cost 2 MP. Ascending an elevation difference of $\Delta h = +2$ SHALL cost 3 MP. Ascending an elevation difference of $\Delta h \ge +3$ SHALL be impassable for standard movement.

#### Scenario: Flat and downward step costing
- **WHEN** a unit traverses between adjacent hexes at the same elevation ($\Delta h = 0$) or steps down ($\Delta h = -1$)
- **THEN** the traversal cost for that step SHALL be 1 MP

#### Scenario: Stepping up +1 elevation
- **WHEN** a unit traverses from an elevation 0 tile to an adjacent elevation 1 tile
- **THEN** the traversal cost for that step SHALL be 2 MP

#### Scenario: Stepping up +2 elevation
- **WHEN** a unit traverses from an elevation 0 tile to an adjacent elevation 2 tile
- **THEN** the traversal cost for that step SHALL be 3 MP

#### Scenario: Impassable +3 step rise
- **WHEN** a unit attempts to traverse directly to an adjacent hex with $\Delta h \ge +3$
- **THEN** the pathfinder SHALL treat the edge as impassable

### Requirement: Ledge Drops and Fall Impact Damage
The movement execution engine SHALL allow units to voluntarily step off ledges to lower elevation. Stepping down $\Delta h = -1$ SHALL inflict zero damage. Dropping down a ledge of $\Delta h \le -2$ SHALL inflict direct Fall Impact Damage equal to $|\Delta h| \times 4$, which SHALL NOT be mitigated or reduced by the unit's Armor or Ward vitals.

#### Scenario: Drop down 1 level without damage
- **WHEN** an active unit executes a move dropping $\Delta h = -1$
- **THEN** the unit lands on the destination hex and suffers 0 fall impact damage

#### Scenario: Drop down 2 levels inflicts unmitigated fall damage
- **WHEN** an active unit executes a move dropping $\Delta h = -2$ (such as from elevation 2 to 0)
- **THEN** the unit suffers exactly 8 direct physical damage regardless of Armor rating

#### Scenario: Drop down 3 levels inflicts unmitigated fall damage
- **WHEN** an active unit executes a move dropping $\Delta h = -3$ (such as from elevation 3 to 0)
- **THEN** the unit suffers exactly 12 direct physical damage regardless of Armor rating

### Requirement: Safe-Route Pathfinding and Hazard Metadata
The movement reachability and pathfinding system SHALL evaluate traversal paths using edge weights that prioritize zero-fall-damage routes whenever reachable within the unit's effective movement budget. If a destination is reachable both via a zero-damage route and via a hazardous cliff drop within the unit's movement budget, the system SHALL select the safe route. When a destination tile can only be reached by taking a hazardous drop, the tile SHALL remain reachable and the system SHALL report the anticipated fall damage for UI warning display.

#### Scenario: Safe ramp chosen over hazardous cliff jump
- **WHEN** a destination hex is reachable via a 3-step gentle ramp (0 fall damage, 3 MP) and via a 1-step cliff plunge (8 fall damage, 1 MP) within a 3 Move budget
- **THEN** the pathfinder SHALL route the unit along the gentle ramp with 0 fall damage

#### Scenario: Cliff jump chosen when safe ramp is out of budget
- **WHEN** a destination hex can only be reached within the current Move budget by dropping down a cliff ($\Delta h \le -2$)
- **THEN** the destination hex SHALL be marked reachable and the calculated path SHALL include the ledge drop

#### Scenario: Fall damage preview metadata reported
- **WHEN** querying movement preview metadata for a destination tile whose optimal route incurs a cliff drop
- **THEN** the preview result SHALL return the exact unmitigated fall damage amount for warning badge presentation

### Requirement: Continuous 3D Line-of-Sight Raycasting
The spatial container SHALL determine line-of-sight between two hex coordinates using continuous 3D slope raycasting: $h_{\text{ray}}(t) = h_{\text{from}} + t \times (h_{\text{to}} - h_{\text{from}})$ for $t \in [0, 1]$ along the continuous hex ray. Line-of-sight SHALL be blocked if any intermediate hex has an elevation $H_{\text{tile}} > h_{\text{ray}}(t)$, or if an intermediate hex is an impassable obstacle or occupied by an intervening non-stealthed unit at $H_{\text{tile}} \ge h_{\text{ray}}(t)$.

When an intermediate ray step passes along a shared edge between two hexes (where two intermediate hexes are equidistant from the continuous ray), line-of-sight SHALL be evaluated across BOTH flanking hexes. Line-of-sight SHALL be blocked at that step if and only if BOTH flanking hexes are obstructed at ray height $h_{\text{ray}}(t)$. If at least one flanking hex is unobstructed (walkable, with elevation $H_{\text{tile}} \le h_{\text{ray}}(t)$ and no screening unit), the sightline SHALL remain unobstructed through that edge.

Units on high ground SHALL maintain unobstructed line-of-sight over lower intermediate obstacles to targets at lower elevation, and down stepped terraces where intermediate terrain matches the slope ($H_{\text{tile}} \le h_{\text{ray}}(t)$). Stealthed units SHALL NOT screen line-of-sight.

#### Scenario: High-ground shooter sees over lower obstacle
- **WHEN** a unit at elevation 2 targets a unit at elevation 0 with an intermediate obstacle tile at elevation 0
- **THEN** the calculated ray height at the intermediate tile exceeds the obstacle height and line-of-sight SHALL be true

#### Scenario: High-ground shooter sees down stepped terrace
- **WHEN** a unit at elevation 2 targets a unit at elevation 0 with an intermediate stepped terrace tile at elevation 1
- **THEN** the calculated ray height at the intermediate tile ($h_{\text{ray}} = 1.0$) matches the terrace elevation ($H_{\text{tile}} = 1$) and line-of-sight SHALL be true

#### Scenario: Low-ground shooter blocked by intervening hill
- **WHEN** a unit at elevation 0 targets a unit at elevation 0 with an intervening tile at elevation 1
- **THEN** the calculated ray height at the intermediate tile is lower than the hill and line-of-sight SHALL be false

#### Scenario: Stealthed intervening unit does not screen sightline
- **WHEN** an intervening unit possessing the STEALTH condition stands along the ray
- **THEN** the stealthed unit SHALL NOT block line-of-sight to the target

#### Scenario: Direct sightline unobstructed across descending slope
- **WHEN** a unit at elevation 2 targets an adjacent or distant unit at elevation 1 with no intermediate blocking tiles
- **THEN** line-of-sight SHALL be true

#### Scenario: Shared edge with one occupied hex and one clear hex preserves Line-of-Sight
- **WHEN** a unit targets another unit along a ray whose intermediate step lands on a shared edge where one flanking hex is occupied by an intervening unit and the other flanking hex is unoccupied and flat
- **THEN** line-of-sight SHALL be true

#### Scenario: Shared edge with both flanking hexes blocked occludes Line-of-Sight
- **WHEN** a unit targets another unit along a ray whose intermediate step lands on a shared edge where both flanking hexes contain blocking conditions (such as units, impassable obstacles, or elevated terrain)
- **THEN** line-of-sight SHALL be false

#### Scenario: Symmetric Line-of-Sight across shared edge irrespective of directional vector
- **WHEN** evaluating Line-of-Sight along a shared edge between two hexes in either direction
- **THEN** line-of-sight evaluation SHALL be reciprocal and independent of internal floating-point tie-breaking direction
