# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress

### 2. AI & Mechanics Edge Cases
- [x] **2.5**: Assess breaking CHALLENGE status if damaged by an enemy other than the challenger. *(Decided: not pursuing — nerfs taunt/focus-fire synergy; folded into 2.6.)*
- [x] **2.6**: Knight Commander Kit Rework & Synergy Taunt: *(Completed & archived in `knight-commander-rework`)*
  * **`Lead the Charge` 2 AP Signature Tuning**: Retain 2 AP cost, adding `+2 Attack` roll buff alongside `+2 Move` and `+2 Speed` to allies within 3 hexes for 2 turns to drive team offensive tempo.
  * **Synergy Taunt & `EXPOSED` Defiance Penalty**: When a `CHALLENGED` unit attacks a target other than its challenger, inflict `EXPOSED` (the next incoming attack against them gains Advantage, consumed on attack).
  * **`Pommel Strike` Scaling vs. Challenged**: Add `+1d4` bonus damage when striking `CHALLENGED` targets, rewarding the Knight for engaging challenged foes.
  * **Class Identity & Guard Clarification**: Knight leans fully into the Commander identity (tempo, team buffs, focus-fire setup). Dedicated guardian/interception mechanics reserved for Shield-bearer. Class catalog description updated.

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
- [x] **5.2**: Implement the ruins tokens *(Completed: normalized 8-directional ruins pixel assets, deterministic coordinate rotation hashing, standee rendering in HexGridSvg with elevation alignment)*

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
