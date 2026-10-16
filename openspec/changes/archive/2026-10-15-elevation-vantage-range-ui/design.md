# Design: Elevation Vantage Range Projection & UI Feedback

## Context

See [proposal.md](proposal.md) for motivation. Currently, `canExecuteAbility` and `computeAbilityMetrics` validate and project attack viability using the dynamic vantage formula ($\text{range} + \max(0, h_{\text{actor}} - h_{\text{target}})$), but `useCombatSimulation.ts` generates `abilityRangeCoords` using a static Euclidean hex radius `getHexesInRange(activeCoord, effective.range)`. As a result, tiles and enemies at distance 4–5 from elevated positions are omitted from both the visual range field and `candidateTargetCoords`.

## Goals / Non-Goals

**Goals:**
- Provide a single authoritative source of truth for grid range tile generation (`getAbilityRangeCoords`) shared by player UI hooks and AI decision logic.
- Dynamically project all tiles within effective vantage reach across non-uniform arena topography.
- Accurately exclude tiles from melee range fields that exceed vertical reach ($|\Delta h| > 1$) unless ignored by passives.
- Highlight candidate target tokens at distance 4–5 on the board when attacked from high ground.
- Display a dedicated vantage badge (`✦ Vantage (+X Range)`) in `UnitStatusCard.tsx` when targeting from higher elevation.

**Non-Goals:**
- Altering the core damage formula or to-hit mechanics (already handled by `attackRoll.ts` and `targetPreview.ts`).
- Altering line-of-sight raycasting or obstacle obstruction rules.
- Allowing melee attacks across vertical cliffs without appropriate passives.

## Decisions

### 1. Pure Range Helper: `getAbilityRangeCoords` in `validator.ts`
- **Choice:** Implement `getAbilityRangeCoords(arena, actorCoord, ability, cu)` in `src/core/combat/validator.ts`.
- **Logic:**
  1. For `targetType === 'SELF'`, return `[actorCoord]`.
  2. For melee abilities (`range <= 1`): iterate over tiles at distance $\le 1$. If $|\Delta h| > \text{maxReach}$ (default 1) and the unit does not ignore elevation penalties, exclude the tile.
  3. For ranged abilities (`range >= 2`): the theoretical maximum distance in the arena is $\text{range} + \max(0, h_{\text{actor}} - h_{\min})$. Query `getHexesInRange(actorCoord, maxRange)` and filter by `dist <= range + Math.max(0, h_actor - h_tile)` and `arena.hasTile(tile)`.
- **Alternatives Considered:**
  - *Compute inside `useCombatSimulation.ts`*: Rejected because it duplicates logic with `validator.ts` and leaves AI AoE hex targeting unaware of vantage.
  - *Iterate over all tiles in arena*: Valid alternative, but bounding candidate queries with `getHexesInRange(actorCoord, maxRange)` avoids scanning disconnected or off-grid tiles.

### 2. UI Hook & Target Candidate Integration
- **Choice:** In `useCombatSimulation.ts`, compute `abilityRangeCoords` via `getAbilityRangeCoords(state.arena, activeCoord, effectiveAbility, activeCu)`.
- **Cascade:** `candidateTargetCoords` continues to filter `abilityRangeCoords` using `canExecuteAbility`. Because `abilityRangeCoords` now includes distance 4–5 tiles, `candidateTargetCoords` automatically includes enemies on those tiles, triggering the `isCandidate` reticle in `HexGridSvg.tsx`.

### 3. AI Hex Targeting Consistency
- **Choice:** In `decisionEngine.ts`, update AoE hex ability targeting (e.g. Flash Powder) and mobility leaps (e.g. Rooftop Vault) to use `getAbilityRangeCoords` instead of static `getHexesInRange(currentCoord, ability.range)`.
- **Rationale:** Ensures AI units standing on ridges leverage full vantage reach when casting hex abilities down into groups of player units.

### 4. Target Preview Metadata & HUD Presentation
- **Choice:** Add optional `elevationVantageRange?: number` to `AbilityMetrics` and `TargetPreview` in `src/core/combat/targetPreview.ts`.
- **Rendering:** In `UnitStatusCard.tsx`, render `<span className="advantage-indicator-badge vantage">✦ Vantage (+{targetPreview.elevationVantageRange} Range)</span>` in the preview header row alongside flank and momentum badges.

## Risks / Trade-offs

- **[Performance of per-tile elevation checks]** → Arena tile counts are small ($\le 91$ tiles). Evaluating distance and elevation on candidate hexes takes $<0.1\text{ms}$, well within React render budget.
- **[Melee reach highlight surprises]** → Players might expect all adjacent hexes to be highlighted for melee. Excluding unreachable cliff drops ($|\Delta h| \ge 2$) provides accurate tactical feedback and prevents wasted AP attempts on impossible strikes.
