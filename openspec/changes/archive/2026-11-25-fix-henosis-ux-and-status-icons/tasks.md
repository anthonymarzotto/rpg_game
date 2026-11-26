# Tasks

## 1. Core Combat Validation & Charmed-Vessel Lockout

- [x] 1.1 Update `checkActiveSourceConditionCap` in `src/core/combat/validator.ts` to name active vessel holder(s) in its rejection reason (preserving `"already active"` phrasing), and export `getAbilityCastLockoutReason(state, actorCu, ability)` covering `oncePerTurn`, `maxActivePerSource`, and insufficient AP; verify by running `cmd.exe /c npx vitest run src/core/combat/validator.test.ts`.
- [x] 1.2 Add unit tests in `src/core/combat/validator.test.ts` covering `getAbilityCastLockoutReason` (`Henosis` active vessel name, `oncePerTurn` already used, insufficient AP, and castable ability returning `undefined`) and confirming that a Theurge's `Henosis` remains locked out when their active vessel is `CHARMED` by an enemy; verify via `cmd.exe /c npx vitest run src/core/combat/validator.test.ts src/core/combat/theurgeIntegration.test.ts`.

## 2. Battlefield Standee Condition Badges

- [x] 2.1 Refactor `HexGridSvg` standee status bubble icon and `hasDebuff` derivation in `src/ui/combat/HexGridSvg.tsx` to use `formatConditionBadge` from `src/ui/combat/conditionBadges.ts` so `MORTAL_EBB` (`🕯️`), `CHARMED` (`💘`), and `BLINDED` (`🕶️`) render with their canonical icons and debuff border color rather than falling through to gold `✨`, and add rendering tests in `src/ui/combat/HexGridSvg.test.tsx`; verify via `cmd.exe /c npx vitest run src/ui/combat/HexGridSvg.test.tsx`.

## 3. Action Bar Lockout Disabling & Tooltip Reason

- [x] 3.1 Add an optional `disabledReason?: string` prop and styled unavailable banner to `AbilityHoverTooltipBody` in `src/ui/common/AbilityDescriptionBlock.tsx` and `src/ui/common/AbilityDescriptionBlock.css`, then wire `state?: CombatState` into `ActionBar` (`src/ui/combat/ActionBar.tsx`, passed from `src/ui/combat/CombatArena.tsx`) to disable buttons via `getAbilityCastLockoutReason` while keeping full hover tooltips readable; verify `.ability-btn-wrapper:hover` still reveals tooltips over disabled buttons.
- [x] 3.2 Add unit tests in `src/ui/combat/ActionBar.test.tsx` verifying disabled button state and tooltip reason rendering (alongside full skill description) for active `Henosis` vessel lockout, used `oncePerTurn` abilities, and insufficient AP; verify via `cmd.exe /c npx vitest run src/ui/combat/ActionBar.test.tsx src/ui/combat/CombatArena.test.tsx`.

## 4. Release Metadata & Full Verification

- [x] 4.1 Bump `package.json` version from `0.25.0` to `0.25.1`, add a strictly end-user-facing `0.25.1` release note entry in `CHANGELOG.md` summarizing the clearer battlefield status icons and disabled Action Bar ability tooltip explanations, and verify `package.json` and `CHANGELOG.md` reflect `0.25.1`.
- [x] 4.2 Run the full test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`) and verify both succeed with zero errors.
