# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress

### 2. AI & Mechanics Edge Cases
- [x] **2.1**: Signature Ability Exclusivity & Mobility Refactor (Rooftop Vault & Shadow Step):
  * Enforced active-class exclusivity for Signature Abilities in loadout validation (`src/core/units/loadout.ts`) and Camp UI (`src/ui/camp/HeroProgressionDrawer.tsx`), preventing them from being equipped as wildcard/resonant skills.
  * Restricted Thief's `Shadow Step` strictly to same-elevation hexes (`sameElevationOnly: true`), preventing cliff scaling and fall damage avoidance.
  * Expanded Cat-Burglar's signature `Rooftop Vault` to Range 3 with unconstrained 3D verticality and +2 Evasion for 1 turn upon landing.
  * Aligned AI decision engine (`src/core/ai/decisionEngine.ts`) and heuristics to evaluate same-elevation candidate filtering, cliff leaps, and 3-hex Solo Heist execution.
- [x] **2.2**: AI scoring support for hostile `SLOW` debuff (`Frostbite`) & movement denial:
  * Added `SLOW` effect evaluation in `scoreDebuffAndUtility` to value Move reduction against enemies with Move >= 2, with kiting priority against melee threats.
  * Added non-redundancy guard to prevent reapplying `SLOW` if target already has an active negative movement modifier.
- [x] **2.3**: AI Threat Scoring & High-Ground Disruption:
  * Added target threat weighting to AI decision engine to target high-damage backline casters (Warlock, Witch) even when low-ground vertical penalties reduce hit probability.
  * Added displacement / `KNOCKBACK` utility scoring against units holding High Ground Vantage (prioritize shoving perched snipers off cliffs for fall impact damage and vantage disruption).
- [x] **2.4**: Arcane Blast: Hex ground-targeting, direct center vs. radial splash damage, and AI AoE multi-target evaluation:
  * Switch `targetType` to `'HEX'`, enabling ground targeting across walkable arena tiles within range 3 (both occupied and unoccupied).
  * Establish explicit damage split between center hex (direct hit) and radius-1 ring (splash damage).
  * Update `targetPreview`, combat log, and floating combat text to support ground-targeted blast events.
  * Add AI candidate hex evaluation in `decisionEngine.ts` to score center damage + secondary splash hits minus friendly fire penalties.
- [ ] **2.5**: Assess breaking CHALLENGE status if damaged by an enemy other than the challenger.
- [ ] **2.6**: Knight Kit Identity, Support Synergy & Taunt Peel Investigation:
  * **AI Taunt Targeting & Peel (`CHALLENGED`)**: In `heuristics.ts`, enemy target evaluation does not penalize targeting non-challengers while afflicted with `CHALLENGED`. Enemies continue focusing squishy allies through Disadvantage (dropping Wizard ally survival from 27.8% to 11.1%). Add AI targeting weights/penalties to redirect attacked foes toward the challenger.
  * **`Lead the Charge` AP Economy & Protection**: Costs 2 AP (out of 3) for `+2 Move` / `+2 Speed`, starving the Knight of AP while offering zero damage absorption (no Guard, Shield, Ward, or Armor buff) to allies. Assess 1 AP tuning, adding defensive absorption/Guard, or charge momentum.
  * **DPS Vacuum on `Pommel Strike`**: Knight averages only 3.6 net damage in 2v2 (vs. Warrior's 13.5, a -9.9 deficit). Although Knight boosts partner damage across all 10 classes (+5.2 average), the team loses the damage race with non-hypercarry partners. Assess scaling `Pommel Strike` (e.g. bonus damage vs Challenged targets, Armor scaling) or retaliatory counter-strike threat.
  * **Allied Guard / Interception Mechanics**: Knight possesses high personal durability and starting CTB (`Tactical Vanguard`), but lacks any ability/passive to intercept attacks, guard adjacent allies, or punish enemies bypassing the frontline. Assess true tanking mechanics to enable backline protection.

---

## 🎯 Next Up (Immediate Combat & UX Tuning)

### 1. In-Combat Unit Inspection & Effect Tooltips
- [ ] **1.1**: Allow clicking/selecting any unit (ally or enemy) to pin their info card during combat.
- [ ] **1.2**: Hover tooltips on active condition badges (inspect exact `POISON`, `BURN`, `STEALTH`, `CHALLENGED` effects & durations).
- [ ] **1.3**: View active skill loadout and remaining AP/CTB in the pinned card.

### 4. Enemy Threat Calibration & Pre-Ascension Snapshot
- [ ] **4.1**: Investigate pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp). Balance against the player's ability to scout and plan for upcoming incursions rather than rubber-banding on deploy; re-evaluate alongside Horizon 2 sector map nodes.

### 5. UX Updates
- [ ] **5.1**: Higlight movement path
- [ ] **5.2**: Implement the ruins tokens

---

## 📝 Playtest Scratchpad

1. **Shard Stats in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
2. **Knight Survivability & Soak**:
   * *Observation*: Knight average soak in 3v3 was only 2.3. With 2 Armor and 0 Ward, magical damage (Warlock, Witch, Wizard, Sorcerer) completely bypasses mitigation, while physical attacks often shred or bypass armor. Consider exploring protective scaling (e.g. base Ward, or armor/soak bonuses against `CHALLENGED` foes).
3. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcards.
4. **Cavalier Kit Flow: Inherent Spacing vs. Wildcard Synergy**:
   * *Observation*: Cavalier win rate rose from 38.1% to 50.0% and misses halved to 10.5% when equipped with Shield Bash (61 casts) and Momentum, breaking its range-1 lockout. Consider whether Cavalier needs an innate spacing mechanic in its base kit (e.g. minor shove or step) or if relying on brawler wildcards is the intended progression payoff.
5. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static list.
