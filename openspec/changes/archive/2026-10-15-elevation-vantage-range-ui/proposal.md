# Proposal: Elevation Vantage Range Projection & UI Feedback

## Why

In tactical combat, units situated on high ground ($\Delta h \ge 1$) enjoy range extension on ranged attacks ($\text{range} \ge 2$) by $+1$ hex per elevation level above their target. While core validation and damage preview in `validator.ts` and `targetPreview.ts` permit these attacks at distance 4–5, the UI hook `useCombatSimulation.ts` computes active ability range tiles using a static flat radius (`getHexesInRange(activeCoord, effective.range)`).

Because candidate target detection filters this static list, tiles and enemy units situated at distance 4–5 never receive the amber range field wash or target candidate reticles on the board. Furthermore, melee range highlighting currently highlights adjacent tiles that are vertically out of reach ($|\Delta h| \ge 2$). Fixing this ensures that visual range indicators accurately reflect terrain vantage and melee reach constraints across the battlefield.

## What Changes

- **Centralized Ability Range Helper**: Introduce a pure function `getAbilityRangeCoords(arena, actorCoord, ability, cu)` in core combat that computes all tiles within an ability's true reach, respecting per-tile elevation vantage for ranged attacks ($\text{dist} \le \text{range} + \max(0, h_{\text{actor}} - h_{\text{tile}})$) and vertical reach constraints for melee attacks ($|\Delta h| \le \text{reach}$).
- **UI Range & Candidate Target Synchronization**: Update `useCombatSimulation.ts` to generate `abilityRangeCoords` via `getAbilityRangeCoords`, allowing `candidateTargetCoords` to automatically discover and render target reticles for enemies at distance 4–5 from elevated positions.
- **Melee Reach Range Filtering**: Exclude adjacent hexes with $|\Delta h| > \text{reach}$ (default 1) from melee ability range fields unless the combatant has an elevation-ignoring passive.
- **AI AoE & Leap Consistency**: Update `decisionEngine.ts` to utilize the shared range helper for AoE hex targeting and mobility leaps so AI units on ridges also evaluate targets at extended vantage ranges.
- **Target Preview Vantage Indicator**: Expose `elevationVantageRange` in `TargetPreview` / `AbilityMetrics` and render a `✦ Vantage (+X Range)` indicator in `UnitStatusCard.tsx` when targeting an enemy at lower elevation.

## Capabilities

### Modified Capabilities
- `elevation-combat-modifiers`: Update `Ranged Elevation Vantage` and `Melee Elevation Reach Constraints` to mandate that grid range projection and candidate target discovery evaluate per-tile elevation differences, and add `Elevation Vantage Preview Feedback` requirement for HUD target inspection.

## Impact

- `src/core/combat/validator.ts`: Export pure `getAbilityRangeCoords` helper.
- `src/core/combat/targetPreview.ts`: Expose elevation vantage range in `TargetPreview` and `AbilityMetrics`.
- `src/ui/combat/useCombatSimulation.ts`: Replace static `getHexesInRange` with `getAbilityRangeCoords`.
- `src/ui/combat/UnitStatusCard.tsx`: Display `✦ Vantage (+X Range)` badge in the target preview header.
- `src/core/ai/decisionEngine.ts`: Wire `getAbilityRangeCoords` into AoE and mobility leap candidate evaluation.
- `src/core/combat/elevationCombat.test.ts` & `src/ui/combat/useCombatSimulation.test.tsx`: Unit and integration test coverage for vantage range rendering and melee reach constraints.
