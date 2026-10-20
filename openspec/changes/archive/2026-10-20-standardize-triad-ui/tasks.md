# Tasks

## 1. Centralized Discipline Presentation Formatter

- [x] 1.1 Export `formatDisciplineName`, `formatDisciplineShort`, and `formatDisciplineBadge` from `src/ui/combat/combatXpUtils.ts` and add unit tests in `src/ui/combat/combatXpUtils.test.ts` verifying mapping from `'FIGHTER' | 'ROGUE' | 'MAGE'` to Force, Finesse, Focus, FRC, FIN, FOC, and uppercase badges.

## 2. Camp & Progression UI

- [x] 2.1 Update `src/ui/camp/HeroCard.tsx` XP progress bar labels from `Fighter`, `Rogue`, `Mage` to `Force`, `Finesse`, `Focus` and verify hero card renders the new labels.
- [x] 2.2 Update `src/ui/camp/HeroProgressionDrawer.tsx` level-up spend buttons to `⚔️ Ascend: Force (+1 Force)`, `🗡️ Ascend: Finesse (+1 Finesse)`, and `🔮 Ascend: Focus (+1 Focus)`.
- [x] 2.3 Update `src/ui/camp/HeroProgressionDrawer.tsx` wildcard ability dropdown options to display `(Force · {AP} AP)`, `(Finesse · {AP} AP)`, and `(Focus · {AP} AP)` using `formatDisciplineName`.
- [x] 2.4 Update `src/ui/camp/HeroProgressionDrawer.tsx` slotted wildcard header tags to render `FORCE`, `FINESSE`, `FOCUS` using `formatDisciplineBadge`.
- [x] 2.5 Update `src/ui/camp/HeroProgressionDrawer.tsx` Constellation Node Scanner hover tooltips from `1F / 1R / 0M` to `1 FRC / 1 FIN / 0 FOC`.
- [x] 2.6 Update `src/ui/camp/OffNodeChoiceModal.tsx` defensive attunement card tags and empty domain ability message to use `formatDisciplineBadge` and `formatDisciplineName`, and verify `OffNodeChoiceModal.test.tsx` passes.
- [x] 2.7 Update test assertions in `src/ui/camp/HeroProgressionDrawer.test.tsx` for new spend button copy and scanner shorthand, and verify tests pass.

## 3. Combat UI & Content Alignment

- [x] 3.1 Update `src/ui/combat/BattleVictoryModal.tsx` post-battle XP breakdown cards from `⚔️ Fighter`, `🗡️ Rogue`, `🔮 Mage` to `⚔️ Force`, `🗡️ Finesse`, `🔮 Focus`.
- [x] 3.2 Update `src/ui/combat/ActionBar.tsx` ability hover tooltip archetype tag pill using `formatDisciplineName` and verify `ActionBar.test.tsx` passes.
- [x] 3.3 Update Sorcerer *Spell Sculpt* description in `src/data/packages/sorcerer.ts` and combat log message in `src/core/combat/effects/spellSculptHandler.ts` from "next Mage spell" to "next Focus spell", and verify `tier2Mechanics.test.ts` passes.
- [x] 3.4 Rename novice sandbox training dummy from `Bandit Fighter A` to `Bandit Brute A` in `src/data/encounters/noviceSandbox.ts` and update `CombatLogPanel.test.ts`.

## 4. Verification & Integration

- [x] 4.1 Run full test suite with `cmd.exe /c npm test` and ensure all test files pass.
- [x] 4.2 Run TypeScript type check with `cmd.exe /c npx tsc --noEmit` and confirm 0 errors.
- [x] 4.3 Perform a repository-wide grep across `src/ui/` to verify zero residual occurrences of "Fighter", "Rogue", or "Mage" in user-facing UI markup.
