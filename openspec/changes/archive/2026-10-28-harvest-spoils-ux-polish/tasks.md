# Tasks

## 1. Stepper Layout & Number Formatting

- [x] 1.1 Convert `.stepper-row` to a 3-column CSS grid (`54px 1fr 64px`) with centered alignment in `HarvestDistributionModal.css`, and add horizontal spacing to `.btn-step` (`margin: 0 4px`).
- [x] 1.2 In `HarvestDistributionModal.tsx`, format stepper values as plain integers (`{currentAlloc}`) without a leading `+` sign.
- [x] 1.3 Verify existing tests pass with `npm test -- src/ui/combat/HarvestDistributionModal.test.tsx`.

## 2. Unit Progression Requirement & Milestone Badges

- [x] 2.1 In `HarvestDistributionModal.tsx`, compute level progression thresholds using `LEVEL_XP_THRESHOLDS` and render `Level {level} (Req: {threshold} XP)` (or `(MAX)`) in `unit-card-meta`.
- [x] 2.2 In `HarvestDistributionModal.tsx`, replace `.stepper-projected` with `.stepper-projected-pill`, displaying projected totals and rendering a `★` indicator when `baseVal + currentAlloc >= threshold`.
- [x] 2.3 In `HarvestDistributionModal.css`, add styling for `.stepper-projected-pill` with allocated highlights and radiant milestone glows (`.threshold-met`, `.milestone-star`).
- [x] 2.4 Update `HarvestDistributionModal.test.tsx` with tests verifying level requirement rendering in the card header and milestone star indicators on qualifying rows.

## 3. Tooltip Action Validation & Footer Cleanup

- [x] 3.1 In `HarvestDistributionModal.tsx`, remove `.status-warning` from `.harvest-footer-status`, and wrap the confirm button in a container providing `title="Allocate all remaining XP to continue"` when `!isPoolDepleted`.
- [x] 3.2 In `HarvestDistributionModal.css`, clean up footer layout to center or right-align the action button without status text clutter.
- [x] 3.3 Add tests in `HarvestDistributionModal.test.tsx` verifying that the warning tooltip is present when pool has unallocated points and omitted when depleted.

## 4. Release Preparation & Verification

- [x] 4.1 Update `package.json` version to `0.7.2` and document the UX improvements in `CHANGELOG.md`.
- [x] 4.2 Run `npm test` across all test suites and verify `npm run build` passes with zero type or bundling errors.

## 5. Master-Detail Layout Evolution

- [x] 5.1 Implement Master-Detail layout in `HarvestDistributionModal.tsx` with a left squad dock selector and right unit inspector panel.
- [x] 5.2 Style `.harvest-main-layout`, `.harvest-squad-dock`, and `.harvest-inspector-panel` in `HarvestDistributionModal.css`, expanding stepper rows to `100px 1fr 90px` to eliminate overflow.
- [x] 5.3 Add unit tests in `HarvestDistributionModal.test.tsx` for dock item rendering, selection state, and inspector content.
- [x] 5.4 Verify test suite and build succeed with `npm test` and `npm run build`.
