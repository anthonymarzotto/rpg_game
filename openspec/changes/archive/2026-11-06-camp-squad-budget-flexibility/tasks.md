# Tasks

## 1. Domain Transition & State Decoupling

- [x] 1.1 Remove the hard threat budget exception from `setCampActiveSquad` in `src/core/campaign/transitions.ts` while preserving roster existence and non-empty squad validation; update `src/core/campaign/transitions.test.ts` to verify that setting an over-budget squad is accepted and synchronizes encounter placement without throwing.
- [x] 1.2 Update Camp handlers in `src/ui/camp/CampHub.tsx` (`handleBenchHero` and `handleSelectForSwap`) to ensure smooth squad adjustments without uncaught errors or silent swap suppression; verify in `src/ui/camp/CampHub.test.tsx` that benching from an over-budget squad updates the active squad.

## 2. Combat Deployment Gate & Integration Verification

- [x] 2.1 Update `src/ui/camp/ExpeditionWarRoom.tsx` to omit the inline over-budget warning and instead render the overage explanation as a tooltip (`title` attribute) on the disabled `✦ ENTER TRIAL` button, and add defense-in-depth validation in `handleDeploySquad` in `src/App.tsx`; verify with tests in `src/ui/camp/ExpeditionWarRoom.test.tsx`.
- [x] 2.2 Add comprehensive integration tests in `src/ui/camp/CampHub.test.tsx` verifying that a player whose Vanguard exceeds threat budget can withdraw units one-by-one until within budget, unlocking trial embarkation.

## 3. Versioning, Release Notes & Build Validation

- [x] 3.1 Bump version to `0.12.1` in `package.json` and add an end-user facing entry in `CHANGELOG.md` explaining that wayfarers can now be freely withdrawn or swapped in Camp when over threat budget, with trial entry safely disabled until the squad is within budget.
- [x] 3.2 Run `npm run build` and `npm test` to verify clean build artifacts and test suite passage.
