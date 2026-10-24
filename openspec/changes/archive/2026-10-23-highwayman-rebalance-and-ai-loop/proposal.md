# Proposal

## Why

During 3v3 squad combat benchmarks and 1v1 duels, the Tier 3 Highwayman suffers from a bottom-tier win rate (~40% in 3v3, 5% in 1v1 duels) and negligible net damage output (3.3 net damage/match). Analysis reveals two root causes:
1. **AI Decision Loop**: Highwayman casts `Stand and Deliver!` repeatedly on the same target multiple times within a single turn (in 40% of all turns) without following up with attacks. Because `Stand and Deliver!` possesses `CTB_DELAY: 20`, it was exempted from the universal non-redundancy guard and dominated action scoring over physical attacks.
2. **Kit Anti-Synergies**: Highwayman's innate passive `Highway Toll` grants `+2` physical damage only against targets with positive Armor (`> 0`). When Highwayman shreds -2 Armor with `Stand and Deliver!`, target Armor drops to 0, which actively deactivates `Highway Toll`. Furthermore, `Gallant Flourish` (Range 1) was cast 0 times in 50 matches due to Skirmisher standoff distance preferences and a lack of AI evaluation for self-evasion buffs, leaving Highwayman defenseless when cornered in melee.

Rebalancing Highwayman's passive and melee peel while eliminating AI debuff loop-spam restores the intended gun-and-blade skirmisher identity and elevates combat performance.

## What Changes

- **Highway Toll Passive Redesign**: Redefine `Highway Toll` to grant `+2` flat physical damage against targets whose base Force exceeds the actor's base Force (i.e. target Force $\ge 2$). This directly ties the "wealth extraction" thematic to high-Force opponents while ensuring that shredding their Armor with `Stand and Deliver!` does NOT turn off Highwayman's damage bonus.
- **Gallant Flourish Tactical Peeling**: Add a 1-hex evasive `RETREAT_STEP` to `Gallant Flourish` (stepping 1 hex away from the target on hit/crit back into Range 2 standoff) and add declarative `meleeContingency` AI metadata so Skirmishers prioritize it when cornered at Range 1.
- **AI Duplicate Non-Damage / Debuff Deprioritization**: Prevent the AI decision engine from casting the same non-damage or debuff ability (e.g. `Stand and Deliver!`) on the same target multiple times within a single turn, and drop primer bonus once the target is already primed with armor shred.
- **AI Self-Buff Evaluation on Attacks**: Update AI decision heuristics so offensive abilities with `targetScope: 'SELF'` stat buffs (such as `Gallant Flourish`'s `+2 Evasion`) receive proper tactical utility value in `scoreDebuffAndUtility`.
- **Baseline Retention**: Retain `Point-Blank Buckshot` at `1d8 + Finesse` with Knockback 1 to evaluate the impact of these flow and AI improvements before adjusting raw damage numbers.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `tier-3-highwayman`: Update `Highway Toll` requirement to trigger on target base Force exceeding actor base Force (or target Force $\ge 2$), and update `Gallant Flourish` to include a 1-hex `RETREAT_STEP` tactical disengagement away from the target.
- `hybrid-ai-heuristics`: Update AI decision heuristics to enforce per-turn duplicate non-damage ability deprioritization on the same target, drop primer scores on already-primed targets, and evaluate self-buffs on offensive attack actions.

## Impact

- `src/data/packages/highwayman.ts`: Updated `HIGHWAY_TOLL` definition, `GALLANT_FLOURISH` effects (`RETREAT_STEP`) and `aiHint.meleeContingency`.
- `src/core/types/passive.ts`: Extend passive trait definitions to support target Force comparison (`targetForceBonus` or updated `targetArmorBonus`).
- `src/core/combat/damageEngine.ts`: Update passive damage bonus calculation to evaluate target Force vs actor Force.
- `src/core/ai/heuristics.ts` & `src/core/ai/decisionEngine.ts`: Incorporate per-turn ability execution tracking to suppress duplicate non-damage debuffs on the same target, ensure primer bonus is extinguished once primed, and score self-buff components on attack actions.
- Tests & Simulations: Updates to `highwaymanIntegration.test.ts`, `packages.test.ts`, `passives.test.ts`, and 3v3 simulation benchmark telemetry.
