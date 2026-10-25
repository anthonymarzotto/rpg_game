# Tasks

## 1. Asset Layout Normalization

- [x] 1.1 Move `public/assets/objects/ruins/ruins/rotations` up to `public/assets/objects/ruins/rotations` and remove the redundant nested `ruins` folder; verify all 8 rotation PNGs exist at `public/assets/objects/ruins/rotations/*.png`.

## 2. Obstacle Asset Resolution & Preloading

- [x] 2.1 Create `src/ui/combat/obstacleAssets.ts` with `RUINS_ROTATIONS`, deterministic `getObstacleRotation(coord)` coordinate hashing, `resolveObstacleAssetPath`, and `getObstacleTokenUrls`; verify with comprehensive unit tests in `src/ui/combat/obstacleAssets.test.ts`.
- [x] 2.2 Add obstacle token URLs to the combat image preloader in `src/ui/combat/` to prevent asset pop-in during combat initialization; verify preloader integration tests pass.

## 3. HexGridSvg Obstacle Rendering

- [x] 3.1 Update `src/ui/combat/HexGridSvg.tsx` to render the 68×68 pixel standee `<image>` on obstacle tiles anchored to the top surface elevation (`topY - 48`) with `filter="url(#standee-drop-shadow)"` and `className="pixel-art"`; verify rendering visually or via static markup snapshot.
- [x] 3.2 Update `src/ui/combat/HexGridSvg.test.tsx` to assert that `<image>` tags are generated with the correct rotation paths and coordinates on obstacle hexes while retaining the `obstacle-ruins-glyph` container and `RUINS` badge.

## 4. Verification & Active Plan Tracking

- [x] 4.1 Execute full test suite (`cmd.exe /c npm test`) to verify zero regressions across combat, grid, and UI components.
- [x] 4.2 Update `docs/plans/ACTIVE.md` Item 5.2 marking ruins token implementation complete.
