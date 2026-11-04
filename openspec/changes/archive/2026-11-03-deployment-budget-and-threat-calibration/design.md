# Design: Deployment Budget & Threat Calibration

## Context

The game's progression currently encounters difficulty collapse in mid-to-late stages due to two structural issues:
1. Squad generation occurs immediately upon trial victory before Camp ascensions are made, evaluating threat against pre-ascension levels.
2. The player squad is hardcoded to a maximum of 3 units, while the enemy squad generator allows at most one unit of each tier and fills the rest with Novices.

See `proposal.md` for full motivation.

## Goals / Non-Goals

**Goals:**
- Replace the 3-unit squad limit with a stage-scaled deployment point budget (`threatBudget.ts`), enabling players to field custom squad sizes (elite strike teams, mixed ranks, or recruit swarms) within the budget.
- Account for pending ascensions via single-step level projection when calculating threat for the next trial in `resolveCampaignVictory`.
- Keep incursion generation stable in Camp: swapping vanguard heroes in `setCampActiveSquad` updates player deployment tokens without altering enemy compositions or arena topography.
- Enhance `assembleEnemySquad` to spend threat budgets flexibly on multiple units of the highest appropriate tiers without a 4-unit cap.
- Provide enemies with resonant domain abilities and passives drawn from their unlocked constellation lineage (`Scratchpad #4`).
- Dynamically size combat arenas (Radius 3 for Stage 1, Radius 4 minimum for Stage 2+, Radius 5 for combined units >= 7) and author expanded deployment zones.
- Update `ActiveSquadDock` to display deployment point usage and allow dynamic unit counts.

**Non-Goals:**
- Roster-wide harvest XP / Camp Tutoring (units must earn their experience in combat on the battlefield; Camp Tutoring remains scheduled for future roadmap horizons).
- Generic roguelike DAG sector navigation (paused to explore alternate sector/recon aesthetics).
- Authoring new Tier 4 class packages (Tier 4 class packages follow after enemy threat calibration is complete).

## Decisions

### 1. Point Currency & Unit Threat Values
We standardize both player deployment and enemy threat generation on the existing unit threat valuation from `threatBudget.ts`:
- **Novice (Level 0)**: 10 pts
- **Tier 1 (Level 1)**: 25 pts (10 + 1 * 15)
- **Tier 2 (Level 2)**: 40 pts (10 + 2 * 15)
- **Tier 3 (Level 3)**: 55 pts (10 + 3 * 15)
- **Tier 4 (Level 4)**: 70 pts (10 + 4 * 15)

*Rationale*: A Novice costs only 10 points. In later stages with 120–160 point budgets, a player fielding 2–3 veterans has 10–25 points left over, allowing them to freely slot in a Novice as an auxiliary squire without sacrificing an elite veteran.

### 2. Stage Progression & Deployment Budget Curve
We define a canonical stage budget curve used for both Player Deployment Caps and Enemy Incursion Budgets:
- **Stage 1**: 30 pts (3 Novices vs 3 Novices, Radius 3)
- **Stage 2**: 80 pts (e.g. 3 Tier-1s, or 2 Tier-1s + 3 Novices, Radius 4 min)
- **Stage 3**: 120 pts (e.g. 2 Tier-2s + 1 Tier-1 + 1 Novice, or 1 Tier-2 + 2 Tier-1s + 3 Novices, Radius 4/5)
- **Stage 4**: 160 pts (e.g. 2 Tier-3s + 1 Tier-2 + 1 Novice, Radius 4/5)
- **Stage 5+**: 200+ pts (multi-Tier-3 incursions, Radius 5)

*Alternative Considered*: Purely dynamic scaling without stage baselines. Rejected because it reintroduced rubber-banding where benching champions trivialized stages.

### 3. Single-Step Pre-Ascension Level Projection
In `threatBudget.ts`, introduce `computeProjectedUnitThreat(unit: Unit): number`:
- If `unit.progression.currentLevel < MAX_LEVEL` and `accumulatedXp` meets or exceeds `LEVEL_XP_THRESHOLDS[currentLevel]`, treat projected level as `currentLevel + 1`.
- Otherwise, use `currentLevel`.
- At victory transition in `resolveCampaignVictory`, calculate squad threat using `computeProjectedSquadThreat(activeSquad)`.

*Rationale*: Simple, deterministic, and non-recursive. Accurately anticipates the 1 level-up per trial cadence.

### 4. Stable Incursion Isolation in Camp
In `transitions.ts`:
- Refactor `setCampActiveSquad` so it validates that `computeSquadThreat(selectedUnits) <= getStageDeploymentBudget(state.stage)`.
- If valid, update `activeSquadIds` and call `syncEncounterPlayerUnits(state.currentEncounter, updatedRoster)` with deployment coordinate assignments for all deployed player units.
- Remove `generateStageEncounter` from `setCampActiveSquad`.

*Rationale*: The War Room's Astral Scrying & Recon represents genuine reconnaissance of an existing astral incursion. Swapping units in Camp should never alter the enemy threat.

### 5. Multi-Unit Threat Allocation in Enemy Assembly
In `encounterGenerator.ts`, refactor `assembleEnemySquad`:
- Remove single-pass `if (rng() < 0.6)` conditions that restricted squads to at most one unit per tier.
- Remove the `squad.length < 4` ceiling.
- Use a prioritized budget-allocation loop:
  - While budget allows and stage permits, purchase units of the highest eligible tier for the stage (e.g. Stage 4 buys Tier-2s and Tier-1s until budget is exhausted or minimum minion slots remain).
  - Guarantee at least 2 hostiles.

### 6. Constellation-Derived Resonant Enemy Loadouts
In `createEnemyUnit`:
- Inspect the generated unit's `progression.constellation` (classes unlocked during its level advancement).
- For wildcard abilities: select up to 2 domain abilities from the class packages in its unlocked constellation (e.g. Knight drawing `pommel_strike` from Warrior, Cavalier drawing `brace` or `shield_bash` from Knight/Warrior).
- For wildcard passives: select a passive trait from its unlocked constellation lineage (e.g. `iron_clad`, `stalwart_aegis`, `heavy_armor`) or Novice `momentum`.

### 7. Dynamic Arena Radius & Expanded Spawns
In `encounterGenerator.ts`:
- Determine arena radius:
  - Stage 1: Radius 3 (37 hexes)
  - Stage 2+: Radius 4 (61 hexes)
  - If `playerSquad.length + enemies.length >= 7`: Radius 5 (91 hexes)
- Expand `getDeploymentZones(radius)`:
  - Radius 3: 4 West spawns, 4 East spawns
  - Radius 4: 6 West spawns, 6 East spawns
  - Radius 5: 8-10 West spawns, 8-10 East spawns

## Risks / Trade-offs

- **[Risk] Swarm of Novices overwhelms action economy via sheer turn count**
  - *Mitigation*: Novices have low vitals (12 HP), basic attacks (1d6), and no heavy armor. Mid-to-late stage enemies with Tier-2/3 domain attacks (Cleave, Trample, AoE spells) can easily slice through clustered Novices.
- **[Risk] High unit counts cause SVG canvas congestion or off-screen placement**
  - *Mitigation*: Automatically bumping to Radius 5 (91 hexes) when combined units reach 7+ provides ample space. `HexGridSvg` already auto-calculates dynamic `viewBox` from all tiles.
- **[Risk] Player deploys severely under-budget and faces overwhelming odds**
  - *Mitigation*: The War Room displays the detected enemy threat budget and the player's deployed points clearly, ensuring the player is informed before clicking Deploy.
