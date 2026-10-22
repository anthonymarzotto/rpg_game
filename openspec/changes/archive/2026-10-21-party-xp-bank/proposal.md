# Proposal

## Why

Under the existing in-combat progression model, archetype XP is earned strictly on a per-unit basis whenever that individual executes a tagged skill. Because CTB initiative and turn pacing heavily favor high-Speed, low-AP classes (like the Finesse-based Highwayman/Thief), faster units cycle 2x to 3x more actions and accumulate vastly disproportionate XP compared to slower, heavier classes (like the Cavalier/Warrior). Additionally, this per-unit generation forces players into awkward, anti-thematic skill rotations—such as forcing an aspiring hybrid hero to spam weak Novice skills instead of their exciting signature kit—and clutters the combat HUD with per-unit XP progress bars.

By shifting in-battle XP into a shared Party XP Pool, scaling XP by ability AP cost (1 AP = 1 XP, 2 AP = 2 XP, 3 AP = 3 XP), retaining 50% of the pool on defeat, and presenting a dedicated "Harvest & Feed" allocation dialog after the trial, players gain strategic freedom to distribute combat gains to any deployed squad hero before leveling them up in Camp.

## What Changes

- **AP-Scaled Combat XP**: Abilities generate XP scaled to their AP cost (`Math.max(1, apCost ?? 1)`). Moving continues to grant 0 XP.
- **Shared Party XP Pool**: In combat, all XP earned by player units is aggregated into a single `partyXpPool: InBattleXp` on the combat state instead of tracking fragmented per-unit combat XP.
- **Arena HUD Simplification**: Remove the distracting per-unit XP progress bars from unit cards in the arena; add an unobtrusive team pool tracker in the combat banner/ribbon.
- **50% XP Retention on Defeat**: When a trial is lost, 50% (`Math.floor(pool * 0.5)`) of the battle's party XP pool is retained for distribution rather than discarding all gains.
- **Post-Trial Harvest Distribution**: After combat ends (Victory or Defeat), a dedicated Harvest & Feed modal displays the earned XP pool and the deployed vanguard heroes. Players allocate pool XP to squad heroes' personal `accumulatedXp` using `+` / `-` steppers or a one-click "⚡ Distribute Evenly / Auto-Fill" button. The pool must be emptied to 0 before proceeding to Camp.
- **Camp Leveling Continuity**: In Camp, heroes spend their personal `accumulatedXp` in the Hero Progression Drawer to purchase class and waypoint advancements as before. Reserve recruits remain clean and cannot draw from the battle harvest unless deployed.

## Capabilities

### Modified Capabilities
- `campaign-progression`: Update in-battle XP generation to aggregate into a shared party pool scaled by ability AP cost (`Math.max(1, apCost ?? 1)`), modify victory reconciliation to support harvested squad allocations, and modify defeat reconciliation to retain 50% of the party XP pool for distribution.
- `campaign-game-loop`: Insert the post-trial Harvest Distribution step into the combat-to-camp hand-off flow for both victory and defeat sequences, requiring full distribution of the earned pool before transitioning to the Camp Hub.

## Impact

- **Core Combat (`src/core/combat/`)**: `resolver.ts` updates to credit `state.partyXpPool` scaled by AP cost; `types.ts` adds `partyXpPool` to `CombatState`.
- **Campaign Logic (`src/core/campaign/`)**: `transitions.ts` updates `CampaignBattleResult` and outcome handlers (`resolveCampaignVictory`, `resolveCampaignDefeat`) to accept distributed unit XP allocations.
- **Combat UI (`src/ui/combat/`)**: `UnitStatusCard.tsx` removes per-unit XP bars; `BattleVictoryModal.tsx` and `BattleDefeatModal.tsx` transition into or embed the `HarvestDistributionModal`.
- **Tests & Simulations (`src/core/combat/simulation.ts`)**: Combat simulation and resolver tests updated to verify shared party pool accumulation and AP scaling.
