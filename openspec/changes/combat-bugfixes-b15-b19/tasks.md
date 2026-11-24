# Tasks

## 1. Theurge Token Asset Parity (B.19)

- [x] 1.1 Perform a case-safe two-step Git rename of `public/assets/tokens/pixel/79_human_male/idle` to `public/assets/tokens/pixel/79_human_male/Idle`, update `"folder"` and frame paths in `public/assets/tokens/pixel/79_human_male/metadata.json`, and verify `git ls-files public/assets/tokens/pixel/79_human_male` lists `Idle/rotations/*.png`.
- [x] 1.2 Add a case-sensitive filesystem parity test in `src/ui/combat/tokenAssets.test.ts` validating via `fs.readdirSync` that every entry in `AVAILABLE_PIXEL_TOKENS` has an exact-case `Idle` subdirectory and all 8 rotation PNG files on disk, and verify `cmd.exe /c npx vitest run src/ui/combat/tokenAssets.test.ts` passes.

## 2. Combat Log Effect Tooltip Containment (B.17)

- [x] 2.1 Update `.effect-badge-tooltip` wrapping and row alignment rules in `src/ui/combat/CombatArena.css` (overriding `white-space: nowrap` for tooltip rows and summaries) and adjust `CONTEXT` presentation in `src/ui/combat/CombatLogPanel.tsx` so prose descriptions such as `Graze Mitigation` (`GRAZE_NEGATED`) render inside `tooltipSummary` rather than overflowing a narrow value column; verify with `CombatLogPanel.test.ts` assertions covering `GRAZE_NEGATED` tooltip output.

## 3. Source-Defeated Condition Cleanup & Combat Log Cards (B.15)

- [x] 3.1 Add declarative `clearWhenSourceDefeated?: boolean` to `ConditionDefinition` in `src/core/combat/conditions.ts` (enabled on `CHALLENGED`, `CHARMED`, and `HENOSIS`) and implement `purgeConditionsFromDefeatedSource(state, defeatedUnitId)` invoking `onRemoved` (without triggering `onExpireApplyCondition`) and emitting `combatLogger.logConditionBroken` with `reason: 'source_defeated'`; add unit tests in `src/core/combat/conditions.test.ts` and verify they pass.
- [x] 3.2 Wire `purgeConditionsFromDefeatedSource` into all four core defeat sites (`src/core/combat/resolver.ts` damage defeat and self-sacrifice `hpCost` defeat, `src/core/combat/turnClock.ts` lethal DoT defeat, and `src/core/combat/battlefieldZones.ts` delayed bombardment defeat), and add integration tests covering defeat via attack damage, DoT, self-sacrifice, and bombardment (verifying `CHALLENGED` clears, `CHARMED` reverts faction, and `HENOSIS` clears without `MORTAL_EBB`); verify targeted Vitest suites pass.
- [x] 3.3 Update `CONDITION_BROKEN` rendering in `src/ui/combat/CombatLogPanel.tsx` to branch on `reason === 'source_defeated'` and render condition-specific cleared badges (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, `✨ HENOSIS CLEARED`) distinct from `⚔️ CHALLENGE DEFIED`; add rendering tests in `src/ui/combat/CombatLogPanel.test.ts` and verify they pass.

## 4. Coiled Apex Math Fix, Persistence & UI Visibility (B.18)

- [x] 4.1 Fix `virtualElevation` double-counting between `src/core/combat/resolver.ts` / `src/core/combat/targetPreview.ts` and `src/core/combat/attackRoll.ts` so `+1 Virtual Height` yields `+2` attack bonus (not Advantage), and update `endActiveTurn` in `src/core/combat/turnClock.ts` so armed `virtualElevation` persists across non-attacking turns until consumed by an attack roll; update and expand tests in `src/core/combat/effects/dragoonMechanics.test.ts`, `src/core/combat/attackRollContext.test.ts`, and `src/core/combat/targetPreview.test.ts` and verify they pass.
- [x] 4.2 Surface armed `Coiled Apex` (`virtualElevation > 0`) in the combat UI: add `coiled_apex` icon (`🐉`), `ready-glow`, and `(+1 Height)` counter on active/inspected `UnitStatusCard` passive chips; add a `formatVirtualElevationBadge` buff pill with hover tooltip in `src/ui/combat/conditionBadges.ts` and `src/ui/combat/UnitStatusCard.tsx`; add a Target Preview indicator badge; add an overhead `🐉` icon in `src/ui/combat/HexGridSvg.tsx`; and emit `Coiled Apex (+1 Height)` turn-end floating text in `src/ui/combat/useCombatSimulation.ts`; add/update UI tests in `UnitStatusCard.test.tsx` and `HexGridSvg.test.tsx` and verify they pass.

## 5. Verification, Balance Check & Release Metadata

- [x] 5.1 Re-run the full unit/integration test suite (`cmd.exe /c npm test`) and balance/synergy playtest suites (`cmd.exe /c npm run sim` / `npm run sim:support` / `npm run sim:matrix` or relevant class benchmark suites) to confirm all tests pass and clearing `CHALLENGED` / `CHARMED` / `HENOSIS` on source defeat causes no unintended balance regressions.
- [x] 5.2 Bump `package.json` version from `0.23.0` to `0.23.1` and add a strictly end-user facing `0.23.1` release entry to `CHANGELOG.md` (covering cleared conditions on source defeat, Coiled Apex visibility/accuracy, Combat Log tooltip layout, and Theurge token visibility, with no technical or internal details); verify `package.json` and `CHANGELOG.md` match.
- [x] 5.3 Run `cmd.exe /c npm run build` and verify the TypeScript compile and Vite production bundle succeed cleanly with zero errors.
