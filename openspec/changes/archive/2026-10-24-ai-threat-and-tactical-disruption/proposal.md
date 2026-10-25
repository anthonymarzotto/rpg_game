# Proposal: AI Threat Scoring, Tactical Movement Denial, and High-Ground Disruption

## Why

Autonomous AI combatants currently suffer from two interrelated targeting blind spots:
1. **Verticality & Threat Tunneling**: Because low-ground attackers suffer roll penalties and Disadvantage against targets on high ground ($\Delta h \le -1$ or $\le -2$), expected damage and hit vulnerability scores drop significantly. Consequently, AI units tunnel into high hit-chance frontline brawlers while ignoring deadly, glass-cannon backline casters (Warlocks, Witches, Wizards) perched on high-ground perches.
2. **Missing Hostile Utility Evaluation**: The AI decision engine values abilities like `Frostbite` solely for raw spell damage, ignoring the tactical movement denial of `SLOW` against melee threats and lacking non-redundancy guards against re-applying movement debuffs. Furthermore, `KNOCKBACK` evaluation ignores high-ground terrain hazards, missing opportunities to shove perched snipers off cliffs for lethal fall impact damage and vantage disruption.

Addressing these issues together in a unified heuristic pass ensures combatants make intelligent target selections, kite dangerous melee threats, and actively exploit arena elevation hazards.

## What Changes

* **Archetype Threat Weighting**: Implement `scoreTargetThreat` in `heuristics.ts` and integrate it into candidate action evaluation in `decisionEngine.ts`. Assign tactical threat weighting based on target archetype (`SNIPER`, `SUPPORT`, `SKIRMISHER`) to counterbalance vertical disadvantage penalties against priority targets.
* **High-Ground Disruption & Cliff Plunge Scoring**: Enhance `KNOCKBACK` evaluation in `scoreDebuffAndUtility` to inspect destination hexes via `state.arena.calculateKnockback`. Award substantial utility bonus for shoving enemies off ledges with fall impact damage ($\Delta h \le -2$) and stripping high-ground vantage.
* **Hostile Movement Denial (`SLOW`) Scoring**: Enhance `scoreDebuffAndUtility` to score `SLOW` effects (e.g. `Frostbite`), prioritizing movement reduction against targets with Move $\ge 2$ and granting kiting bonuses when facing melee `BRAWLER` threats.
* **Movement Debuff Non-Redundancy Guard**: Suppress `SLOW` utility if the target already has an active negative movement modifier (`stat === 'move' && value < 0`).

## Capabilities

### Modified Capabilities
- `hybrid-ai-heuristics`: Extends AI tactical decision heuristics to support archetype-based threat weighting, cliff-plunge fall damage scoring for knockback abilities, and hostile movement denial evaluation for `SLOW` effects with non-redundancy guards.

## Impact

* **Code Modules**:
  * `src/core/ai/heuristics.ts`: Add `scoreTargetThreat`, extend `scoreDebuffAndUtility` with `SLOW` and high-ground `KNOCKBACK` plunge/vantage scoring.
  * `src/core/ai/decisionEngine.ts`: Incorporate `scoreTargetThreat` into immediate action scoring and move-and-act evaluation.
  * `src/core/ai/types.ts`: Define `AIArchetypeWeights.threatWeight` or archetype-based threat scoring interface if needed.
  * `src/core/ai/decisionEngine.test.ts`: Add unit test coverage verifying high-threat caster targeting through disadvantage, cliff-plunge knockback prioritization, and `SLOW` kiting/non-redundancy.
* **Performance / Stability**: Heuristics remain deterministic with minimal overhead using existing spatial and arena methods.
