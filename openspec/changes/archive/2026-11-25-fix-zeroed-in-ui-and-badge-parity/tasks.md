# Tasks

## 1. Unified Status Badge Aggregator & Zeroed In Formatter

- [x] 1.1 Add `formatZeroedInBadge(stacks)` and export `getUnitStatusBadges(cu, getUnitName)` in `src/ui/combat/conditionBadges.ts` aggregating `virtualElevation`, `zeroedInStacks`, `activeConditions`, and `activeModifiers` with stable key/test-id suffixes (`virtual-elevation`, `zeroed-in`, `cond-N`, `mod-N`), canonical icons, and `isDebuff` flags; verify via TypeScript check and downstream UI tests.
- [x] 1.2 Refactor `HexGridSvg` (`src/ui/combat/HexGridSvg.tsx`) to consume `getUnitStatusBadges` for standee pill `statusIcons`, `hasDebuff` border color, and `StandeeStatusBubble` hover tooltip entries so `Zeroed In` renders both `🔭` and its rich hover tooltip, and add rendering tests in `src/ui/combat/HexGridSvg.test.tsx`; verify via `cmd.exe /c npx vitest run src/ui/combat/HexGridSvg.test.tsx`.

## 2. Character Card, Action Bar Passives Tray & Target Preview Parity

- [x] 2.1 Update `src/ui/combat/UnitStatusCard.tsx` to route `renderUnitStatusBadges` through `getUnitStatusBadges`, add `'zeroed_in'` (`🔭`, `(N/3)` counter, ready glow, and calibration tag) to `getPassiveIcon`, exported `getPassiveChipState`, and `PassiveTooltipContent`, and add the `🔭 Zeroed In` indicator badge in the Target Preview header; add unit tests in `src/ui/combat/UnitStatusCard.test.tsx` and verify via `cmd.exe /c npx vitest run src/ui/combat/UnitStatusCard.test.tsx`.
- [x] 2.2 Update `ActionBar` (`src/ui/combat/ActionBar.tsx`) passives tray to use shared `getPassiveChipState` (passing `readyTag` to `PassiveTooltipContent`) so `Zeroed In`, `Coiled Apex`, and `Momentum` all render live counters and ready glow consistently; add unit tests in `src/ui/combat/ActionBar.test.tsx` and verify via `cmd.exe /c npx vitest run src/ui/combat/ActionBar.test.tsx`.

## 3. Turn-End Accumulation Floater

- [x] 3.1 Update `handleEndTurn` in `src/ui/combat/useCombatSimulation.ts` to emit `Zeroed In (<nextStacks>/3)` floating combat text when a unit with `Zeroed In` ends their turn stationary below max stacks, and add a unit test in `src/ui/combat/useCombatSimulation.test.tsx`; verify via `cmd.exe /c npx vitest run src/ui/combat/useCombatSimulation.test.tsx`.

## 4. Release Metadata & Full Verification

- [x] 4.1 Bump `package.json` version from `0.25.1` to `0.25.2`, add a strictly end-user-facing `0.25.2` release note entry in `CHANGELOG.md` summarizing the clearer `Zeroed In` HUD badges, tooltips, passive counters, and turn-end feedback, and verify `package.json` and `CHANGELOG.md` reflect `0.25.2`.
- [x] 4.2 Run the full test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`) and verify both succeed with zero errors.
