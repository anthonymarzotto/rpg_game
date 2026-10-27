# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress
### 1. In-Combat Unit Inspection & Effect Tooltips
- [x] **1.1**: Allow clicking/selecting any unit (ally or enemy) to pin their info card during combat.
- [x] **1.2**: Hover tooltips on active condition badges (inspect exact `POISON`, `BURN`, `STEALTH`, `CHALLENGED` effects & durations).
- [x] **1.3**: View active skill loadout and remaining AP/CTB in the pinned card.

---

## 🎯 Next Up

### 2. Enemy Threat Calibration & Pre-Ascension Snapshot
- [ ] **2.1**: Investigate pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp). Balance against the player's ability to scout and plan for upcoming incursions rather than rubber-banding on deploy; re-evaluate alongside Horizon 2 sector map nodes. Generally, a bit too easy right now. Trial 3 and 6 were the most exciting and difficult tactically.

---

## (icon) UX Updates
- [ ] **UX.1**: Highlight movement path.
- [ ] **UX.2**: Is it possible to show meeting an XP threshhold in the "Harvest Trial Spoils" dialog?
- [ ] **UX.3**: "Harvest Trial Spoils** dialog: The whole "FRC: - +# + Total: #" is not visually appealing. No left/right space on the +/- buttons; redundant "+" on the added points (you can't be negative, its zero or positive); "Total" is bumped up against the "-" button; "Total:" is all over the place which is awkward; Warning "Allocate all ..." in the bottom left can just be a tooltip on the "Proceed to Camp" button;
- [ ] **UX.4**: Combat Log: Filter by unit. Show actions where it was the actor or was targeted (or splash damaged).
- [ ] **UX.5**: Let the User place their units at opening. Enemy team to also do better at starting positions.
- [ ] **UX.6**: Combat Manifest: Show Archetype tags for Class Abilities.

---

## (icon) Bugs
- [ ] **B.1**: The facing arrows should show at the highest layer. Right not they are hidden partially behind, at least, other adjacent units.
- [ ] **B.2**: Skirmish shouts "Knockback!" when used. It either doesn't need anything, or should be something more appropriate.
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.5**: "Stealth broken by damage" card in Combat Log is not nicely formatted.
- [ ] **B.6**: Arcane Blast deals damage to the ground when targeting a hex with no unit.
- [ ] **B.7**: Infiltrators are trying to Smoke Veil other units. I'm not sure if it was successful. Smoke Veil should only target self.
- [ ] **B.8**: Burn damage card in Combat Log is not nicely formatted.
- [ ] **B.9**: Garrick did not reveal Ash Infiltrator from Stealth on T12 move.
- [ ] **B.10**: Shard effects don't show well in the Trial on ability cards.

---

## 📝 Playtest Scratchpad

1. **Shard Stats in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
2. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcards.
3. **Cavalier Kit Flow: Inherent Spacing vs. Wildcard Synergy**:
   * *Observation*: Cavalier win rate rose from 38.1% to 50.0% and misses halved to 10.5% when equipped with Shield Bash (61 casts) and Momentum, breaking its range-1 lockout. Consider whether Cavalier needs an innate spacing mechanic in its base kit (e.g. minor shove or step) or if relying on brawler wildcards is the intended progression payoff.
4. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static list.
