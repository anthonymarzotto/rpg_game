# Design: AI Tactical Heuristics and Trial RNG Consistency

## Context

See `proposal.md` for full motivation from the 62-turn trial diagnostic audit.

Currently:
- In the React combat UI (`src/ui/combat/useCombatSimulation.ts`), encounter initialization, player rolls (`DevDiceRoller`), and hostile AI turns (`executeHostileTurnAsync`) do not share a single `SeededDiceRoller`. Instead, `executeHostileTurnAsync` defaults to `new SeededDiceRoller()` (seed `1337`) on every hostile turn call, resetting the enemy PRNG stream on every turn.
- In `src/core/ai/decisionEngine.ts` and `src/core/ai/heuristics.ts`, composite move-and-act scoring uses an `if (bestAttackFromCand) ... else { reposition }` mutually exclusive branch, `SNIPER`/`SUPPORT` approach moves require immediate single-step `hasLoS` and enforce standoff range `2` even on melee-only `SUPPORT` classes (`Knight`), `scoreBuffAbility` ignores AoE ally counts and `POSITION_SWAP` rescue geometry, short-duration setup debuffs lack team follow-up checks, `TELEPORT` approaches fire on flat unengaged terrain, and `unspentApVirtualHeight` (`Coiled Apex`) never triggers 1-AP banking.

## Goals / Non-Goals

**Goals:**
- Ensure every interactive encounter trial uses a single persistent `SeededDiceRoller` across opening initiative, normal player actions, and hostile AI turns, while recording the trial's PRNG seed on `CombatState` and `SerializedCombatState`.
- Eliminate AI turn-skipping caused by weak move-to-buff candidates suppressing approach scoring or mid-map ridges blocking initial `hasLoS`.
- Enable `SUPPORT` classes to cast opening AoE squad buffs (`Lead the Charge`), rescue threatened allies safely with `Intercept Step`, and let melee-only `SUPPORT` units close to melee and exploit `TARGET_CHALLENGED` combos while keeping multi-target `Challenging Shout` unrestricted.
- Prevent unbacked Turn 1 solo-dives (`Rooftop Vault` + `Flash Powder` when teammates cannot follow up within 1 turn) and encourage flank dispersion via an adjacent-ally crowding penalty.
- Encourage `unspentApVirtualHeight` (`Coiled Apex`) units to bank their final 1 AP for `+1 Virtual Height` and `+20 CTB` gauge when no high-value finisher or blast is available.

**Non-Goals:**
- Tuning Frost Highwayman (`Stand and Deliver!`) primer bonus weights (deferred until real dice rolls can be observed without the PRNG reset bug).
- Refactoring headless simulators (`simulation.ts`, `squadSimulation.ts`), which already instantiate one `SeededDiceRoller` per match.
- Adding UI controls for user-entered PRNG seeds (reproducibility is tracked via auto-generated trial seeds recorded in state and exports).

## Decisions

### 1. Single Trial-Scoped `SeededDiceRoller` and `CombatState.seed`

```text
TRIAL DICE FLOW (useCombatSimulation.ts)
+-------------------------------------------------------------------------+
| createTrialRoller() -> new SeededDiceRoller(Date.now() ^ sessionSalt)   |
| Stored in trialRollerRef across init, handleRematch, handleResetEncounter|
+-------------------------------------------------------------------------+
          |                               |                         |
          v                               v                         v
+-------------------+         +-----------------------+   +---------------+
| Opening Initiative|         | Player Action         |   | Hostile AI    |
| buildEncounter    |         | new DevDiceRoller     |   | executeHostile|
| State(enc,        |         | (diceMode,            |   | TurnAsync(...,|
|   trialRoller)    |         |   trialRoller)        |   |   trialRoller)|
+-------------------+         +-----------------------+   +---------------+
          |
          v
state.seed = trialRoller.seed -> preserved in serializeCombatState / JSON
```

