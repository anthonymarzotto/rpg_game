# Tasks

## 1. Typography & Styling Enhancements

- [x] 1.1 Update `CombatArena.css` floating combat text styling with `transform-box: fill-box; transform-origin: center;`, verifying CSS rules compile cleanly.
- [x] 1.2 Update `HexGridSvg.tsx` floating text layer to render native SVG stroke outlines (`paint-order: stroke fill; stroke: rgba(0, 0, 0, 0.85); stroke-width: 3.5; stroke-linejoin: round;`) and elevated base anchor (`y - 36`), verifying SVG attributes in `HexGridSvg.test.tsx`.

## 2. FloatingText Tier Contract & Sizing

- [x] 2.1 Add `FloatingTextTier` type (`'impact' | 'standard' | 'utility'`) and optional `tier` property to `FloatingText` in `useFloatingCombatText.ts`, emit appropriate tiers in `collectResolutionFloatingTexts` and `collectInitiativeFloatingTexts`, and add `getDefaultFloaterTier` fallback helper, verifying unit tests in `useFloatingCombatText.test.tsx`.
- [x] 2.2 Define `FLOATER_TIER_STYLES` dictionary in `HexGridSvg.tsx` to map tiers directly to concrete typography (26px for impact, 21px for standard, 16px for utility), verifying typography lookup in `HexGridSvg.test.tsx`.
- [x] 2.3 Implement dynamic vertical stacking offset (`y - 36 - (index * 18)`) for concurrent floaters sharing the same hex coordinate in `HexGridSvg.tsx`, verifying stacking layout tests in `HexGridSvg.test.tsx`.

## 3. Tiered Sizing Architecture Finalization & Cleanup

- [x] 3.1 Lock in Tiered presentation directly via `FLOATER_TIER_STYLES` in `HexGridSvg.tsx` and ensure clean decoupling from unrelated UI state.
- [x] 3.2 Verify test coverage in `HexGridSvg.test.tsx` for elevated anchors, dark silhouette stroke outlines, vertical stacking offsets, and standard tier sizing.

## 4. Verification & Release

- [x] 4.1 Run full test suite (`npm test`) and verify all tests pass without regressions.
- [x] 4.2 Run `npm run build` to ensure clean TypeScript type-checking and production bundle generation.
- [x] 4.3 Update `CHANGELOG.md` with UX.9 floating combat text readability improvements and bump version to `0.9.3` in `package.json`.
