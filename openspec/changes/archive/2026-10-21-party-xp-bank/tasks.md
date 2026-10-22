# Tasks

## 1. Core Combat XP Engine & AP Scaling

- [x] 1.1 Add `partyXpPool: InBattleXp` to `CombatState` in `src/core/combat/types.ts` and initialize it to zeroed archetype points in combat factory methods. Verify TypeScript compilation with `npm run build --noEmit` or `vitest run`.
- [x] 1.2 Update `src/core/combat/resolver.ts` to award player ability execution XP into `state.partyXpPool` scaled by `Math.max(1, effectiveAbility.apCost ?? 1)`, award 0 XP for movement, and award 0 XP for enemy unit actions.
- [x] 1.3 Add tests in `src/core/combat/resolution.test.ts` verifying AP-scaled XP accumulation (1 AP = 1 XP, 2 AP = 2 XP, 3 AP = 3 XP) into `state.partyXpPool`, zero movement XP, and zero enemy action XP. Verify with `npm test src/core/combat/resolution.test.ts`.

## 2. Campaign Transitions & Defeat Halving

- [x] 2.1 Update `CampaignBattleResult` and outcome reconciliation functions (`resolveCampaignVictory`, `resolveCampaignDefeat`) in `src/core/campaign/transitions.ts` to accept distributed unit XP allocations from the party pool, retaining 100% on victory and 50% (`Math.floor(pool * 0.5)`) on defeat.
- [x] 2.2 Add unit tests in `src/core/campaign/transitions.test.ts` verifying 100% victory distribution and 50% defeat distribution into unit `accumulatedXp`. Verify with `npm test src/core/campaign/transitions.test.ts`.

## 3. Harvest Distribution UI & Game Loop Integration

- [x] 3.1 Implement `HarvestDistributionModal` in `src/ui/combat/HarvestDistributionModal.tsx` and styling in `HarvestDistributionModal.css` with pool counters, deployed hero cards, `+` / `-` allocation steppers, and a "⚡ Distribute Evenly / Auto-Fill" button that requires 0 remaining pool to submit.
- [x] 3.2 Add unit tests in `src/ui/combat/HarvestDistributionModal.test.tsx` verifying stepper limits, auto-fill distribution math, and proceed button disable/enable states. Verify with `npm test src/ui/combat/HarvestDistributionModal.test.tsx`.
- [x] 3.3 Wire `HarvestDistributionModal` into `CombatArena.tsx` and `App.tsx` for victory and defeat flows so player allocations flow into `resolveCampaignVictory` / `resolveCampaignDefeat` before returning to Camp. Verify end-to-end combat transition tests pass.

## 4. Combat HUD Cleanup & Simulation Verification

- [x] 4.1 Remove per-unit XP progress bars from `src/ui/combat/UnitStatusCard.tsx` and add a compact shared party pool indicator badge to `src/ui/combat/InitiativeRibbon.tsx` or arena header. Update `UnitStatusCard.test.tsx`.
- [x] 4.2 Update combat simulations in `src/core/combat/simulation.ts` and `src/core/combat/simulation.test.ts` to measure and report party XP pool accumulation. Run `npm run sim` and the full test suite with `npm test`.
