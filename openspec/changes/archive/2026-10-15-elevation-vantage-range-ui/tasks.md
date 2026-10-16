# Tasks

## 1. Core Range Calculation Helper

- [x] 1.1 Implement and export pure `getAbilityRangeCoords(arena, actorCoord, ability, cu)` in `src/core/combat/validator.ts` supporting ranged elevation vantage, flat/upward constraints, self-targeting, and melee vertical reach limits. Verify through unit tests.
- [x] 1.2 Add comprehensive unit tests in `src/core/combat/elevationCombat.test.ts` testing `getAbilityRangeCoords` for ranged attacks (base 2/3 extending to 4/5 on elevation 2/3), melee attacks filtering $|\Delta h| \ge 2$, and passive traits bypassing reach limits. Verify tests pass with `npm test`.

## 2. UI Hook & Target Reticle Integration

- [x] 2.1 Update `useCombatSimulation.ts` to compute `abilityRangeCoords` using `getAbilityRangeCoords(state.arena, activeCoord, effective, activeCu)` so tiles and candidate targets at distance 4–5 are populated. Verify candidate target reticles are returned.
- [x] 2.2 Add tests in `src/ui/combat/useCombatSimulation.test.tsx` verifying `abilityRangeCoords` and `candidateTargetCoords` when an actor on an elevated ridge selects a ranged ability. Verify tests pass with `npm test`.

## 3. Target Preview Vantage Badge

- [x] 3.1 Expose `elevationVantageRange` on `AbilityMetrics` and `TargetPreview` in `src/core/combat/targetPreview.ts` when $\Delta h \ge 1$ and ability range $\ge 2$. Verify with unit tests in `src/core/combat/targetPreview.test.ts`.
- [x] 3.2 Update `UnitStatusCard.tsx` to render the `✦ Vantage (+X Range)` badge in the target preview header when hovering an enemy at lower elevation.
- [x] 3.3 Add CSS styling for `.advantage-indicator-badge.vantage` in `CombatArena.css` or `UnitStatusCard.css` matching tactical HUD aesthetics.

## 4. AI Hex Targeting & Regression Verification

- [x] 4.1 Update `src/core/ai/decisionEngine.ts` AoE hex ability targeting and mobility leap range candidate generation to use `getAbilityRangeCoords`.
- [x] 4.2 Run full test suite (`npm test`) and production build (`npm run build`) to ensure zero regressions across all test suites.
