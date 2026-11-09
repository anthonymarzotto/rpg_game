# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress
- [x] **UX.17**: **Improve CTB bar UX with animation, turn start/end experience & log dividers**:
  - OpenSpec change: `combat-turn-pacing-and-clarity`.
  - Animate circular progress rings on CTB chips as ticks advance (paced to ~1s).
  - Add active token beacon pulse and clean "My Turn!" call-out on turn start.
  - Fix Turn End floating text: "+X Initiative" on banked AP, "Turn End" on 0 unspent AP.
  - Insert visual turn dividers in CombatLogPanel grouping existing action cards.
- [x] **2.1**: **Enemy Threat Calibration, Deployment Budget & Resonant Enemy Loadouts**:
  - Implement point-based Vanguard deployment budget without artificial unit-count limits.
  - Dynamically scale arena radius (Radius 3 for Stage 1, Radius 4 min for Stage 2+, Radius 5 if combined units >= 7).
  - Pre-ascension threat projection (+1 level projection if threshold met) and stable incursion generation on victory.
  - Spend enemy threat budget on multiple units of appropriate tiers (removing single-unit caps).
  - Equip generated enemies with resonant domain abilities and passives from their constellation lineage (Scratchpad #4).
- [x] **B.15**: Ash Thief took 6 actions in a row: Move, Shadow Step, Skirmish, Shadow Step, Skirmish, Move. Was this 2 turns somehow one after another? - **RESOLVED** This was intentional based on speed and conserving all 3AP on turn 1.
- [x] **UX.12**: **Arena Camera Panning, Scrolling & Unit Centering**:
  - OpenSpec change: `arena-camera-panning-and-zoom`.
  - Right-click drag navigation with 1:1 screen-to-viewBox tracking.
  - Keyboard arrow key camera panning.
  - Dynamic zoom-aware camera bounding preventing arena loss.
  - Centering camera on units when clicked in the CTB Initiative Ribbon.
  - Top bar view reset for both zoom and camera pan.
  - Parallax astral background coordinate translation.

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
- [ ] **UX.4**: Combat Log: Filter by unit. Show actions where it was the actor or was targeted (or splash damaged).
- [ ] **UX.5**: Let the User place their units at opening. Enemy team to also do better at starting positions.
- [ ] **UX.6**: Dice Tray: Evade/Miss can just say Miss.
- [ ] **UX.7**: Dice Tray: Maybe we change it to click to close instead of auto close.
- [ ] **UX.11**: Dice Tray: The d20 roll is shown before the die stops rolling. Also the damage roll shows up before the die stops rolling.
- [ ] **UX.13**: Avoiding fall damage with Feline Grace has an unformated combat log card.
- [ ] **UX.14**: Nice tooltip popover for damage bonus calculation like we have for the to hit calculation.
- [ ] **UX.15**: Make Vanguard Squad area in Post Trial XP distribution dialog scrollable.
- [ ] **UX.16**: More interesting Vanguard area. Maybe some sort of campfire with the unit sprites randomly gathered around. Maybe animated milling about?
- [ ] **UX.18**: Combat Log: Every Combat Card uses the red-ish colour. These should be coloured by faction.
- [ ] **UX.19**: Consecutive enemy turns happen too quickly, and each enemy action individually happens too quickly to process what has happened. I end up having to go back through the Combat Log to see what has occurred.
- [ ] **UX.20**: When a unit is defeated they just pop out. This is tricky on multi-enemy turns when one or several of my units are defeated. After their turns, which go quickly (UX.19), I'm left to re-evaluate the battlefield.

---

## 🐛 Bugs
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.10**: Shard effects don't show well in the Trial on ability cards.
- [ ] **B.14**: Dice Tray: Damage calculation doesn't show Armor/Ward soak value, though total damage is correctly calculated (e.g. unit with +2 armour. Shown is 3+2=3. The first 3 is the roll, the second 2 is the unit's bonus. This would be 5, but the enemy had +2 armour making it 3+2-2=3).
- [ ] **B.15**: When a unit starts their turn Challenged and the challenging unit is dead, the Challenged status should clear.
- [ ] **B.16**: Trial threat is way out of whack. By trial 5 I had 8 units and the trial threat is at 475pts, but my vanguard is locked to 220pts.
- [ ] **B.17**: I think I saw my Cavalier shout out "Knockback" when I used Ride Through. That's not a great description to shout.

## (icon) Ideas
- [ ] **I.1**: Persist the last trial's combat log. Can help with identifying all kinds of things like AI behaviour enhancements.
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
5. **Cavalier**: What does he do after a Lance Charge? It's 2AP, so a move doesn't help. He ends up 1 space away from his target. If he doesn't start beside a target or have a ranged Resonant ability he is awkward, taking that last AP and saving it.