- **Decision**: Add `public readonly seed: number` to `SeededDiceRoller` (`src/core/combat/dice.ts`), add optional `seed?: number` to `CombatState` and `SerializedCombatState` (`src/core/combat/types.ts`), populate `seed` in `createCombatState` (`src/core/combat/resolver.ts`), preserve it in `stateSerializer.ts`, and display it in `generateTrialMarkdownReport` (`src/core/combat/reportGenerator.ts`) when defined. Update `DevDiceRoller` (`src/ui/combat/devDice.ts`) to accept an optional backing `DiceRoller` for `'NORMAL'` mode, and replace the per-call default `new SeededDiceRoller()` in `executeHostileTurnAsync` (`src/ui/combat/asyncTurnSequencer.ts`) with a module-level `defaultDiceRoller` fallback.
- **Rationale**: Keeps `DevDiceRoller` overrides (`FORCE_CRIT`, `FORCE_GRAZE`, `FORCE_MISS`) intact for manual dev testing while guaranteeing normal trials draw from one continuous seeded stream and record their seed for debugging.
- **Alternative Considered**: Using `Math.random()` inside `executeHostileTurnAsync`. Rejected because seeded streams enable exact bug reproduction from exported trial JSONs.

### 2. Decoupled Move-and-Act vs. Approach Scoring and `SNIPER`/`SUPPORT` Long-Range Approach

```text
EVALUATING CANDIDATE MOVE HEX (candCoord)
  1. Compute bestAttackFromCand (attacks, debuffs, buffs from candCoord)
  2. ALWAYS compute bestRepositionScore (closing distance / standoff / flank)
  3. Pick maxScoreCandidate(bestAttackFromCand, bestRepositionScore)
     -> A 0.5-score unengaged buff never suppresses a 9.0-score advance!
```

- **Decision**:
  - In `src/core/ai/decisionEngine.ts`, remove the `if (bestAttackFromCand) { ... } else { ... }` mutual exclusion so `bestRepositionScore` is always evaluated for `candCoord`, pushing whichever candidate scores strictly higher.
  - Determine `hasRangedAttack = cu.abilities.some((a) => a.range >= 2 && a.damageType !== 'NONE')`.
  - Apply standoff-range logic (`weights.preferredStandoffRange`) when `profile === 'SNIPER' || (profile === 'SUPPORT' && hasRangedAttack)`. When `candDev < currentDev`:
    - If `hasLoS`: award `(currentDev - candDev) * 5`.
    - Else if `currentDist > weights.preferredStandoffRange + 1`: award `(currentDev - candDev) * 3.5` (allows backline units to navigate around central ridges while preferring hexes that establish direct `hasLoS`).
  - For melee-only `SUPPORT` units (e.g., `Knight`, whose damaging attacks are Range 1) as well as `BRAWLER` and `SKIRMISHER`, score `candDist < currentDist` closing distance so they step into melee rather than hovering at range 2.
  - During `candDist >= 2` approach evaluation, subtract `2.5 * adjacentAllies` (living allies at `hexDistance(candCoord, allyPos) === 1`) so advancing units spread into flank corridors instead of stacking in AoE clusters.
- **Alternative Considered**: Changing `KNIGHT_PACKAGE.aiProfile` to `'BRAWLER'`. Rejected because `Knight` retains `SUPPORT` ally-rally utility (`Lead the Charge`) and threat/AP weights; checking `hasRangedAttack` handles any hybrid melee-support kit generically.

### 3. Support Rally (`Lead the Charge`) and `POSITION_SWAP` (`Intercept Step`) Rescue Gating

- **Decision**:
  - In `scoreBuffAbility` (`src/core/ai/heuristics.ts`), when `(ability.aoeRadius ?? 0) > 0` and `statModEffect?.statModifiers` contains positive stat modifiers, count living unbuffed allied units (excluding self) within `ability.aoeRadius` of `actorCoord`. If `unbuffedAlliesInRadius >= 1`, add `(unbuffedAlliesInRadius + 1) * 5.0` to `score` so `Lead the Charge` clears the conservation threshold at battle start when allies are grouped near spawn. (Existing positive-modifier non-redundancy checks prevent repeat casts while active.)
  - When `ability.effects?.some((e) => e.type === 'POSITION_SWAP')`, compute `allyMinHostileDist` (nearest hostile to `targetCoord`) and `actorMinHostileDist` (nearest hostile to `actorCoord`). Return `{ score: 0 }` unless `allyMinHostileDist <= 2 && actorMinHostileDist > allyMinHostileDist`. When true, add `+12.0` rescue bonus.
- **Rationale**: Prevents a frontline `Shield-bearer` from scoring positive utility on swapping backward with a safe backline ally.

### 4. Keeping Multi-Target `Challenging Shout` Unrestricted & Scoring `TARGET_CHALLENGED`

