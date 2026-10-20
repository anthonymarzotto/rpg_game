# Tasks

## 1. XP Summary Core Utility

- [x] 1.1 Create `src/ui/combat/combatXpUtils.ts` with `getCombatUnitXpSummary(cu: CombatUnit)` calculating Force, Finesse, and Focus base XP, in-battle gains, projected totals, next level thresholds, and ascension readiness; verify with tests in `src/ui/combat/combatXpUtils.test.ts`.
- [x] 1.2 Add edge case tests in `src/ui/combat/combatXpUtils.test.ts` covering zero battle gains, exact threshold crossings, overflow gains, max level cap (Level 9), and nullish fallback for units missing `accumulatedXp`.

## 2. UnitStatusCard UI & Inspection

- [x] 2.1 Update `src/ui/combat/UnitStatusCard.tsx` to replace the legacy `.hud-xp-tally` on the active player unit card with the new inline tracker displaying Force, Finesse, Focus totals, `(+N)` delta badges when `> 0`, and the next level threshold header.
- [x] 2.2 Extend the inspected unit card in `src/ui/combat/UnitStatusCard.tsx` to render the XP tracker when hovering allied combatants (`cu.faction === 'PLAYER'`), while omitting it for enemy combatants.
- [x] 2.3 Add styles in `src/ui/combat/CombatArena.css` for `.hud-xp-tracker`, `.hud-xp-stat`, `.hud-xp-gain`, and `.hud-xp-ready` (astral gold glow).

## 3. Verification & Plan Synchronization

- [x] 3.1 Update `src/ui/combat/UnitStatusCard.test.tsx` to verify active card rendering, `(+0)` omission, `(+N)` delta display, ascension `✦` ready badge, and allied inspection card rendering.
- [x] 3.2 Run the full test suite (`npm test`) via `cmd.exe /c npm test` to ensure all unit and combat tests pass cleanly without regressions.
- [x] 3.3 Check off item 4.4 in `docs/plans/ACTIVE.md`.
