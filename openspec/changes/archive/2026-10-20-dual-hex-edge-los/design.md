# Design

## Context

See `proposal.md` for the motivation and gameplay background. Currently, `Arena.getLineOfSightObstruction` calls `getHexLine(from, to)` in `src/core/grid/hex.ts`, which uses an arbitrary floating-point epsilon offset to deterministically pick a single intermediate hex path. When a ray travels along a shared edge between two hexes, this hardcoded nudge snaps to one side, causing asymmetric blocking artifacts and ignoring the open half of the corridor.

## Goals / Non-Goals

**Goals:**
- Provide a robust, mathematically rigorous edge-detection mechanism for hex raycasting using cube coordinate opposite-epsilon sampling.
- Evaluate both flanking hexes when a line-of-sight ray traverses a shared edge.
- Only block line-of-sight at an edge step if **both** flanking hexes contain blocking conditions (obstacles, hills, or screening units).
- Maintain 100% reciprocal symmetry: if unit A has LoS to unit B across an edge, unit B must have LoS to unit A.
- Seamlessly integrate with existing continuous 3D slope raycasting ($h_{\text{ray}}(t)$).

**Non-Goals:**
- Partial cover or defense bonuses: calculating partial cover bonuses for single-flank obstructed shots is out of scope for this change and can be added later if desired.
- Modifying physical movement paths: `getHexLine` will be preserved for dash/charge displacement mechanics (e.g. Lance Charge) where a single physical hex sequence is required.
- Corner-to-corner multi-ray tracing: we will not implement multi-ray vertex casting; center-to-center dual-hex edge traversal provides the necessary precision without combinatorial complexity.

## Decisions

### 1. Dual-Sided Epsilon Sampling in Cube Space
* **Decision**: Implement a helper function `getHexRaySteps(from: HexCoord, to: HexCoord): HexRayStep[]` in `src/core/grid/hex.ts`. At each step $t = i / n$, evaluate the continuous cube point $P(t)$ with dual anti-symmetric perturbation vectors:
  $$\vec{\epsilon}_1 = (+1\text{e-}6, +2\text{e-}6, -3\text{e-}6)$$
  $$\vec{\epsilon}_2 = (-1\text{e-}6, -2\text{e-}6, +3\text{e-}6)$$
  Candidate hexes are obtained by rounding:
  $$h_1 = \text{cubeToAxial}(\text{cubeRound}(P(t) + \vec{\epsilon}_1))$$
  $$h_2 = \text{cubeToAxial}(\text{cubeRound}(P(t) + \vec{\epsilon}_2))$$
* **Rationale**: The hyperplane separating any two adjacent hexes has a normal vector from the set $\{\pm(1, -1, 0), \pm(1, 0, -1), \pm(0, 1, -1)\}$. The dot product of $\vec{\epsilon}_1$ with every normal is strictly non-zero ($\pm 1\text{e-}6, \pm 4\text{e-}6, \pm 5\text{e-}6$). Therefore:
  - If $P(t)$ lies on a shared edge, $P(t) + \vec{\epsilon}_1$ and $P(t) + \vec{\epsilon}_2$ are guaranteed to land on opposite sides, yielding the two flanking hexes $h_1 \ne h_2$.
  - If $P(t)$ lies inside a hex interior, both sample points round to the exact same hex $h_1 = h_2$.
* **Alternatives Considered**:
  - *Explicit floating-point fractional checks (`abs(diff - 0.5) < EPSILON`)*: Prone to floating-point drift on longer distances and requires coordinate-permutation branching. Anti-symmetric cube rounding is $O(1)$, branchless, and numerically stable.

### 2. Permissive Edge Evaluation in `Arena.getLineOfSightObstruction`
* **Decision**: At step $i$ along the ray:
  - If `hexes.length === 1`: evaluate standard single-hex obstruction.
  - If `hexes.length === 2`: evaluate obstruction on both $h_1$ and $h_2$. If either hex is clear (walkable, $H_{\text{tile}} \le h_{\text{ray}}$, and no screening unit), LoS is unblocked at this step. If both are obstructed, return the primary obstruction.
* **Rationale**: Matches tabletop rules (BattleTech, ASL, Gloomhaven) and reflects physical reality: an obstacle occupying only half of a corridor does not block vision through the remaining open half.
* **Obstruction Attribution**: When both sides are obstructed, prioritize `OBSTACLE` > `HILL` > `UNIT` > `VOID` so combat log and UI diagnostics clearly reflect solid map geometry over dynamic units.

## Risks / Trade-offs

- **[Risk] Existing tests expecting arbitrary single-sided blocking might fail**:
  → *Mitigation*: Existing unit tests in `src/core/grid/grid.test.ts` test cardinal axis sightlines (where ray points are hex interiors). We will verify all 77 test suites and add explicit edge-traversal tests.
- **[Risk] Ray passing between two adjacent walls might visually clip**:
  → *Mitigation*: If both sides of the corridor are walls, both flanking hexes are `OBSTACLE`, which correctly triggers a full block. LoS is only open when at least one side is walkable/open.
