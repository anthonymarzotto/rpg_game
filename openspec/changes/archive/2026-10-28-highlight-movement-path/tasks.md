# Tasks

## 1. Movement Path SVG Layer Implementation

- [x] 1.1 Implement `<g className="movement-path-layer">` in `src/ui/combat/HexGridSvg.tsx` to render projected 2.5D path segments between consecutive steps in `movePreview.path` positioned above terrain tiles and below unit standees, verifying with unit tests in `HexGridSvg.test.tsx`.
- [x] 1.2 Render glowing waypoint beads at intermediate hex centers and a landing reticle at the destination tile in `HexGridSvg.tsx`, verifying with DOM query assertions in `HexGridSvg.test.tsx`.
- [x] 1.3 Implement dynamic elevation delta checking per segment to apply warning crimson styling and hazard markers on cliff drops ($\Delta h \le -2$), verifying with elevation drop test scenarios in `HexGridSvg.test.tsx`.

## 2. Path Styling & Visual Flow

- [x] 2.1 Add CSS classes and streaming dash keyframe animations for `.movement-path-layer`, `.movement-path-segment`, and `.movement-path-hazard` in `src/ui/combat/CombatArena.css`, verifying that styles compile without CSS or Vite errors.

## 3. Verification, Documentation & Version Bump

- [x] 3.1 Update CHANGELOG.md and bump the version to `0.8.0` in `package.json`, verifying version metadata.
- [x] 3.2 Update `docs/plans/ACTIVE.md` marking **UX.1** as completed.
- [x] 3.3 Run `cmd.exe /c npm run build` and full test suite (`cmd.exe /c npm test`) to verify clean typechecking, bundle generation, and green test passes.
