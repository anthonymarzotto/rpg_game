# Proposal

## Why

Combat currently operates on a flat two-dimensional plane where all movement steps cost a uniform 1 MP and height differences do not affect line-of-sight or pathfinding. Phase 6.1 introduces discrete hex elevation, weighted climbing costs, voluntary ledge drops with unmitigated fall damage, safe-route pathfinding, and continuous 3D line-of-sight raycasting. This establishes the spatial foundation for vertical tactical combat and the upcoming Phase 6b Cat-Burglar infiltration kit.

## What Changes

* **Discrete Elevation Data Model**: Extend `HexTile` and spatial queries to support discrete integer elevations $h \in [0, 3]$ (0: low ground, 1: hill/terrace, 2: cliff/peak, 3: high plateau).
* **Weighted Step Traversal**: Transition pathfinding from uniform steps to a weighted cost model: $1 + \max(0, \Delta h)$ Movement Points (MP) per step (Flat: 1 MP, Step Up +1: 2 MP, Step Up +2: 3 MP, Step Down: 1 MP). Steps with $\Delta h \ge +3$ are impassable without specialized traversal abilities.
* **Ledge Drops & Unmitigated Fall Damage**: Permit voluntary ledge drops downward. Stepping down $\Delta h = -1$ is free of damage. Plunging down $\Delta h \le -2$ inflicts direct Fall Impact Damage ($|\Delta h| \times 4$), **strictly unmitigated by Armor**.
* **Safe-Route Pathfinding & Danger Preview**: Update arena pathfinding (Dijkstra) with high edge safety penalties for dangerous drops so that units naturally take zero-damage ramps/routes when within their movement budget. Allow cliff drops when safe routes are out of budget, and surface fall damage hazard metadata for UI previews.
* **Continuous 3D Line-of-Sight Raycasting**: Replace flat line-of-sight checks with a continuous 3D slope raycaster: $h_{\text{ray}}(t) = h_{\text{from}} + t \times (h_{\text{to}} - h_{\text{from}})$. Intermediate hexes occlude LoS if their elevation $H_{\text{tile}} \ge h_{\text{ray}}(t)$, or if occupied by blocking units or impassable obstacles (`RUINS`). High-ground units naturally shoot over lower intermediate cover.

## Capabilities

### New Capabilities
- `grid-elevation-traversal`: Discrete hex elevation model, weighted climbing and step traversal costs, ledge drops with unmitigated fall damage, safe-route pathfinding, and continuous 3D line-of-sight raycasting.

### Modified Capabilities
- None.

## Impact

* `src/core/grid/arena.ts`: Update `getReachableHexes`, `hasLineOfSight`, and spatial queries to evaluate 3D slopes and weighted step costs.
* `src/core/combat/validator.ts`: Align movement validation (`canMove`) with weighted reachability.
* `src/core/combat/resolver.ts`: Deduct actual fall damage when `executeMove` traverses a ledge drop $\Delta h \le -2$.
* `src/core/config/balance.ts`: Add `fallDamagePerElevation: 4` and max climb thresholds to balance configuration.
* Tests: Add comprehensive unit tests in `src/core/grid/grid.test.ts`, `src/core/combat/movement.test.ts`, and dedicated verticality test suites.
