# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress

### Attuned Waypoint Selection Display
- [ ] Show what was selected at an Attuned Waypoint (display the chosen Wayfarer Attunement and/or unlocked Domain Ability / Astral Shard in the Constellation scanner HUD instead of the generic option pool).

---

## 🎯 Next Up (Immediate Combat & UX Tuning)

### 1. In-Combat Unit Inspection & Effect Tooltips
- [ ] **1.1**: Allow clicking/selecting any unit (ally or enemy) to pin their info card during combat.
- [ ] **1.2**: Hover tooltips on active condition badges (inspect exact `POISON`, `BURN`, `STEALTH`, `CHALLENGED` effects & durations).
- [ ] **1.3**: View active skill loadout and remaining AP/CTB in the pinned card.

### 2. Post-Move Facing Selection
- [ ] **2.1**: After executing a move action, prompt or allow directional facing selection before finalizing the move or spending further AP (prevents inadvertently exposing flank/rear arcs).

### 3. Combat Tempo & Initiative Balance
- [ ] **3.1**: Prevent player units from always acting first; introduce enemy initiative variance or roll modifiers to make combat opening rounds dynamic and tense.
- [ ] **3.2**: Investigate Thief/Infiltrator action economy (Thieves cycling fast low-AP skills and getting 2x the actions and XP of heavier classes).
- [ ] **3.3**: Fix pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp).

### 4. Arena & Timeline UX
- [ ] **4.1**: Two-way hover highlight: hovering an initiative queue bubble highlights the hex unit on the field, and hovering a unit highlights their bubble on the timeline.
- [ ] **4.2**: Space out units on the CTB timeline ribbon and display numerical initiative ticks more prominently.
- [ ] **4.3**: Clear enemy naming: replace generic placeholders with numbered titles (e.g., `Novice 1`, `Novice 2`) or procedural astral names.
- [ ] **4.4**: In-combat character card XP gain tracker: display current battle XP gains inline (e.g., `Force: 7 XP (+2)`).

### 5. AI & Mechanics Edge Cases
- [ ] **5.1**: Fix Infiltrator `Smoke Veil` edge case: clarify collision/blocking rules while in smoke, and verify AI decision engine doesn't stall when a stealthed unit is adjacent to obstacles/elevation.
- [ ] **5.2**: Restrict dev-mode debug shortcuts/overlays to `localhost` environments only.

---

## 📝 Playtest Scratchpad

1. **XP by Skill-Use Feel**:
   * **1.1** *Observation*: Requiring Novice skill usage to build off-archetype XP for hybrid classes feels slightly awkward once a specialized class is unlocked. Players want to use their best, coolest new skills rather than feeling forced into weak Novice skills.
   * **1.2** *Idea*: Consider passive archetype resonance (e.g., earning a fraction of secondary archetype XP on trial victory, or starring a "Focus Archetype" for the battle), or ability starring to remind players which skills advance their desired constellation path.
2. **Shard Stats in Combat Manifest**:
   * **2.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
