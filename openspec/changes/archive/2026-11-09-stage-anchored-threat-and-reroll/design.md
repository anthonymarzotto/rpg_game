# Design: Stage-Anchored Threat Calibration & War Room Reroll

## Context

In v0.10.0, deployment budgets were introduced alongside a dynamic formula in `encounterGenerator.ts`:
`targetBudget = Math.max(stageBudget, computeStageThreatBudget(squadThreat, stage))`.

When a player fields an 8-unit squad or accumulates battle XP, `computeProjectedSquadThreat` sums all 8 units (+15 projected threat each), reaching ~340 pts. Compounded by `STAGE_THREAT_SCALING_RATE` (1.4x at Stage 5), this inflated enemy threat to 475 pts. Meanwhile, `CampHub` and `ExpeditionWarRoom` enforce `getStageDeploymentBudget(stage)` (200 pts for Stage 5, 220 pts for Stage 6), locking the player out of combat until they bench units down to 220 pts while the 475 pt enemy army remains frozen.

See `proposal.md` for full motivation.

## Goals / Non-Goals

**Goals:**
- Anchor the enemy target threat directly to the stage deployment budget plus approximately one extra hostile of the highest unlocked tier for that stage.
- Decouple enemy encounter threat from active squad size and pre-ascension level projections.
- Expose the existing `regenerateCurrentStageEncounter` campaign transition via an "Astral Re-Scry" / "Re-roll Trial" button in the `ExpeditionWarRoom` panel.
- Maintain full compatibility with unlimited squad sizes up to the stage point budget.

**Non-Goals:**
- Imposing a hard ceiling on player unit count (unlimited squad size up to the point budget remains supported).
- Reworking `assembleEnemySquad` tier selection or class package purchasing logic.

## Decisions

### 1. Stage-Anchored Threat Calculation

In `threatBudget.ts`, introduce `getStageHostileBonusThreat(stage: number): number`:
- **Stage 1**: +10 pts (1 Novice hostile bonus -> 30 + 10 = 40 pts)
- **Stage 2**: +25 pts (1 Tier-1 hostile bonus -> 80 + 25 = 105 pts)
- **Stage 3–4**: +40 pts (1 Tier-2 hostile bonus -> Stage 3: 120 + 40 = 160 pts, Stage 4: 160 + 40 = 200 pts)
- **Stage 5+**: +55 pts (1 Tier-3 hostile bonus -> Stage 5: 200 + 55 = 255 pts, Stage 6: 220 + 55 = 275 pts)

In `encounterGenerator.ts`, update `generateStageEncounter`:
```typescript
const stageBudget = getStageDeploymentBudget(stage);
const hostileBonus = getStageHostileBonusThreat(stage);
const targetBudget = stageBudget + hostileBonus;
```

*Rationale*: Guarantees that the enemy force consistently presents ~1 unit's worth of numerical/threat advantage over the player's maximum allowed vanguard. Eliminates runaway scaling regardless of roster size.

*Alternative Considered*: Dynamic scaling capped at `Math.min(squadThreat, stageBudget) * multiplier`. Rejected because players who deploy under-budget would see rubber-banding, and players deploying at cap would still face arbitrary multiplier inflation.

### 2. In-Camp Trial Re-Scry Control

In `src/core/campaign/transitions.ts`, `regenerateCurrentStageEncounter(state: CampaignState, newSeed?: number)` is already implemented and verified.

In `src/ui/camp/CampHub.tsx`:
- Implement `handleRerollEncounter = useCallback(() => { onUpdateCampaign(regenerateCurrentStageEncounter(campaign)); }, [campaign, onUpdateCampaign]);`.
- Pass `onRerollEncounter={handleRerollEncounter}` into `ExpeditionWarRoom`.

In `src/ui/camp/ExpeditionWarRoom.tsx`:
- Render a secondary action button in the War Room header (e.g. `[ ⟳ Re-roll Trial ]` / `[ 🔮 Re-scry Sector ]`).
- Clicking invokes `onRerollEncounter`, which produces a fresh seed and recalculates arena obstacles and enemy composition at the same stage budget.

*Rationale*: Gives players agency to scout and refresh unfavorable enemy matchups or arena terrain directly from Camp without requiring a game reload or save manipulation.

## Risks / Trade-offs

- **[Risk] Player deploys significantly below the stage budget**: A player deploying only 1 unit (e.g. 55 pts) faces the full 255 pt Stage 5 enemy army.
  - *Mitigation*: The War Room header displays the detected hostile count and threat points, making the danger immediately obvious. Players can also re-roll the encounter if desired.
- **[Risk] Accidental re-roll button clicks**: Player might lose a desirable enemy lineup or terrain layout.
  - *Mitigation*: Position the button neatly in the War Room reconnaissance header, distinct from the primary "Deploy Squad" button.
