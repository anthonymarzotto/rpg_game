# Tasks

## 1. Core Combat State Initiative Seeding

- [x] 1.1 Update `createCombatState` in `src/core/combat/resolver.ts` to seed each unit's `initiativeGauge` with a 1d20 roll ($1\text{--}20$) using a `DiceRoller` (accepting an optional custom/seeded roller) and verify via unit tests in `resolver.test.ts`.
- [x] 1.2 Record an opening combat log event in `createCombatState` with actionId `'initiative'` documenting each combatant's name and rolled initiative, verifying via tests in `resolver.test.ts`.
- [x] 1.3 Add unit tests verifying deterministic rolling with `SeededDiceRoller`, non-zero opening gauges, and player tie-breaking priority when gauge and speed tie.

## 2. Battlefield UI Floating Combat Text

- [x] 2.1 Add Turn 0 opening floating combat text (`🎲 <roll>`) above each combatant's hex position on arena mount in `CombatArena.tsx` / `useFloatingCombatText.ts`, and verify via tests in `useFloatingCombatText.test.tsx` and `CombatArena.test.tsx`.
- [x] 2.2 Verify that `InitiativeRibbon` displays the initial turn order correctly on frame 1 without delay or modal interruption, testing via `InitiativeRibbon.test.tsx`.

## 3. Verification & Test Suite Integrity

- [x] 3.1 Run the complete test suite via `cmd.exe /c npm test` and ensure all unit and integration tests pass cleanly with the new initiative seeding.

## 4. Anti-Alpha-Strike Guardrail & Staggered Roll Presentation

- [x] 4.1 Implement $\lceil \text{squadSize}/2 \rceil$ anti-blowout guardrail in `createCombatState` (in `src/core/combat/resolver.ts`) so neither team can exceed 2 consecutive opening turns in a 3v3 battle. Verify with unit tests in `resolver.test.ts`.
- [x] 4.2 Stagger floating combat text rolls by 250ms per unit in turn order with click-to-skip in `useFloatingCombatText.ts` / `useCombatSimulation.ts`, and pause opening turn actions until rolls conclude. Verify via tests.
- [x] 4.3 Run full test suite (`cmd.exe /c npm test`) to ensure all 700+ tests pass with the guardrail and staggered timing.
