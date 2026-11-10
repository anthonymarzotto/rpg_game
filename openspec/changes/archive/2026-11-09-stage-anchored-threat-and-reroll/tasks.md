# Tasks

## 1. Stage-Anchored Threat Calibration

- [x] 1.1 Implement `getStageHostileBonusThreat(stage: number): number` in `src/core/campaign/threatBudget.ts` and verify tests in `src/core/campaign/threatBudget.test.ts` pass
- [x] 1.2 Refactor `generateStageEncounter` in `src/core/campaign/encounterGenerator.ts` to compute target budget as `stageBudget + hostileBonus` decoupled from squad threat, and verify tests in `src/core/campaign/encounterGenerator.test.ts` pass

## 2. In-Camp War Room Trial Reroll Control

- [x] 2.1 Add `onRerollEncounter` prop and handler in `src/ui/camp/CampHub.tsx` calling `regenerateCurrentStageEncounter` and pass into `ExpeditionWarRoom`
- [x] 2.2 Add Re-roll Trial button in `src/ui/camp/ExpeditionWarRoom.tsx` with styling, and verify component tests in `src/ui/camp/ExpeditionWarRoom.test.tsx` and `src/ui/camp/CampHub.test.tsx` pass

## 3. Version Bump, Release Notes & Verification

- [x] 3.1 Bump version to `0.14.1` in `package.json` and author end-user facing release notes in `CHANGELOG.md`
- [x] 3.2 Execute full test suite with `cmd.exe /c npm test` and production bundle build with `cmd.exe /c npm run build` to verify clean builds without regressions
