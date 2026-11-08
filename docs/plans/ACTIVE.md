# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress
- [x] **UX.18 / UX.13 / UX.4**: **Combat Log Polish, Faction Theming & Unit Filtering**:
  - OpenSpec change: `combat-log-polish-and-filtering`.
  - Architecture: Strongly-typed logging pipeline (`combatLogger.ts`) with automatic `faction: Faction` resolution and affected unit attribution.
  - Fix UX.18: Color combat log cards by faction (`.faction-player`, `.faction-enemy`, `.faction-neutral`) instead of binary `isPlayer` prefix check.
  - Fix UX.13: Emit structured `⚡ PASSIVE` card for Feline Grace fall negation and `⚠️ ENVIRONMENT` card for ledge plunge.
  - Feature UX.4: Unit filter control in Astral Chronicle header to filter events where selected unit was actor, target, or splash affected.
  - Event-stream fallback in `applyCombatEvents` ensuring new mechanics never produce raw unformatted strings.

---

## 🎯 Next Up

### 3. Tier 4 Class Kits & Token Integration
Sketch and author class package (signature ability, 2 domain abilities, passive trait, AI heuristic profile, and badge palette) and whitelist tokens for the following new classes:
- [ ] **3.1**: **Shield-bearer** (`#05`, Tier 4: `3F, 1R, 0M`), `05_human_male`.
- [ ] **3.2**: **Dragoon** (`#07`, Tier 4: `3F, 0R, 1M`), `07_human_male`.
- [ ] **3.3**: **Ballistician** (`#65`, Tier 4: `1F, 3R, 0M`), `65_human_male`.
- [ ] **3.4**: **Philanderer** (`#84`, Tier 4: `0F, 3R, 1M`), `84_human_male`.
- [ ] **3.5**: **Theurge** (`#79`, Tier 4: `1F, 0R, 3M`), `79_human_male`.
- [ ] **3.6**: **Arcanist** (`#96`, Tier 4: `0F, 1R, 3M`), `96_human_male`.

### 4. No penalty for unit retreat/death
When a unit is defeated in the arena, there's no penalty. Permadeath is too punishing for right now and is a point on the Roadmap to flesh out, but some sort of punishment seems warranted.

---

## 🎨 UX Updates
- [ ] **UX.5**: Let the User place their units at opening. Enemy team to also do better at starting positions.
- [ ] **UX.6**: Dice Tray: Evade/Miss can just say Miss.
- [ ] **UX.7**: Dice Tray: Maybe we change it to click to close instead of auto close.
- [ ] **UX.11**: Dice Tray: The d20 roll is shown before the die stops rolling. Also the damage roll shows up before the die stops rolling.
- [ ] **UX.14**: Nice tooltip popover for damage bonus calculation like we have for the to hit calculation.
- [ ] **UX.15**: Make Vanguard Squad area in Post Trial XP distribution dialog scrollable.
- [ ] **UX.16**: More interesting Vanguard area. Maybe some sort of campfire with the unit sprites randomly gathered around. Maybe animated milling about?
- [ ] **UX.19**: Consecutive enemy turns happen too quickly, and each enemy action individually happens too quickly to process what has happened. I end up having to go back through the Combat Log to see what has occurred.
- [ ] **UX.20**: When a unit is defeated they just pop out. This is tricky on multi-enemy turns when one or several of my units are defeated. After their turns, which go quickly (UX.19), I'm left to re-evaluate the battlefield.

---

## 🐛 Bugs
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.10**: Shard effects don't show well in the Trial on ability cards.
- [ ] **B.14**: Dice Tray: Damage calculation doesn't show Armor/Ward soak value, though total damage is correctly calculated (e.g. unit with +2 armour. Shown is 3+2=3. The first 3 is the roll, the second 2 is the unit's bonus. This would be 5, but the enemy had +2 armour making it 3+2-2=3).
- [ ] **B.15**: When a unit starts their turn Challenged and the challenging unit is dead, the Challenged status should clear.

## (icon) Ideas
- [ ] **I.1**: Persist the last trial's combat log. Can help with identifying all kinds of things like AI behaviour enhancements.
- [ ] **I.2**: Extend `EffectHandler` & `EffectExecutionResult`: return structured effect metadata (e.g. condition badges, displacement chips, damage tags) rather than plain text strings in `logDetail`, enabling rich visual secondary effect badges in the Combat Log.
---

## 📝 Playtest Scratchpad

1. **Ability display in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
   * **1.2** *Observation*: Effects aren't cleanly described.
   * **1.3** *Possible path forward*: Effects have some way to resolve to text. Abilities get a normal text description for flavour, then a generated description that bundle effect descriptions plus the ability's values together for dynamically built descriptions.
2. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcards.
4. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static list.
