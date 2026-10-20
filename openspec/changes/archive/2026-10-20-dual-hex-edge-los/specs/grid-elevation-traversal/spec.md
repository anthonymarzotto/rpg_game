# Spec Delta

## MODIFIED Requirements

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
