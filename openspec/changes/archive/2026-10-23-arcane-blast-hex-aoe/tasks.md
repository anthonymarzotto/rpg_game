# Tasks

## 1. Ability Contract & Data Package Updates

- [x] 1.1 Add optional `splashDamageProfile?: DiceProfile` to `Ability` interface in [`src/core/types/ability.ts`](file:///c:/Repos/rpg_game/src/core/types/ability.ts) and verify type checking passes via `npm test -- src/core/units/packages.test.ts`
- [x] 1.2 Update `ARCANE_BLAST` definition in [`src/data/packages/wizard.ts`](file:///c:/Repos/rpg_game/src/data/packages/wizard.ts) to `targetType: 'HEX'` and declare `splashDamageProfile: { count: 1, sides: 4 }`; verify package tests pass

## 2. Core Combat Resolution & Contested Rolls

- [x] 2.1 Update `canExecuteAbility` in [`src/core/combat/validator.ts`](file:///c:/Repos/rpg_game/src/core/combat/validator.ts) to validate line-of-sight and reach for damaging `targetType: 'HEX'` abilities across both occupied and unoccupied arena hexes; verify via validator unit tests
- [x] 2.2 Refactor damaging attack resolution in [`src/core/combat/resolver.ts`](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts) to support `targetType: 'HEX'` and the unified spellcast roll: roll single d20 + modifier, contest center unit (if present) for direct damage, and contest all units in `aoeRadius` for splash damage using `splashDamageProfile`; verify via tests in `resolution.test.ts`
- [x] 2.3 Enforce friendly fire across all secondary targets in the blast radius (allies and enemies alike, excluding caster) in [`src/core/combat/resolver.ts`](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts); verify via tests in `resolution.test.ts`

## 3. Targeting Preview & Combat Feedback

- [x] 3.1 Update `computeAbilityMetrics` and `computeTargetPreview` in [`src/core/combat/targetPreview.ts`](file:///c:/Repos/rpg_game/src/core/combat/targetPreview.ts) to compute expected direct and splash damage across all affected units when hovering candidate hexes; verify via `targetPreview.test.ts`
- [x] 3.2 Update combat log and floating text dispatch in [`src/ui/combat/useCombatSimulation.ts`](file:///c:/Repos/rpg_game/src/ui/combat/useCombatSimulation.ts) to render multi-target hit/miss floaters and secondary damage details; verify with component tests

## 4. AI Ground-Targeted AoE Evaluation & Simulation

- [x] 4.1 Implement candidate ground hex evaluation in [`src/core/ai/decisionEngine.ts`](file:///c:/Repos/rpg_game/src/core/ai/decisionEngine.ts) for damaging abilities with `targetType: 'HEX'` and `aoeRadius > 0`, calculating net multi-target score with friendly-fire penalty (-25 per ally); verify via `decisionEngine.test.ts`
- [x] 4.2 Run 3v3 combat simulation suite with Wizard cast profiles to verify cluster targeting, friendly-fire avoidance, and balance stability; verify 100-match suite completes with 0 errors
