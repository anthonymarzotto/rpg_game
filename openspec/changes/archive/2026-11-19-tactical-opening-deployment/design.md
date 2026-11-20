# Design

## Context

See `proposal.md` for motivation and scope. Currently:
- `getDeploymentZones(radius)` in `src/core/campaign/encounterGenerator.ts` returns hardcoded small arrays of coordinates (`4` in R3, `6` in R4, `10` in R5) filtered by axial `q`, which shears diagonally on pointy-topped grids (`x = radius * sqrt(3) * (q + r/2)`). In Radius 5, all 10 player deployment hexes cluster near `r in [-2, 2]`, leaving the North (`r in [-4, -3]`) and South (`r in [3, 4]`) wings completely empty.
- `generateArenaTerrain` treats every deployment coordinate as part of `spawnSet`, excluding all deployment coordinates from both obstacle generation and elevation terrace spreading (`h = 1`).
- `generateStageEncounter` and `syncEncounterActiveSquad` assign units sequentially by array index (`playerCoords[idx]`, `enemyCoords[idx]`). Because `assembleEnemySquad` pushes highest-tier units first (`Tier 4 -> Tier 3 -> Tier 2 -> Tier 1 -> Novice`) and `enemyCoords` lists outer back-edge coordinates first, high-tier frontline tanks (`Shield-bearer`, `Knight`) are systematically placed on the rear perimeter while low-tier or ranged units end up on the front edge.
- `useCombatSimulation` immediately calls `buildEncounterState(encounter, roller)`, rolling opening 1d20 initiative, triggering `BATTLE_START` passives, emitting `🎲 <roll>` floating text, and starting Turn 1 (including immediate hostile AI execution if an enemy wins initiative) with no pre-combat deployment interaction.

## Goals / Non-Goals

**Goals:**
- Define full-height, symmetric West and East deployment zones for Radius 3, 4, and 5 using horizontal screen-column projection (`col = 2*q + r`).
- Allow `h = 1` elevation terraces inside deployment zones while keeping non-walkable `RUINS` obstacles strictly in the neutral center zone (`|col| < threshold`).
- Score and assign starting coordinates for enemy squads (and default player pre-placements) using a deterministic role-aware tactical formation placer (`placeSquadTactically`).
- Add an interactive pre-combat `DEPLOYMENT` phase in `useCombatSimulation` and `CombatArena` with click-to-select, click-empty-to-move, click-ally-to-swap, `[ 🔀 Auto-Arrange ]`, and `[ ⚔️ Begin Trial ]`, plus per-radius formation persistence in `localStorage`.
- Defer opening initiative rolls, `BATTLE_START` passives, Turn 0 combat log announcement, and staggered `🎲 <roll>` floaters until `[ ⚔️ Begin Trial ]` is clicked, while preserving immediate combat initialization for headless simulations and tests that specify `initialActiveUnitId` or `startInDeployment: false`.

**Non-Goals:**
- Changing in-combat movement rules, facing AP costs, or post-deployment turn clock mechanics.
- Adding manual initial facing selection during deployment (all player units auto-face `HEX_DIRECTIONS.EAST`, enemies auto-face `HEX_DIRECTIONS.WEST`).
- Allowing units to deploy onto non-walkable obstacle hexes or outside their faction's deployment zone.

## Decisions

### 1. Symmetric Full-Span Deployment Zones via `col = 2*q + r`
- **Decision**: Compute deployment zones from all radial arena tiles of `radius` using horizontal screen projection `col = 2 * q + r`:
  - Threshold `T = radius` (for `radius <= 3`, `T = 3`; for `radius = 4`, `T = 4`; for `radius >= 5`, `T = 5`).
  - **West (Player) Zone**: All valid radial hexes with `2 * q + r <= -T` (`8` hexes in R3, `12` hexes in R4, `18` hexes in R5).
  - **East (Enemy) Zone**: All valid radial hexes with `2 * q + r >= +T` (`8` hexes in R3, `12` hexes in R4, `18` hexes in R5).
  - Sort candidate coordinates deterministically from front-to-back (`|2*q + r|` ascending, i.e., closest to center first) and center-to-wings (`|r|` ascending, then `r` ascending) so any simple index slice (`coords.slice(0, k)`) remains well-ordered and balanced around `r = 0`.
