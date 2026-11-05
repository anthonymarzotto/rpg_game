# Tasks: Combat Turn Pacing and Clarity

## 1. Turn End Feedback & Combat Log Turn Dividers

- [x] 1.1 Update turn completion floating text in `src/ui/combat/useCombatSimulation.ts` and `src/ui/combat/asyncTurnSequencer.ts` to emit `"Turn End"` on 0 unspent AP and preserve `"+X Initiative"` only when AP is banked, eliminating `"+0 Initiative"`. Verify via `npm test -- src/ui/combat/useCombatSimulation.test.tsx`.
- [x] 1.2 Implement visual turn header divider banners (`━━━ Turn X • [Name] ━━━`) in `src/ui/combat/CombatLogPanel.tsx` and style them in `src/ui/combat/CombatLogPanel.css` without modifying action card details. Verify via `npm test -- src/ui/combat/CombatLogPanel.test.tsx`.

## 2. Active Token Beacon Pulse & Turn Start Call-Out

- [x] 2.1 Add an expanding SVG beacon ripple pulse on the active unit's hex pedestal in `src/ui/combat/HexGridSvg.tsx` when a unit becomes the active combatant. Verify via `npm test -- src/ui/combat/HexGridSvg.test.tsx`.
- [x] 2.2 Add turn start floating combat text (`"My Turn!"` for players, unit name for hostiles) upon turn initiation in `src/ui/combat/useCombatSimulation.ts`. Verify via `npm test -- src/ui/combat/useFloatingCombatText.test.ts`.

## 3. Circular Progress Rings & Paced Clock Stepping on CTB Ribbon

- [x] 3.1 Implement dynamic circular SVG progress rings around chip avatars in `src/ui/combat/InitiativeRibbon.tsx` and `src/ui/combat/InitiativeRibbon.css` that fill clockwise from 0% to 100% based on initiative gauge relative to the turn threshold. Verify via `npm test -- src/ui/combat/InitiativeRibbon.test.tsx`.
- [x] 3.2 Implement visual clock advancement pacing (~1.0s duration scaled by tick count when ticks > 0, immediate when 0 ticks) during turn handoff in `src/ui/combat/useCombatSimulation.ts`. Verify via `npm test -- src/ui/combat/asyncTurnSequencer.test.ts`.

## 4. Versioning, Changelog & Build Verification

- [x] 4.1 Bump version to `0.11.0` in `package.json` and add strictly end-user facing release notes in `CHANGELOG.md` covering the animated CTB gauge rings, paced turn transitions, turn start/end cues, and combat chronicle dividers. Verify changelog formatting.
- [x] 4.2 Run test suite via `npm test` and execute `npm run build` to verify clean compilation with no type or lint errors.
