# Tasks

## 1. Balance Constants & Elevation Data Model

- [x] 1.1 Add elevation traversal constants to `src/core/config/balance.ts` (`fallDamagePerElevation: 4`, `maxClimbElevation: 2`) and verify exports compile cleanly.
- [x] 1.2 Extend `HexTile` and `Arena` in `src/core/grid/arena.ts` to validate discrete integer elevations $h \in [0, 3]$ with coordinate queries and verify with unit tests in `src/core/grid/grid.test.ts`.

## 2. Weighted Step Cost & Safe-Route Pathfinding

- [x] 2.1 Implement Dijkstra pathfinding in `Arena.getReachableHexes` using weighted step costs: $1 + \max(0, \Delta h)$ MP (flat: 1, up 1: 2, up 2: 3, down: 1) with impassable $\Delta h \ge +3$ barriers, and verify with unit tests in `src/core/grid/grid.test.ts`.
- [x] 2.2 Implement safe-route path prioritization in `Arena` to prefer zero-fall-damage routes over hazardous drops within the movement budget, and verify with test scenarios in `src/core/grid/grid.test.ts`.
- [x] 2.3 Implement `Arena.getReachableHexInfo` exposing path costs, hazardous fall damage amounts, and reconstructed routes, and verify with unit tests.

## 3. Movement Execution & Unmitigated Fall Damage

- [x] 3.1 Update `canMove` in `src/core/combat/validator.ts` to consume weighted reachable coordinates and verify with tests in `src/core/combat/validator.test.ts`.
- [x] 3.2 Update `executeMove` in `src/core/combat/resolver.ts` to inspect the path traversed, detect ledge drops $\Delta h \le -2$, and apply direct Fall Impact Damage ($|\Delta h| \times 4$) unmitigated by Armor, and verify with tests in `src/core/combat/movement.test.ts`.
- [x] 3.3 Ensure combat log entries and combat events record fall damage details (`reason: 'FALL'`), and verify event logging in `src/core/combat/movement.test.ts`.

## 4. Continuous 3D Line-of-Sight Raycasting

- [x] 4.1 Implement continuous 3D slope raycasting ($h_{\text{ray}}(t) = h_{\text{from}} + t \times (h_{\text{to}} - h_{\text{from}})$) in `Arena.hasLineOfSight` in `src/core/grid/arena.ts`, checking tile elevations, unit screening, and impassable obstacles.
- [x] 4.2 Add comprehensive 3D line-of-sight unit tests in `src/core/grid/grid.test.ts` verifying high-ground vantage over lower obstacles, low-ground occlusion behind hills, and unobstructed diagonal sightlines.

## 5. Verification & Regression Suite

- [x] 5.1 Run the complete test suite via `npm test` and verify that all tests pass cleanly without regression.