- **Decision**:
  - Leave `challenging_shout` scoring unrestricted in `scoreDebuffAndUtility` (only suppressed on a target already `CHALLENGED` by the actor) so Knights and Shield-bearers challenge all visible enemies to protect allies.
  - In `scoreDebuffAndUtility`, if `ability.effects?.some((e) => e.condition === 'TARGET_CHALLENGED')` and `targetCu.activeConditions.some((c) => c.type === 'CHALLENGED')`, add `+8.0` (`Exploit Challenged target vulnerability`). Combined with enabling melee-only `SUPPORT` units to step into range 1, Knights naturally follow `Challenging Shout` with `Pommel Strike`.

### 5. Ally Follow-Up Check for 1-Turn Setup Debuffs & Anti-Solo-Dive

- **Decision**:
  - Add a helper `canTeamCapitalizeOnSetup(actorCu, ability, actorCoord, targetCoord, state)` in `src/core/ai/heuristics.ts` that returns `true` when either:
    1. **Self Follow-Up**: `actorCu.currentAp >= effectiveAbility.apCost + 1` and the actor has a damaging ability within range of `targetCoord` (or within 1 move + attack range if enough AP remains), **OR**
    2. **Allied Follow-Up**: at least one other living allied unit `allyCu` at `allyPos` satisfies `hexDistance(allyPos, targetCoord) <= getEffectiveMove(allyCu) + allyMaxAttackRange` (where `allyMaxAttackRange` is the max `range` of `allyCu`'s damaging abilities, or `1` fallback).
  - For non-damaging abilities (`ability.damageType === 'NONE' && !ability.effects?.some((e) => e.type === 'DAMAGE')`), gate 1-turn negative `STAT_MODIFIER` (`durationTurns === 1`) and `FORCE_FACING_AWAY` utility on `canTeamCapitalizeOnSetup(...)`, except preserve defensive `FORCE_FACING_AWAY` scoring when `threatensAlly` is already true (saving an engaged teammate).
  - In `decisionEngine.ts` `TELEPORT` no-attack repositioning, skip `candHex` if `isReachableByWalk && candElevation <= currentElevation` so `Rooftop Vault` is not burned to cross flat unengaged ground.
  - On move and `TELEPORT` destination evaluation, count `nearbyEnemies` (living hostiles within `2` hexes of `candCoord`) and `nearbyAllies` (other living allies within `3` hexes of `candCoord`). If `nearbyEnemies >= 3 && nearbyAllies === 0` and no finishing blow is achieved (`kill.score === 0`), apply `-15.0 * (nearbyEnemies - 1)` isolation penalty.
- **Trade-off**: Slightly more iteration over living allies per debuff candidate, which is negligible on 2v2–7v7 hex encounters (`<= 14` units).

### 6. `Coiled Apex` Final-AP Conservation Threshold

- **Decision**: In `decisionEngine.ts` step 3, start with `effectiveConservationThreshold = weights.apConservationThreshold`. If `cu.currentAp === 1 && (cu.virtualElevation ?? 0) === 0 && cu.passives?.some((p) => p.unspentApVirtualHeight)` and at least one living hostile is within `hexDistance(currentCoord, hostilePos) <= 4`, set `effectiveConservationThreshold = Math.max(effectiveConservationThreshold, 15.0)` and record it in `trace.apConservationThreshold`.
- **Rationale**: `Coiled Apex` grants `+1 Virtual Height` (+2 Attack Roll, +2 flat damage, and incoming Disadvantage on equal ground) plus `+20 CTB` gauge when ending a turn with `>= 1` unspent AP. Raising the threshold only for the final 1 AP within threat range prevents low-value 3rd-AP walks or low-odds pokes from wasting Coiled Readiness, while still allowing high-score finishers (`>= 15.0`) to execute.

## Risks / Trade-offs

- **Crowding Penalty on Tight Maps** -> Gating the `-2.5` adjacent-ally crowding penalty to `candDist >= 2` ensures brawlers still squeeze into melee (`candDist === 1`) when surrounding a target rather than refusing adjacent engagement slots.
- **Over-Conservation with `Coiled Apex`** -> Raising the threshold to `15.0` only when `cu.currentAp === 1` and `virtualElevation === 0` guarantees the Dragoon still moves and spends 2 AP on `Dragon Dive` or multiple attacks before evaluating whether to bank the final 1 AP.
- **Isolated Unit Test Fixtures** -> Existing AI unit tests that place a solitary Skirmisher with `Flash Powder` near 1v3 enemies without allies must still be reviewed: because the 1v1 simulation tests (`simulation.ts`) check `actorCu.currentAp >= apCost + 1` (Condition 1: Self Follow-Up), a solo 1v1 Skirmisher with 2+ AP still retains `Flash Powder` utility.

