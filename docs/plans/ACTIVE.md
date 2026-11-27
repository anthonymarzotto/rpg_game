# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress
Nothing to see here.

---

## 🎯 Next Up

---

## 🎨 UX Updates
- [ ] **UX.7**: Dice Tray: Maybe we change it to click to close instead of auto close (re-assess after pacing & clash stage update).
- [ ] **UX.15**: Make Vanguard Squad area in Post Trial XP distribution dialog scrollable.

---

## 🐛 Bugs
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.16**: In Trial: Status pill hover effect goes under the Initiative track.
- [ ] **B.20**: The Dragoon's Dragon Dive and Wyrmflame Breath currently exclude friendly units. They should follow standard AoE rules and hit friendly units if they are present.
- [ ] **B.21**: Combat Log: Description text in Buff Status pill overflows (e.g. Stealth pill, "Conceals the unit...")

---

## 💡 Ideas
- [ ] **I.1**: Persist the last trial's combat log. Can help with identifying all kinds of things like AI behaviour enhancements.
- [ ] **I.2**: Post match ratings/stats for units. I saw this happen in a Trial debug session.
- [ ] **I.3**: Some sort of scoring vs. what the AI would choose. This could be live in a window or post-trial as a review. Possible uses would be helping players to better outcomes, or helping refine the AI heuristics.
- [ ] **I.4**: Better onboarding/tutorial. A friend of mine was pretty lost to start. 
   - Hard to tell units apart when same class.
   - Something about using "50 for a new character, but I'm not sure how to get a new character". This might refer to Threat. On the next Trial he could use units up to 50 more threat?
   - "Distribute evenly" is really not an optimal way to spread XP in this game. Ideally its dump as much in to one stat per unit to get them to their next level.
   - He didn't know to click "Move" to take a Move action. "Its typically a default."
- [ ] **I.5**: No penalty for unit retreat/death
   - When a unit is defeated in the arena, there's no penalty. Permadeath is too punishing for right now and is a point on the Roadmap to flesh out, but some sort of punishment seems warranted.

---

## 📝 Playtest Scratchpad

2. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcard3.
4. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static l4st.
5. **Cavalier**:
  - What does he do after a Lance Charge? It's 2AP, so a move doesn't help. He ends up 1 space away from his target. If he doesn't start beside a target or have a ranged Resonant ability he is awkward, taking that last AP and saving it.
  - Maybe increase Ride-Through PENETRATING_STEP to 2. This gives separation to make a Lance Charge.
6. **Warlock**:
  - Warlock is good but weird. Eldritch Blast is so-so for 2AP and Hellfire Brand is strictly worse than Ignite.

