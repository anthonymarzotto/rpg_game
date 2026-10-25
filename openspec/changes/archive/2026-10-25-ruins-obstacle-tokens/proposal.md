# Proposal

## Why

Obstacle tiles (such as ancient ruins and stone pillars) currently render as flat procedural vector SVG rectangles and text labels on the tactical battlefield. Adding rich pixel art ruins tokens with 8-directional rotations elevates the visual quality, immersion, and tactile feel of tactical combat while seamlessly integrating with the existing elevation projection and grid geometry.

## What Changes

- Normalize the ruins object asset directory layout under `public/assets/objects/ruins/rotations/` to match `metadata.json`.
- Introduce an obstacle asset resolution module (`obstacleAssets.ts`) that resolves 8-directional ruin rotation sprites with Vite base URL support.
- Implement deterministic direction selection based on hex coordinates (`(abs(q * 37 + r * 19)) % 8`) ensuring each obstacle on the battlefield has a varied orientation while remaining stable across renders without jitter.
- Render ruins pixel standees in `HexGridSvg.tsx` positioned on the elevated hex surface with crisp pixel-art scaling and drop shadow filters, replacing the placeholder vector rectangles.
- Support preloading of obstacle token assets alongside unit tokens.

## Capabilities

### New Capabilities
- `obstacle-tokens`: Centralized resolution, deterministic 8-way rotation selection, preloading, and SVG standee rendering for tactical battlefield obstacle and ruin tokens.

### Modified Capabilities
<!-- None: existing capability requirements remain unchanged. -->

## Impact

- **Assets**: Normalizes `public/assets/objects/ruins/` file structure.
- **Frontend / UI**: Adds `src/ui/combat/obstacleAssets.ts` and updates `src/ui/combat/HexGridSvg.tsx` obstacle rendering.
- **Preloading**: Extends image preloading in combat setup with obstacle rotation assets.
- **Tests**: Adds unit tests in `src/ui/combat/obstacleAssets.test.ts` and updates `HexGridSvg.test.tsx`.
