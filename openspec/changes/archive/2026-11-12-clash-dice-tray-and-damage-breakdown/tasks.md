# Tasks

## 1. Core Damage Breakdown Metadata & Combat Logging

- [x] 1.1 Define `DamageComponentSource` and `DamageBreakdownComponent` in `src/core/combat/types.ts`, and extend `DiceRollBreakdown` and `CombatLogMetadata` (`ATTACK` variant) with `mitigation?: number`, `mitigationType?: 'Armor' | 'Ward'`, `critMaxBonus?: number`, and `damageBreakdownComponents?: readonly DamageBreakdownComponent[]` (verify with `npx tsc --noEmit`).
- [x] 1.2 Update `resolveDamage` in `src/core/combat/damageEngine.ts` to populate `mitigationType`, `critMaxBonus`, and itemized `damageBreakdownComponents` (base dice, crit max dice, bonus dice, base attribute bonus, flat/shard bonus, named passive bonuses, Armor/Ward mitigation, Graze/Cover multipliers, and minimum 1 damage floor), and forward them in `src/core/combat/resolver.ts` and `src/core/combat/combatLogger.ts` (verify with unit tests in `src/core/combat/resolution.test.ts`).

## 2. Shared Damage Roll Tooltip & Combat Log Integration

- [x] 2.1 Create `src/ui/combat/DamageRollTooltip.tsx` providing an in-engine portal hover popover displaying itemized `DamageBreakdownComponent[]` rows and final damage summary, supporting `placement="left"` and `placement="top"` (verify with `npx tsc --noEmit`).
- [x] 2.2 Update `src/ui/combat/CombatLogPanel.tsx` to parse `damageBreakdownComponents` on `ATTACK` log entries and render `<DamageRollTooltip />` when hovering the `.impact-damage` chip, adding unit tests in `src/ui/combat/CombatLogPanel.test.ts` (verify with `npx vitest run src/ui/combat/CombatLogPanel.test.ts`).

## 3. Clash Duel Dice Tray, Spoiler-Free Equations & Soak Math

- [x] 3.1 Update `src/ui/combat/DiceTumblerTray.tsx` and `src/ui/combat/DiceTumblerTray.css` to:
  - Render the Clash Duel header with directional Attacker (`SOUTHEAST`) and Defender (`SOUTHWEST`) pixel tokens, pre/post-attack HP display, and stage-driven animations (lunge on `STAGE1_SETTLE`, sidestep on `MISS`, hit shake/flash on `STAGE2_SETTLE`, and `💀 DEFEATED` badge/state when `targetHpAfter === 0`).
  - Hide the Stage 1 score equation during `STAGE1_TUMBLE` and hide the Stage 2 damage equation during `STAGE2_TUMBLE` (`UX.11`).
  - Simplify the miss outcome stamp from `'EVADED / MISS'` to `'MISS'` (`UX.6`).
  - Render Armor/Ward soak subtraction and critical max bonus in the settled Stage 2 damage equation (`B.14`) and attach `<DamageRollTooltip placement="top" />` (`UX.14`).
  - Adjust `DICE_TRAY_TIMINGS` to the slightly slower stage durations (`1000ms` tumbles, `1800ms` Stage 1 settle, `2200ms` Miss/Stage 2 settle) (verify with component tests in `src/ui/combat/DiceTumblerTray.test.tsx`).

## 4. Tri-State Dice Tray Mode, Enemy Turn Sequencing & Deferred Defeat

- [x] 4.1 Update `CombatExecutionObserver.onActionResolved` in `src/ui/combat/asyncTurnSequencer.ts` to support returning `void | Promise<void>` and `await` it in `executeHostileTurnAsync` before advancing to the next step (verify with tests in `src/ui/combat/asyncTurnSequencer.test.ts`).
- [x] 4.2 Update `src/ui/combat/useCombatSimulation.ts` and `src/ui/combat/CombatArena.tsx` to:
  - Replace the binary tray toggle with `DiceTrayMode` (`'ALL' | 'PLAYER_ONLY' | 'OFF'`, defaulting to `'ALL'` and persisted in `localStorage`) while preserving `isDiceTrayEnabled` compatibility.
  - Trigger `activeDiceRoll` on hostile attack abilities when `diceTrayMode === 'ALL'` and `aiSpeed !== 'INSTANT'`, awaiting completion or skip before continuing the hostile turn.
  - Pass `attackerUnit`, `targetUnit`, `targetHpBefore`, `targetHpAfter`, and `targetMaxHp` to `DiceTumblerTray` and keep a defeated target unit visible on the hex battlefield with its pre-attack HP while `activeDiceRoll` is active (verify with tests in `src/ui/combat/useCombatSimulation.test.tsx`).

## 5. Release Notes, Version Bump & Build Verification

- [x] 5.1 Update `CHANGELOG.md` with end-user facing release notes for `0.17.0` and bump `"version"` in `package.json` to `"0.17.0"` (verify `CHANGELOG.md` contains no internal IDs or file names).
- [x] 5.2 Run full test suite (`npm test`) and production build (`npm run build`) to verify zero regressions and clean compilation.

