# Design: AI Threat Scoring, Tactical Movement Denial, and High-Ground Disruption

## Context

AI combat decision-making in `src/core/ai/` generates candidate actions across immediate abilities and move-and-act permutations. Currently, target selection combines `expectedDamage`, `killBonus`, `vulnerabilityWeight`, `flankWeight`, and `focusFireWeight`. When enemy casters perch on high ground, vertical penalties (Disadvantage or -2 roll penalty) depress expected damage and vulnerability scores, causing AI combatants to target low-ground frontline tanks instead. In parallel, `scoreDebuffAndUtility` lacks evaluation for `SLOW` effects and fails to score knockback cliff plunges or vantage disruption. See `proposal.md` for full motivation.

## Goals / Non-Goals

**Goals:**
* Add archetype-based target threat scoring (`scoreTargetThreat`) in `heuristics.ts` to prioritize backline casters and disrupters, offsetting low-ground disadvantage.
* Integrate target threat weighting into immediate single-target action scoring and composite move-and-act evaluations in `decisionEngine.ts`.
* Enhance `scoreDebuffAndUtility` to calculate knockback cliff-plunge fall damage and high-ground vantage disruption using `arena.calculateKnockback`.
* Enhance `scoreDebuffAndUtility` to score movement denial on `SLOW` effects against foes with Move $\ge 2$, with kiting utility against melee threats.
* Enforce universal non-redundancy guards preventing repetitive `SLOW` applications against targets with active negative movement modifiers.

**Non-Goals:**
* Dynamic threat meters or historical damage tracking across turns (scoring remains deterministic, fast, and stateless per turn).
* Allied knockback or repositioning heuristics.
* Modification of taunt peel heuristics for `CHALLENGED` (scoped separately to item 2.6).

## Decisions

### Decision 1: Archetype-Based Threat Weighting via `resolveAIProfile`
* **Choice**: Evaluate target threat based on the target's authoritative `AIProfile` resolved via `resolveAIProfile(targetCu)`.
  * `SNIPER`: $+10.0$ threat bonus (Warlock, Sorcerer, Wizard). High burst, low defensive pool.
  * `SUPPORT`: $+8.0$ threat bonus (Witch, Cleric). Action denial, curses, and sustain.
  * `SKIRMISHER`: $+4.0$ threat bonus (Highwayman, Thief, Cat-Burglar). Flanking burst.
  * `BRAWLER`: $0$ baseline threat bonus (Warrior, Cavalier, Berserker). Targeted via low HP finishing blows or focus-fire.
* **Rationale**: Fast ($O(1)$), deterministic, and directly captures class roles without heuristic jitter.
* **Alternative Considered**: Calculating dynamic threat from equipped ability damage formulas. Rejected due to performance overhead and erratic fluctuations from temporary buffs.

### Decision 2: Threat Weight Scaling Tuned to Offset Vertical Penalties
* **Choice**: Set `SNIPER` threat bonus to $+10.0$ and `SUPPORT` to $+8.0$.
* **Rationale**: Attacking upward from low ground ($\Delta h \le -2$) incurs Disadvantage, which lowers d20 hit chance by $\sim 15-20\%$ and expected damage by $\sim 2-4$ points. In the heuristic scoring formula (`expectedDamage * 3.0 + vulnerability`), this vertical penalty reduces total score by $\sim 6-10$ points. A $+8.0$ to $+10.0$ threat bonus reliably compensates for this mathematical drop, allowing AI units to prioritize perched snipers without ignoring near-death frontline targets (kill bonus remains $+80-120$).

### Decision 3: Terrain-Aware Knockback via `arena.calculateKnockback`
* **Choice**: In `scoreDebuffAndUtility`, simulate the knockback destination hex using `state.arena.calculateKnockback(actorCoord, targetCoord, distance)`.
  * **Fall Impact**: If `knockbackResult.fallDamage && knockbackResult.fallDamage > 0` or `plungedElevationDelta >= 2`, score fall damage utility:
    $$\text{Score} = \min(14.0, 8.0 + \text{fallDamage} \times 2.0)$$
  * **Vantage Disruption**: If `targetElevation > actorElevation` (or `targetElevation >= 1`) and destination hex elevation is lower than target's starting hex, award $+6.0$ vantage strip utility.
* **Rationale**: Reuses authoritative engine spatial logic in `arena.ts`, ensuring collision, walls, voids, and ledge fall damage rules match runtime execution.

### Decision 4: Movement Denial (`SLOW`) and Non-Redundancy Pipeline
* **Choice**:
  * If `ability.effects` contains `type === 'SLOW'`:
    * If `targetCu.activeModifiers.some(m => m.stat === 'move' && m.value < 0)`, return score $0$ for the slow effect. If the ability deals no damage, enforce the universal non-redundancy guard to suppress execution.
    * If target has effective `move >= 2`, award $+6.0$ movement denial utility.
    * If target is a `BRAWLER` and hex distance $> 1$ to actor or threatened allies, award an additional $+4.0$ kiting bonus.

## Risks / Trade-offs

* **[Risk] AI over-focuses high-threat snipers while ignoring easy kills** → **Mitigation**: `scoreFinishingBlow` awards $+80$ to $+120$ bonus when target HP $\le$ expected damage, which overwhelmingly outweights the $+10.0$ threat bonus.
* **[Risk] High-ground knockback pushes enemies out of follow-up attack range** → **Mitigation**: Standoff distance scoring naturally rewards snipers and skirmishers who prefer distance $\ge 2$, while brawlers prioritize closing distance unless a cliff plunge is present.