- **Rationale**: In pointy-topped axial coordinates, `2 * q + r` is proportional to true horizontal screen coordinate `x`, while `r` is proportional to vertical coordinate `y`. Thresholding on `|2 * q + r| >= radius` produces a vertically symmetric crescent spanning the full North-to-South height of the board with a guaranteed neutral center strip (`|2 * q + r| < radius`).
- **Alternatives Considered**:
  - Filtering on `q <= -2` / `q >= 2`: Rejected because axial `q` lines are angled at 30 degrees, cutting off the North-West and South-East corners of the arena and causing the middle-left bunching in Radius 5.

### 2. Elevation Terraces in Deployment Zones, Obstacles Strictly in Center Strip
- **Decision**: In `generateArenaTerrain(radius, playerSpawns, enemySpawns, rng)`:
  - Peak foci (`h = 2`) and non-walkable `RUINS` obstacles (`isWalkable: false`) remain restricted to interior center coordinates outside `spawnSet` (`!spawnSet.has(key)` and `hexDistance(c, {q:0, r:0}) < radius`).
  - Remove the `!spawnSet.has(key)` restriction from `h = 1` primary and secondary terrace spreading so `h = 1` terraces can naturally spill onto adjacent deployment zone hexes.
  - Verify traversable connectivity across all deployment hexes (or between the front-center player and enemy deployment hexes) so no deployment hex is ever isolated by a cliff drop/rise.
- **Rationale**: Keeping obstacles out of `spawnSet` guarantees that every single deployment zone hex is walkable and available for unit placement or formation memory restoration, while allowing `h = 1` terraces gives ranged units (`Wizard`, `Sorcerer`, `Ballistician`) genuine tactical high-ground choices during deployment.

