# Tasks

## 1. Skirmish Retreat Fall Damage, Elevation Traversal & Cat Burglar Vaulting (B.11)

- [x] 1.1 In `src/core/combat/effects/retreatHandler.ts`, evaluate elevation delta $\Delta h$ between origin and destination hex, abort retreat if $\Delta h > \text{maxClimbElevation}$, and apply `calculateRawFallDamage` and `resolveFallDamage` when plunging down ledges ($\Delta h \le -2$).
- [x] 1.2 Emit atomic `DAMAGE` event with `reason: 'FALL'`, update `res.fallDamage`, and append fall damage details to log output in `retreatHandler.ts`.
- [x] 1.3 In `src/core/types/passive.ts`, add `readonly canVaultOnRetreat?: boolean` to `PassiveTrait`.
- [x] 1.4 In `src/data/packages/catBurglar.ts`, configure `canVaultOnRetreat: true` on `FELINE_GRACE`.
- [x] 1.5 In `src/core/combat/effects/retreatHandler.ts`, implement vaulting logic when `canVaultOnRetreat` is present: vaulting onto cliff tops ($\Delta h > \text{maxClimbElevation}$) and vaulting over adjacent 1-hex obstacles.
- [x] 1.6 Add unit tests in `src/core/combat/displacement.test.ts` verifying that `Skirmish` plunging down 2 elevation tiers inflicts 8 unmitigated fall damage, impossible climbs are rejected for standard units, and units with `canVaultOnRetreat` successfully vault up cliffs and over obstacles.

## 2. Single-Target Ability Hostile Faction Validation (B.12)

- [x] 2.1 In `src/core/combat/validator.ts`, update `canExecuteAbility` for `targetType: 'SINGLE_TARGET'` to reject same-faction friendly targets regardless of `damageType`.
- [x] 2.2 Add unit tests in `src/core/combat/conditions.test.ts` or validator tests verifying that `Challenging Shout` and other non-damaging single-target abilities reject friendly units and permit only hostile targets.

## 3. Attack Roll Modifier Breakdown Data Modeling (B.13 Core)

- [x] 3.1 In `src/core/combat/types.ts` and `src/core/combat/attackRoll.ts`, define `AttackModifierComponent` and include `modifierBreakdown: readonly AttackModifierComponent[]` in `AttackRollContext`, `AttackRollResult`, and `DiceRollBreakdown`.
- [x] 3.2 In `src/core/combat/attackRoll.ts`, populate the breakdown with itemized entries for base attribute, elevation high/low ground modifiers, protective auras, and active conditions.
- [x] 3.3 In `src/core/combat/resolver.ts`, attach `attackRollBreakdown` to `CombatLogMetadata` and verify in unit tests that low ground (-2) is tracked as an explicit breakdown component.

## 4. In-Engine Glassmorphic Hover Tooltip on Attack Roll Chips (B.13 UI)

- [x] 4.1 In `src/ui/combat/CombatLogPanel.tsx`, enhance the roll chip (`🎲 d20 + mod vs DC`) to render an in-engine hover tooltip displaying the itemized attack roll modifier breakdown and formula.
- [x] 4.2 In `src/ui/combat/DiceTumblerTray.tsx`, render an in-engine hover tooltip on the roll equation modifier displaying the same structured breakdown.
- [x] 4.3 In `src/ui/combat/CombatArena.css` (or `CombatLogPanel.css` / `DiceTumblerTray.css`), add dark glassmorphism styling for `.attack-roll-tooltip` matching existing engine tooltip standards.
- [x] 4.4 Add component unit tests in `src/ui/combat/CombatLogPanel.test.ts` and `src/ui/combat/DiceTumblerTray.test.tsx` verifying that hovering the roll chip renders the modifier breakdown tooltip.

## 5. Documentation, Versioning & Verification

- [x] 5.1 Update `docs/plans/ACTIVE.md` marking B.11, B.12, and B.13 complete.
- [x] 5.2 Update `CHANGELOG.md` documenting v0.9.2 patch release notes and bump version to `0.9.2` in `package.json`.
- [x] 5.3 Run `npm test` across all test suites to verify zero regressions.
- [x] 5.4 Run `npm run build` to verify clean TypeScript compilation and production bundle generation.
