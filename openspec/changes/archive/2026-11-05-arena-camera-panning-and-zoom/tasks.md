# Tasks

## 1. Camera ViewBox & Dynamic Bounding Geometry

- [x] 1.1 Extend `HexGridSvg` with `panOffset` property, compute clamped viewBox incorporating current zoom magnification and boundary margins, and verify with unit tests in `HexGridSvg.test.tsx`.
- [x] 1.2 Implement hex-to-pixel centering coordinate helper converting elevation and hex coordinates into centered camera pan offsets, and verify with unit tests.

## 2. Arena Drag & Keyboard Navigation

- [x] 2.1 Add right-click mouse drag event handlers to `.arena-canvas-container` in `CombatArena.tsx` with 1:1 screen-to-viewBox displacement, grabbing cursor styles in `CombatArena.css`, and tap-vs-drag contextmenu suppression.
- [x] 2.2 Implement keyboard arrow key camera panning (Up, Down, Left, Right) in `CombatArena.tsx` with input/modal suppression, and verify with unit tests in `CombatArena.test.tsx`.
- [x] 2.3 Wire `InitiativeRibbon` chip clicks to center the arena camera on the selected combatant alongside pinning, and verify with unit tests.

## 3. Celestial Parallax & Viewport Reset

- [x] 3.1 Extend `computeBackgroundTransform` in `arenaBackground.ts` with subtle parallax pan coordinate translation, and verify with unit tests in `arenaBackground.test.ts`.
- [x] 3.2 Update top bar Reset View button in `CombatArena.tsx` to restore both field zoom to 1.0x and camera pan to neutral (0, 0), and verify in `CombatArena.test.tsx`.

## 4. Release Verification & Documentation

- [x] 4.1 Update `CHANGELOG.md` with strictly end-user facing notes under `[0.12.0]` and bump version in `package.json` to `0.12.0`.
- [x] 4.2 Run `npm run build` and `npm test` to verify complete test suite passes and production build compiles without errors.
