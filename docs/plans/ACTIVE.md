# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress
- [x] **Visual Dice Tumbler Tray**:
  - Implemented celestial glassmorphic top-banner dice tray overlay with procedural 2.5D SVG polyhedral dice (d20, d8, d6, etc.), faceted isometric lighting, and two-stage animation state machine (attack roll check vs defense, followed by damage dice on hit).
  - Advantage/disadvantage dual d20 rolling with dimming and strikethrough slash discard styling.
  - Settle animations featuring kinetic zoom snaps, critical hit flare / stamp, and graze/fumble callouts.
  - Interactive click-to-skip (mouse click anywhere, Spacebar, Enter) and persistent `[🎲 Tray: ON/OFF]` combat header toggle saved to `localStorage`.
  - Headless architecture: Pure TS `diceBreakdown` contract in `src/core/` and declarative presentation in `src/ui/combat/`.

---

## 🎯 Next Up

### 2. Enemy Threat Calibration & Pre-Ascension Snapshot
- [ ] **2.1**: Investigate pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp). Balance against the player's ability to scout and plan for upcoming incursions rather than rubber-banding on deploy; re-evaluate alongside Horizon 2 sector map nodes. Generally, a bit too easy right now. Trial 3 and 6 were the most exciting and difficult tactically.

### 3. Tier 4 Class Kits & Token Integration (Shield-bearer, Dragoon, Ballistician)
- [ ] **3.1**: **Shield-bearer** (`#05`, Tier 4: `3F, 1R, 0M`): Sketch and author class package (signature ability, 2 domain abilities, passive trait, AI heuristic profile, and badge palette) and whitelist token `05_human_male`.
- [ ] **3.2**: **Dragoon** (`#07`, Tier 4: `3F, 0R, 1M`): Sketch and author class package (signature ability, 2 domain abilities, passive trait, AI heuristic profile, and badge palette) and whitelist token `07_human_male`.
- [ ] **3.3**: **Ballistician** (`#65`, Tier 4: `1F, 3R, 0M`): Sketch and author class package (signature ability, 2 domain abilities, passive trait, AI heuristic profile, and badge palette) and whitelist token `65_human_male`.

---

## 🎨 UX Updates
- [ ] **UX.4**: Combat Log: Filter by unit. Show actions where it was the actor or was targeted (or splash damaged).
- [ ] **UX.5**: Let the User place their units at opening. Enemy team to also do better at starting positions.
- [ ] **UX.6**: Dice Tray: Evade/Miss can just say Miss.
- [ ] **UX.7**: Dice Tray: Maybe we change it to click to close instead of auto close.
- [ ] **UX.8**: Breaking Challenging Shout does not have a nice combat card.
- [ ] **UX.9**: Shout out text is small and hard to read.
- [ ] **UX.10**: Attack roll in Combat Card in Combat log should just show + or -, not both. i.e. Right now it shows 17+-2=15, it should be 17-2=15.
- [ ] **UX.11**: Dice Tray: The d20 roll is shown before the die stops rolling. Also the damage roll shows up before the die stops rolling.

---

## 🐛 Bugs
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.10**: Shard effects don't show well in the Trial on ability cards.
- [ ] **B.11**: A unit that uses Skirmish and falls off a height 2 hex does not take fall damage.
- [ ] **B.12**: Challenging Shout can target Allies, it should only target Enemies.
- [ ] **B.13**: Combat Log card shows "[Elevation: Low ground (-2)]" which is correct for my unit, but both the attack roll in the same Combat Card and the Dice Tray do not show this -2. Is it being calculated and not shown? Or completely ignored?
- [ ] **B.14**: Dice Tray: Damage calculation doesn't show Armor/Ward soak value, though total damage is correctly calculated (e.g. unit with +2 armour. Shown is 3+2=3. The first 3 is the roll, the second 2 is the unit's bonus. This would be 5, but the enemy had +2 armour making it 3+2-2=3).

---

## 📝 Playtest Scratchpad

1. **Ability display in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
   * **1.2** *Observation*: Effects aren't cleanly described.
   * **1.3** *Possible path forward*: Effects have some way to resolve to text. Abilities get a normal text description for flavour, then a generated description that bundle effect descriptions plus the ability's values together for dynamically built descriptions.
2. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcards.
3. **Cavalier Kit Flow: Inherent Spacing vs. Wildcard Synergy**:
   * *Observation*: Cavalier win rate rose from 38.1% to 50.0% and misses halved to 10.5% when equipped with Shield Bash (61 casts) and Momentum, breaking its range-1 lockout. Consider whether Cavalier needs an innate spacing mechanic in its base kit (e.g. minor shove or step) or if relying on brawler wildcards is the intended progression payoff.
4. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static list.