### 3. Role-Aware Tactical Formation Placer (`placeSquadTactically`)
- **Decision**: Introduce `placeSquadTactically(units, candidateCoords, tileOverrides, faction)` in `src/core/campaign/encounterGenerator.ts`:
  - Classify each unit's tactical role using its active class package `aiProfile` (or fallback archetype heuristic via `resolveUnitTacticalRole(unit)` -> `'BRAWLER' | 'SKIRMISHER' | 'SNIPER' | 'SUPPORT'`, where Novices inspect their highest base attribute or default to `'BRAWLER'`).
  - Order units for placement priority: `BRAWLER` first (establishes the frontline screen), then `SNIPER` and `SUPPORT` (select elevated or screened backline perches relative to placed Brawlers), then `SKIRMISHER` (takes outer North/South flank wings).
  - For each unit, score every unoccupied `coord` in `candidateCoords`:
    - Let `absCol = Math.abs(2 * coord.q + coord.r)` (smaller `absCol` = closer to arena center / frontline; larger `absCol` = deeper in backline).
    - Let `minAbsCol` be the minimum `absCol` in `candidateCoords` (the forward-most row, equals `radius`).
    - Let `depth = absCol - minAbsCol` (`0` = front row, `1..2` = mid row, `3+` = deep back row).
    - Let `absR = Math.abs(coord.r)` (distance from central horizontal axis) and `elev = elevationMap.get(key) ?? 0`.
    - **`BRAWLER` Score**:
      - Front-row preference: `-depth * 12` (strongly favors `depth === 0` or `1`).
      - Center-lane preference: `-absR * 4` (anchors near `r = 0`; `shield-bearer` gets an extra `-absR * 2` so the Phalanx anchor holds center).
      - Anti-clumping spacing: `-10` penalty for each already-placed friendly unit at `hexDistance === 1` (and `+4` bonus if at `hexDistance === 2` from another Brawler), spreading multiple Brawlers into a clean battle line (e.g., `r = -1` and `r = +1`) instead of clustering on adjacent hexes.
    - **`SNIPER` / `SUPPORT` Score**:
      - Back/mid-row preference: favors `depth >= 1` (`depth === 0 ? -15 : depth <= 2 ? +10 : +6`).
      - High-ground vantage bonus: `+14 * elev` (strongly prioritizes `h = 1` terraces inside the deployment zone).
      - Screening bonus: `+8` if there is an already-placed friendly `BRAWLER` closer to the center (`absCol_brawler < absCol`) within `|r_brawler - coord.r| <= 1`.
      - Anti-clumping spacing: `-6` penalty if adjacent (`hexDistance === 1`) to another Sniper/Support.
    - **`SKIRMISHER` Score**:
      - Flank wing preference: `+absR * 6` (favors outer North/South wings with larger `|r|`, up to `|r| <= radius - 1`).
      - Forward/mid readiness: `depth <= 1 ? +8 : -depth * 4` (keeps flankers near the front edge of the wing so they don't waste turns marching from the deep rear).
      - Wing balance: if another Skirmisher is already placed on one wing (e.g. `r < 0`), add `+10` bonus for the opposite wing (`r > 0`) so dual Skirmishers split North and South.
- **Rationale**: Purely deterministic, zero-RNG scoring based on role and generated topography ensures `generateStageEncounter` remains 100% deterministic for a given seed while producing authentic tactical formations for both enemy teams and default player pre-placement.

### 4. Pre-Combat `DEPLOYMENT` Phase & Deferred Initiative Lifecycle
- **Decision**:
  - Extend `CombatPhase` in `src/ui/combat/useCombatSimulation.ts` to `'DEPLOYMENT' | 'PLAYER_ACTION' | 'HOSTILE_TURN' | 'VICTORY' | 'DEFEAT'`.
  - Add optional `startInDeployment?: boolean` to `UseCombatSimulationOptions`. Default `startInDeployment` to `!Boolean(encounter.initialActiveUnitId)` so interactive trials (`generateStageEncounter`, `createNoviceSandboxEncounter`) start in `DEPLOYMENT`, while unit tests that pass `initialActiveUnitId` (and headless `buildEncounterState` calls) start immediately in active combat without breaking existing test suites.
  - When `isDeploymentPhase` is `true`:
    - `phase` resolves to `'DEPLOYMENT'`.
    - Player units are placed on walkable West deployment hexes (`getDeploymentZones(radius).playerCoords` merged with any custom starting player coords from the encounter), applying saved formation coordinates from `localStorage` (`astral_tactics_saved_formations_v1`, keyed by `radius` and `unit.id`) when valid and unoccupied, and placing remaining player units via `placeSquadTactically`.
    - Opening initiative floating texts (`collectInitiativeFloatingTexts`), `My Turn!` turn-start floaters, and the hostile AI turn sequencer are paused while `isDeploymentPhase` is `true`.
    - Clicking a tile in `DEPLOYMENT` phase (`handleTileClick`):
      - If the clicked tile contains a `PLAYER` unit:
        - If no deployment unit is currently selected (`selectedDeploymentUnitId === null`), select that player unit (`selectedDeploymentUnitId = clickedUnitId`) and also pin/inspect it in `UnitStatusCard`.
        - If `selectedDeploymentUnitId === clickedUnitId`, deselect it (`selectedDeploymentUnitId = null`).
        - If `selectedDeploymentUnitId` is a *different* player unit (`Unit A`) and the clicked unit (`Unit B`) is on a valid West deployment hex, **swap** `Unit A` and `Unit B` on the arena (`state.arena.swapUnits(unitA, unitB)`), ensure both face `HEX_DIRECTIONS.EAST`, and clear `selectedDeploymentUnitId = null`.
      - If the clicked tile is an **unoccupied walkable West deployment hex** and `selectedDeploymentUnitId` (`Unit A`) is set:
        - Move `Unit A` to that hex (`state.arena.setUnitPosition(unitA, coord)`), face `HEX_DIRECTIONS.EAST`, and clear `selectedDeploymentUnitId = null`.
      - If the clicked tile contains an `ENEMY` unit:
        - Toggle `pinnedUnitId` to inspect that enemy in `UnitStatusCard` without losing or moving the player's deployment selection.
    - Clicking **`[ 🔀 Auto-Arrange ]`** (`handleAutoArrangeDeployment`):
      - Re-runs `placeSquadTactically` for all player units across the West deployment zone, updates their arena positions facing East, and clears `selectedDeploymentUnitId`.
    - Clicking **`[ ⚔️ Begin Trial ]`** (`handleConfirmDeployment`):
      - Saves the current player unit coordinates for `arenaRadius` into `localStorage` (`astral_tactics_saved_formations_v1`).
      - Builds a fresh active `CombatState` from the finalized unit coordinates using `trialRollerRef.current` (`buildEncounterState(finalizedEncounter, trialRollerRef.current)`), which rolls opening 1d20 initiative, applies the anti-alpha-strike guardrail, triggers `BATTLE_START` passives (`Tactical Vanguard`), logs the Turn 0 initiative card, advances the clock to Turn 1, sets `isDeploymentPhase = false`, and triggers the staggered `🎲 <roll>` opening initiative floating text sequence.

### 5. Battlefield & HUD Visual Representation During Deployment
- **Decision**:
  - Pass `deploymentZoneCoords?: readonly HexCoord[]` and `selectedDeploymentUnitId?: string | null` to `HexGridSvg`.
  - In `HexGridSvg`, when `deploymentZoneCoords` is non-empty:
    - Highlight valid West deployment hexes with an astral cyan/emerald deployment border and subtle fill (`rgba(56, 189, 248, 0.16)` fill, `#38bdf8` dashed/glowing stroke, brighter on hover).
    - Render a distinct selection halo on the unit matching `selectedDeploymentUnitId` (similar to the active/pinned ring).
  - In `CombatArena.tsx`, when `phase === 'DEPLOYMENT'`, render a dedicated `DeploymentBar` component in the bottom dock (in place of `ActionBar` / `EnemyTurnBanner`) showing:
    - Phase badge & prompt: `🛡️ Vanguard Deployment — Select an ally and click any highlighted West hex to move or swap` (or `Deploying <Unit Name> — Click a highlighted West hex to move, or another ally to swap` when a unit is selected).
    - **`[ 🔀 Auto-Arrange ]`** button (`data-testid="btn-deployment-auto-arrange"`).
    - **`[ ⚔️ Begin Trial ]`** primary CTA button (`data-testid="btn-begin-trial"`).

## Risks / Trade-offs

- **[Risk] Existing unit tests in `useCombatSimulation.test.tsx`, `CombatArena.test.tsx`, and `encounterGenerator.test.ts` expect specific legacy spawn counts or immediate `PLAYER_ACTION` phase** -> **Mitigation**:
  1. Update `encounterGenerator.test.ts` assertions for the expanded symmetric deployment zone counts (`8` for R3, `12` for R4, `18` for R5) and add dedicated tests for role-aware enemy placement and `h=1` deployment terraces.
  2. In `useCombatSimulation`, encounters with `initialActiveUnitId` defined automatically bypass `DEPLOYMENT` (preserving the majority of `useCombatSimulation.test.tsx` tests untouched), and allow `startInDeployment` to be controlled or confirmed via `handleConfirmDeployment()` in tests that inspect active turn state.
- **[Risk] Saved formation coordinates from a previous encounter might reference a hex that is out of bounds or occupied if squad composition changes** -> **Mitigation**: On deployment initialization, validate each remembered coordinate against the current encounter's walkable `deploymentZoneCoords` set and ensure no two units claim the same coordinate; any unit without a valid remembered coordinate is seamlessly placed by `placeSquadTactically` onto the best remaining unoccupied deployment hex.
