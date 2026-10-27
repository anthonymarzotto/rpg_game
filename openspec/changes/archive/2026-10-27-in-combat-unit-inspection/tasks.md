# Tasks: In-Combat Unit Inspection & Effect Tooltips

## 1. Smart Condition Badges & Rich Tooltips

- [x] 1.1 Implement condition badge source attribution (`by <Name>`) and tactical effect mnemonics (`Disadv`, `+Adv`, `2 dmg`) in `UnitStatusCard.tsx` and verify formatting with unit tests
- [x] 1.2 Implement instant, styled in-engine tooltips for active conditions and stat modifiers (replacing native browser `title` latency) in `UnitStatusCard.tsx` and verify hover styles in `CombatArena.css`
- [x] 1.3 Add interactive hover tooltips to the standee status bubble (`[ ⚔️ 🧪 ]`) in `HexGridSvg.tsx` so status effects can be inspected directly on the arena board without leaving target focus
- [x] 1.4 Add unit tests in `UnitStatusCard.test.tsx` and `HexGridSvg.test.tsx` verifying smart badge text, source name resolution, and tooltip content

## 2. In-Combat Unit Pinning & Ability Loadout Inspection

- [x] 2.1 Add `pinnedUnitId` state and selection logic to `useCombatSimulation.ts`, allowing clicking any unit or timeline ribbon chip in `IDLE` mode to pin them, and dismissing on empty tile click or `Escape` key
- [x] 2.2 Render persistent pinned inspector card in `UnitStatusCard.tsx` displaying the combatant's equipped ability loadout (name, AP cost, reach/range, description), remaining AP, and CTB gauge
- [x] 2.3 Render a distinct celestial selection bracket/ring in `HexGridSvg.tsx` around the currently pinned combatant
- [x] 2.4 Add unit tests in `useCombatSimulation.test.tsx` and `UnitStatusCard.test.tsx` verifying unit pinning, dismissal on empty click, and ability loadout display

## 3. Targeting Cancellation, Version Bump & Integration

- [x] 3.1 Implement canvas right-click handling in `CombatArena.tsx` to suppress default browser context menu and cancel `ABILITY` targeting back to `IDLE` mode, verified by component tests
- [x] 3.2 Run full test suite (`npm test`) and verify all tests pass with zero regressions
- [x] 3.3 Update `package.json` version to `0.7.0`, document changes in `CHANGELOG.md`, and update sprint status in `docs/plans/ACTIVE.md`
