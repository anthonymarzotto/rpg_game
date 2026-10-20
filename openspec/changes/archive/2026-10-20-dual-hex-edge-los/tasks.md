# Tasks

## 1. Core Dual-Hex Ray Traversal

- [x] 1.1 Implement `getHexRaySteps(from, to)` in `src/core/grid/hex.ts` using dual opposite-epsilon cube rounding to evaluate intermediate step coordinates and identify shared-edge steps, and verify with unit tests in `src/core/grid/grid.test.ts`.
- [x] 1.2 Update `Arena.getLineOfSightObstruction` in `src/core/grid/arena.ts` to utilize `getHexRaySteps`, evaluating both flanking hexes at edge steps and only registering an obstruction when both flanking hexes are blocked, prioritizing solid obstacles and hills over units.

## 2. Verification and Integration Tests

- [x] 2.1 Add targeted Line-of-Sight edge tests in `src/core/grid/grid.test.ts` verifying: (a) LoS is clear when one edge hex is occupied and the other is open (reproducing Leander at (3,-3) targeting Theron at (1,-2)), (b) LoS is blocked when both edge hexes contain blocking conditions, (c) elevation slope interactions along edge steps, and (d) strict directional symmetry (A -> B === B -> A).
- [x] 2.2 Run full test suite (`npm test`) to verify zero regressions across combat resolution, AI decision-making, target preview, and movement validation.
