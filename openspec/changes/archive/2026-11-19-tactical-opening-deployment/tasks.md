# Tasks

## 1. Symmetric Deployment Zones, Terrace Elevation & Role-Aware Squad Placement

- [x] 1.1 Update `getDeploymentZones(radius)` in `src/core/campaign/encounterGenerator.ts` to compute symmetric full-span West (`2*q + r <= -T`) and East (`2*q + r >= +T`) deployment coordinates (`8` per side in R3, `12` per side in R4, `18` per side in R5) ordered deterministically from front-to-back and center-to-wings, and verify with unit tests in `src/core/campaign/encounterGenerator.test.ts`.
- [x] 1.2 Update `generateArenaTerrain` in `src/core/campaign/encounterGenerator.ts` so non-walkable `RUINS` obstacles and `h=2` peaks remain strictly in the neutral interior outside `spawnSet`, while `h=1` elevation terraces can spread onto deployment zone hexes with guaranteed path connectivity, and verify with unit tests in `src/core/campaign/encounterGenerator.test.ts`.
- [x] 1.3 Implement `resolveUnitTacticalRole` and `placeSquadTactically` in `src/core/campaign/encounterGenerator.ts` (scoring `BRAWLER` frontline/center with anti-clumping spacing, `SNIPER`/`SUPPORT` elevated/screened backline, and `SKIRMISHER` North/South flank wings) and wire them into `generateStageEncounter` and `syncEncounterActiveSquad` (`src/core/campaign/transitions.ts`), verifying role-aware placement and 6+ unit spreading with unit tests in `src/core/campaign/encounterGenerator.test.ts`.

## 2. Pre-Combat `DEPLOYMENT` Phase & Per-Radius Formation Memory in `useCombatSimulation`

- [x] 2.1 Extend `CombatPhase` in `src/ui/combat/useCombatSimulation.ts` with `'DEPLOYMENT'`, add `startInDeployment` option (defaulting to `!Boolean(encounter.initialActiveUnitId)`), and defer opening initiative floaters, Turn 0 initiative announcement, turn-start `"My Turn!"` floaters, and the hostile AI turn sequencer while in `DEPLOYMENT` phase; verify phase lifecycle in `src/ui/combat/useCombatSimulation.test.tsx`.
- [x] 2.2 Implement per-radius formation persistence (`astral_tactics_saved_formations_v1` in `localStorage`) and interactive deployment actions in `src/ui/combat/useCombatSimulation.ts` (`selectedDeploymentUnitId`, `deploymentZoneCoords`, click player unit A -> click empty deployment hex to Move, click player unit B to Swap and deselect, click enemy unit to pin/inspect, `handleAutoArrangeDeployment`, and `handleConfirmDeployment` to lock in positions facing East and roll opening initiative); verify all interactions with unit tests in `src/ui/combat/useCombatSimulation.test.tsx`.

## 3. Battlefield Deployment Zone Highlighting & `DeploymentBar` HUD

- [x] 3.1 Update `src/ui/combat/HexGridSvg.tsx` (and `src/ui/combat/CombatArena.css`) to accept `deploymentZoneCoords` and `selectedDeploymentUnitId`, rendering distinct West deployment zone hex highlighting and a selection ring on the actively selected deployment unit, and verify rendering in `src/ui/combat/HexGridSvg.test.tsx`.
- [x] 3.2 Create or integrate the bottom `DeploymentBar` in `src/ui/combat/CombatArena.tsx` when `phase === 'DEPLOYMENT'` with contextual selection instructions, `[ 🔀 Auto-Arrange ]` (`data-testid="btn-deployment-auto-arrange"`), and `[ ⚔️ Begin Trial ]` (`data-testid="btn-begin-trial"`), and verify component rendering and interactions in `src/ui/combat/CombatArena.test.tsx`.

## 4. Verification, Version Bump & Changelog

- [x] 4.1 Update `CHANGELOG.md` with end-user facing release notes for version `0.21.0` covering pre-combat tactical unit placement, remembered formations, expanded deployment zones with high-ground perches, and smarter enemy starting formations, and bump `"version"` in `package.json` to `"0.21.0"`.
- [x] 4.2 Run the full test suite (`npm test`) and production build (`npm run build`) and verify zero TypeScript, build, or test errors.
