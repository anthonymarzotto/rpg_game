# Design

## Context

Obstacle tiles in `HexGridSvg.tsx` are currently identified by `!tile.isWalkable` and rendered with placeholder SVG vector rectangles. The new asset in `public/assets/objects/ruins` contains 68×68px pixel sprites across 8 directional rotations (`south`, `south-east`, `east`, `north-east`, `north`, `north-west`, `west`, `south-west`). The pointy-topped hexes in the arena have a radius of 38px (width ~65.8px, height 76px), meaning 68×68px sprites sit naturally within the hex cell footprint.

See `proposal.md` for motivation and `specs/obstacle-tokens/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Move nested `public/assets/objects/ruins/ruins/rotations` up to `public/assets/objects/ruins/rotations` to align with `metadata.json`.
- Provide a dedicated `obstacleAssets.ts` utility for path resolution, deterministic direction selection, and preloading.
- Integrate the 68×68 pixel ruins standee into `HexGridSvg.tsx` anchored to elevated hex surfaces with drop shadows.
- Maintain existing obstacle test hooks and tactical label badges.

**Non-Goals:**
- No changes to Line of Sight (LoS), knockback collision mechanics, or movement cost models.
- No dynamic destruction or interactive state animations for obstacles.
- No changes to unit facing or unit tokens.

## Decisions

### Decision 1: Directory Normalization
- Move `public/assets/objects/ruins/ruins/rotations` up one level to `public/assets/objects/ruins/rotations` using PowerShell `Move-Item`.
- **Rationale**: The nested `ruins/` subdirectory was an artifact of archive extraction and did not match the relative `"rotations/..."` paths specified in `metadata.json`.
- **Alternative Considered**: Resolving to `ruins/ruins/rotations` in code. Rejected to keep the public asset hierarchy clean and consistent with future prop packs.

### Decision 2: Deterministic Coordinate Hashing for Rotation
- Use a deterministic hash function:
  ```ts
  export const RUINS_ROTATIONS = [
    'south',
    'south-east',
    'east',
    'north-east',
    'north',
    'north-west',
    'west',
    'south-west'
  ] as const;

  export function getObstacleRotation(coord: HexCoord): (typeof RUINS_ROTATIONS)[number] {
    const idx = Math.abs(coord.q * 37 + coord.r * 19) % RUINS_ROTATIONS.length;
    return RUINS_ROTATIONS[idx];
  }
  ```
- **Rationale**: Deriving orientation from `(q, r)` guarantees diverse orientations across different tiles while ensuring zero twitching or orientation changes during re-renders, hover events, or turn passing.
- **Alternative Considered**: Adding a mutable `facing` or `rotation` property to `HexTile` state during encounter generation. Rejected as unnecessary state complexity for static props.

### Decision 3: Standee Anchoring & Drop Shadow in HexGridSvg
- Render the standee inside `<g className="pointer-events-none obstacle-ruins-glyph">`:
  ```tsx
  <image
    href={obstacleAssetSrc}
    x={basePixel.x - 34}
    y={topY - 48}
    width="68"
    height="68"
    preserveAspectRatio="xMidYMax meet"
    className="pixel-art"
    filter="url(#standee-drop-shadow)"
  />
  ```
- **Rationale**: An offset of `y = topY - 48` aligns the base of the crumbling stone pillars with the top polygon surface of the hex at all elevation levels (`topY = basePixel.y - elevation * ELEVATION_Y_OFFSET`).
- **Alternative Considered**: Flat polygon texture pattern. Rejected because the assets are authored with an isometric/low top-down standee perspective with verticality.

### Decision 4: Label Badge Retention
- Keep the compact, elevation-tinted `RUINS` badge below the standee at `y = topY + 8`.
- **Rationale**: Preserves immediate tactical readability for obstacles under all zoom levels and keeps `HexGridSvg.test.tsx` assertions intact.

## Risks / Trade-offs

- **[Risk: Visual occlusion of units standing behind obstacles]** → Mitigated by the rendering pipeline: terrain tiles (including obstacles) render in Layer 1 in North-to-South depth order, while unit standees render in Layer 2. Unit graphics and nameplates sit above terrain standees.
- **[Risk: Image load flicker on first battle entry]** → Mitigated by adding `getObstacleTokenUrls('ruins')` to `preloadImageUrls()` during combat initialization.
