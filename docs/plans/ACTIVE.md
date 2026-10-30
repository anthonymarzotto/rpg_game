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

---

## 🐛 Bugs
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.10**: Shard effects don't show well in the Trial on ability cards.
- [ ] **B.11**: A unit that uses Skirmish and falls off a height 2 hex does not take fall damage.

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
