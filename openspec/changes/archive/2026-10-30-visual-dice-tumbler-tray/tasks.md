# Tasks: Visual Dice Tumbler Tray

## 1. Core Dice Breakdown & Resolver Extension

- [x] 1.1 Define `DamageDieRoll` and `DiceRollBreakdown` interfaces in `src/core/combat/types.ts` and attach optional `diceBreakdown` to `AttackResolution`. Verify types with `npx tsc --noEmit`.
- [x] 1.2 Update `src/core/combat/attackRoll.ts` to capture raw d20 rolls (including dual rolls for Advantage/Disadvantage) and individual damage dice rolls within `AttackResolution.diceBreakdown`. Verify with comprehensive tests in `src/core/combat/attackRoll.test.ts`.
- [x] 1.3 Verify that `executeAbility` in `src/core/combat/resolver.ts` preserves and forwards `diceBreakdown` in returned resolution results across all attack abilities.

## 2. Visual Dice Tumbler Tray Component

- [x] 2.1 Create `src/ui/combat/DiceTumblerTray.tsx` with procedural SVG polyhedral dice rendering (d20, d8, d6, etc.), two-stage animation state machine (attack check then damage roll), advantage die dimming, and hit outcome stamps.
- [x] 2.2 Create `src/ui/combat/DiceTumblerTray.css` providing the celestial glassmorphic top-banner styling, tumbling keyframes, snap landings, crit flares, and responsive layout.
- [x] 2.3 Implement click-to-skip and Spacebar dismissal listeners in `DiceTumblerTray.tsx` to immediately complete active rolls. Add comprehensive component tests in `src/ui/combat/DiceTumblerTray.test.tsx`.

## 3. Combat Simulation Integration & UI Header Controls

- [x] 3.1 Add `isDiceTrayEnabled` toggle state with `localStorage` persistence and add the `[🎲 Tray: ON/OFF]` button to the combat header in `src/ui/combat/CombatArena.tsx`. Verify button toggles state.
- [x] 3.2 Wire `activeDiceRoll` state in `src/ui/combat/useCombatSimulation.ts` to trigger `DiceTumblerTray` on player attacks when enabled, deferring floating combat text until completion or skip. Verify that turning the tray off provides instant resolution.
- [x] 3.3 Verify that enemy hostile turns in `src/ui/combat/asyncTurnSequencer.ts` continue executing smoothly without triggering or waiting on the player dice tray.

## 4. Verification, Documentation & Release

- [x] 4.1 Update plan documents: move the Visual Dice Tumbler Tray item from `docs/plans/ROADMAP.md` (Horizon 3.1) into `docs/plans/ACTIVE.md`, track in `In Progress`, and mark completed upon implementation.
- [x] 4.2 Update `CHANGELOG.md` documenting the Visual Dice Tumbler Tray feature under version `0.9.0` and bump `version` in `package.json` to `0.9.0`.
- [x] 4.3 Run `npm test` and `npm run build` to verify clean compilation, zero regressions, and passing test suites across core and UI modules.
