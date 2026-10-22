# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress

### 3. Combat Tempo & Initiative Balance
- [x] **3.1**: Prevent player units from always acting first; introduce enemy initiative variance or roll modifiers to make combat opening rounds dynamic and tense. (Completed via 1d20 starting initiative rolls, battlefield floating text, and opening combat log announcement in `combat-initiative-rolling` change).
- [x] **3.2**: Investigate Thief/Infiltrator action economy (Thieves cycling fast low-AP skills and getting 2x the actions and XP of heavier classes). (Resolved via pooled Party XP Bank in `party-xp-bank`; CTB pacing & speed scaling tracked in 7.1).

### BUGS
- [ ] Background does not load on GitHub pages deployment. Not bundled?
- [ ] Initiative card in Combat Log is not formatted nicely.

---

## 🎯 Next Up (Immediate Combat & UX Tuning)

### 1. In-Combat Unit Inspection & Effect Tooltips
- [ ] **1.1**: Allow clicking/selecting any unit (ally or enemy) to pin their info card during combat.
- [ ] **1.2**: Hover tooltips on active condition badges (inspect exact `POISON`, `BURN`, `STEALTH`, `CHALLENGED` effects & durations).
- [ ] **1.3**: View active skill loadout and remaining AP/CTB in the pinned card.

### 5. AI & Mechanics Edge Cases
- [ ] **5.1**: Fix Infiltrator `Smoke Veil` edge case: clarify collision/blocking rules while in smoke, and verify AI decision engine doesn't stall when a stealthed unit is adjacent to obstacles/elevation.
- [ ] **5.2**: Restrict dev-mode debug shortcuts/overlays to `localhost` environments only.

### 6. Investigations
- [ ] The Cat Burglar's Rooftop Vault sounds cool, but in practice it isn't actually giving very much utility. It only helps when the unit is physically blocked, in which case it functions very much like Shadow Step. Maybe this belongs more as a passive, where the regular Move gets modified to all moving to any hex within normal range.

### 7. CTB Curve & Speed Tuning
- [ ] **7.1**: Tune the CTB speed scaling curve and audit CTB-delay abilities (e.g., Finesse granting +2 Speed vs +0 for Force/Focus creates extreme turn disparities in long fights; audit abilities like `Stand and Deliver!` to ensure `oncePerTurn` restrictions prevent infinite lockouts).

### 8. Enemy Threat Calibration & Pre-Ascension Snapshot
- [ ] **8.1**: Investigate pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp). Balance against the player's ability to scout and plan for upcoming incursions rather than rubber-banding on deploy; re-evaluate alongside Horizon 2 sector map nodes.

---

## 📝 Playtest Scratchpad

1. **XP by Skill-Use Feel**:
   * **1.1** *Observation*: Requiring Novice skill usage to build off-archetype XP for hybrid classes feels slightly awkward once a specialized class is unlocked. Players want to use their best, coolest new skills rather than feeling forced into weak Novice skills.
   * **1.2** *Idea*: Consider passive archetype resonance (e.g., earning a fraction of secondary archetype XP on trial victory, or starring a "Focus Archetype" for the battle), or ability starring to remind players which skills advance their desired constellation path.
2. **Shard Stats in Combat Manifest**:
   * **2.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
