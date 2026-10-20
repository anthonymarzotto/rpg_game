# Proposal

## Why

In hexagonal grid raycasting, when a sightline ray travels between two hexes whose relative vector is not along a cardinal axis (such as an offset of $(\Delta q = -2, \Delta r = 1)$), the straight-line ray passes directly along the shared edge boundary between two intermediate hexes. The current implementation relies on `getHexLine`, which uses an arbitrary floating-point epsilon offset to deterministically pick a single hex. 

This causes two severe gameplay issues:
1. **Unnatural and frustrating line-of-sight blocks**: When an enemy unit stands on one side of a shared edge while the other side is open ground, line-of-sight is reported as blocked even though half of the sightline corridor is completely unoccupied.
2. **Asymmetric directional bias**: An identical tactical configuration facing in one direction may be blocked while in another direction it is clear, depending purely on which way the internal epsilon nudges the sample point.

Following standard tactical tabletop conventions (such as *BattleTech*, *Advanced Squad Leader*, and *Gloomhaven*), a sightline traveling along a shared hex edge should only be blocked if **both** flanking hexes are obstructed.

## What Changes

- **Dual-Hex Edge Traversal for Line of Sight**: Enhance `getLineOfSightObstruction` / `hasLineOfSight` in `Arena` to detect when a ray step lands on a shared edge between two hexes (where both hexes are equidistant from the continuous ray).
- **Permissive Edge Occlusion ("Both Sides Must Block")**: At edge steps, evaluate both flanking hexes against ray elevation $h_{\text{ray}}(t)$. Line-of-sight is blocked if and only if **both** flanking hexes contain blocking conditions (obstacles, intervening units, or terrain elevations above the ray). If either side is clear, the sightline remains open.
- **Obstruction Attribution**: When both flanking hexes are obstructed, return the dominant or primary obstruction (prioritizing solid obstacles/hills over units).
- **Single-Path Ray Retained for Movement**: Preserve `getHexLine` for movement and charge mechanics (such as Lance Charge or Rush Charge) where a single physical hex sequence is required.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `grid-elevation-traversal`: Clarify continuous 3D line-of-sight raycasting to specify dual-hex edge traversal, requiring both flanking hexes on a shared edge to be obstructed before declaring line-of-sight blocked.

## Impact

- **Core Grid Engine**: `src/core/grid/arena.ts` (`getLineOfSightObstruction`, `hasLineOfSight`) and `src/core/grid/hex.ts` (helper for edge detection / candidate extraction).
- **Combat Validation & AI**: `src/core/combat/validator.ts`, `src/core/combat/targetPreview.ts`, and `src/core/ai/decisionEngine.ts` naturally inherit accurate line-of-sight without API changes.
- **Test Suite**: Existing tests in `src/core/grid/grid.test.ts` pass, plus new tests covering symmetric edge sightlines, single-side vs dual-side obstruction, and 3D elevation down edge corridors.
