# Proposal

## Why

Currently, encounters place player and enemy units rigidly in array-index order onto small, horizontally sheared deployment lists (`playerCoords` and `enemyCoords`) and immediately roll opening initiative upon entering the arena. Because pointy-topped axial coordinates shear diagonally and enemy squad assembly orders units strictly by tier, large squads (6+ combatants in Radius 5) start awkwardly bunched in the middle-left while North and South flanks sit empty, high-tier enemy tanks (`Shield-bearer`, `Knight`) frequently spawn in the very back corner behind squishy Novices or Mages, and players have no opportunity to position their frontline, flankers, or high-ground ranged units before Turn 1 begins.

## What Changes

- **Expanded Symmetric Deployment Zones & Elevation Terraces**:
  - Redefine West (player) and East (enemy) deployment zones using horizontal screen-column projection (`col = 2*q + r`), expanding candidate deployment hexes across the full North-to-South vertical span: **8 hexes** per side in Radius 3 (`|col| >= 3`), **12 hexes** per side in Radius 4 (`|col| >= 4`), and **18 hexes** per side in Radius 5 (`|col| >= 5`).
  - Keep non-walkable `RUINS` obstacles strictly inside the neutral center band (`|col| < threshold`) so all deployment zone hexes are guaranteed walkable, while allowing `h=1` elevation terraces to spread into the deployment zones so ranged/support combatants can occupy elevated starting perches.
- **Role-Aware Tactical Formation Placer (Enemy & Default Player Pre-Placement)**:
  - Introduce a deterministic role-aware formation placer (`placeSquadTactically`) that scores candidate deployment hexes using each unit's resolved AI tactical profile (`BRAWLER`, `SNIPER`, `SUPPORT`, `SKIRMISHER`) and terrain elevation:
    - **Frontline (`BRAWLER`)**: Prioritizes the forward deployment row closest to the center (`|col|` minimum) and central lanes (`|r|` small), with spacing penalties against adjacent friendly Brawlers so the frontline spreads out vertically rather than clumping.
    - **Backline (`SNIPER` / `SUPPORT`)**: Prioritizes rear/mid deployment rows behind the frontline, awarding bonuses for `h=1` elevated terrace hexes and screening behind friendly Brawlers.
    - **Flankers (`SKIRMISHER`)**: Prioritizes outer North and South wing hexes (larger `|r|`) on the forward/mid rows to open flanking lanes.
- **Interactive Pre-Combat `DEPLOYMENT` Phase & Formation Memory**:
  - Introduce an opening `DEPLOYMENT` phase in the Combat Arena prior to rolling opening initiative or advancing the Turn 1 clock.
  - Pre-place player combatants on the West deployment zone using remembered coordinates from the player's last confirmed formation for that arena radius (when valid), falling back to the role-aware Tactical Formation Placer for any unplaced or newly added squad members.
  - Highlight all valid West deployment hexes on the battlefield and allow the player to reposition units via **Select Unit A -> Click empty deployment hex to Move / Click Unit B to Swap (and deselect)**, while clicking an enemy combatant inspects it in `UnitStatusCard`.
  - Render a dedicated Deployment Bar in the bottom HUD with guidance text, an **`[ 🔀 Auto-Arrange ]`** button (to reset positions to the role-aware tactical formation), and a primary **`[ ⚔️ Begin Trial ]`** button.
  - When the player clicks **`[ ⚔️ Begin Trial ]`**, lock in unit positions (auto-facing East), persist the player's chosen formation coordinates for that arena radius, and trigger opening 1d20 initiative rolls, `BATTLE_START` passives, staggered `🎲 <roll>` floating text badges, and Turn 1 commencement.
- **Semantic Versioning Assessment**:
  - Target version: **`0.21.0`** (Minor bump from `0.20.0`). Rationale: Introduces a new player-facing pre-combat tactical deployment phase, expanded full-span deployment zones with terrace elevation, formation memory, and role-aware enemy starting formations without breaking existing save slots.

## Capabilities

### New Capabilities
- `tactical-deployment-phase`: Pre-combat interactive player unit placement phase on the hex battlefield, including deployment zone highlighting, click-to-move/swap unit repositioning, auto-arrange formation reset, formation persistence across trials by arena radius, and deferred opening initiative rolling upon clicking `[ Begin Trial ]`.

### Modified Capabilities
- `encounter-generation`: Expand West and East deployment zones to symmetric full-height horizontal bands (`|2*q + r| >= threshold`), allow `h=1` elevation terraces inside deployment zones while keeping obstacles strictly in the neutral center strip, and assign enemy (and default player) starting positions via role-aware tactical formation scoring.
- `combat-initiative-rolling`: Defer interactive encounter opening initiative rolling, `BATTLE_START` passive triggers, Turn 0 combat log announcement, and staggered `🎲 <roll>` floating badges until the pre-combat `DEPLOYMENT` phase is confirmed (while headless simulations and pre-started states continue rolling immediately).

## Impact

- **Core Campaign & Encounter Generation**:
  - `src/core/campaign/encounterGenerator.ts`: `getDeploymentZones`, `generateArenaTerrain`, `placeSquadTactically`, `generateStageEncounter`.
  - `src/core/campaign/transitions.ts`: `syncEncounterActiveSquad`, `syncEncounterPlayerUnits`.
- **Combat Engine & State Initialization**:
  - `src/core/combat/encounter.ts` & `src/core/combat/resolver.ts`: Support initializing or re-initializing combat state from finalized deployment coordinates and deferring/re-running initiative roll start on deployment confirmation.
- **Combat Arena UI & Simulation Hook**:
  - `src/ui/combat/useCombatSimulation.ts`: Add `'DEPLOYMENT'` to `CombatPhase`, track `selectedDeploymentUnitId`, `deploymentZoneCoords`, `handleDeploymentTileClick`, `handleAutoArrangeDeployment`, `handleConfirmDeployment`, and per-radius formation memory in `localStorage`.
  - `src/ui/combat/CombatArena.tsx`, `src/ui/combat/HexGridSvg.tsx`, and a new `DeploymentBar` (or `ActionBar` deployment mode): Render deployment zone hex highlights, selected deployment unit ring, and `[ 🔀 Auto-Arrange ]` / `[ ⚔️ Begin Trial ]` controls.
- **Tests, Version & Changelog**:
  - Unit and integration tests in `src/core/campaign/encounterGenerator.test.ts`, `src/ui/combat/useCombatSimulation.test.tsx`, and `src/ui/combat/CombatArena.test.tsx`.
  - `package.json` (`0.21.0`) and `CHANGELOG.md`.
