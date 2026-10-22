# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress

### 3. CTB Curve & Speed Tuning
- [x] **3.1**: Tune the CTB speed scaling curve and audit CTB-delay abilities (tuned Finesse speed scaling to +1 Speed/Finesse in `src/core/config/balance.ts`; updated `Stand and Deliver!` to roll vs Resolve with 20 CTB delay in `src/data/packages/highwayman.ts`, and updated `resolver.ts` so non-damage abilities with defense targets execute attack rolls).

---

## 🎯 Next Up (Immediate Combat & UX Tuning)

### 1. In-Combat Unit Inspection & Effect Tooltips
- [ ] **1.1**: Allow clicking/selecting any unit (ally or enemy) to pin their info card during combat.
- [ ] **1.2**: Hover tooltips on active condition badges (inspect exact `POISON`, `BURN`, `STEALTH`, `CHALLENGED` effects & durations).
- [ ] **1.3**: View active skill loadout and remaining AP/CTB in the pinned card.

### 2. AI & Mechanics Edge Cases
- [ ] **2.1**: Fix Infiltrator `Smoke Veil` AI loop & edge case: ensure AI decision engine assigns 0 score to stealth abilities if the actor is already in `STEALTH` (avoid artificial `oncePerTurn` cooldowns), and clarify collision/blocking rules while in smoke.
- [ ] **2.2**: Restrict dev-mode debug shortcuts/overlays to `localhost` environments only.
- [ ] **2.3**: The Cat Burglar's Rooftop Vault sounds cool, but in practice it isn't actually giving very much utility. It only helps when the unit is physically blocked, in which case it functions very much like Shadow Step. Maybe this belongs more as a passive, where the regular Move gets modified to all moving to any hex within normal range.
- [ ] **2.4**: Assess `Sneak Attack` and `Poppet Needle` for AP cost and function: evaluate potency and dice scaling rather than restricting multi-action player agency with `oncePerTurn`.
- [ ] **2.5**: Evaluate support/control abilities (`Stand and Deliver!`, `Flash Powder`) in 3v3 team scenarios: assess whether multi-target debuffing across separate foes functions well with allied follow-up without needing `oncePerTurn` restrictions.
- [ ] **2.6**: AI awareness of enemy count & duplicate skill targeting deprioritization: incorporate living enemy count into AI decision-making (e.g. deprioritize control/setup primers when only 1 foe remains) and add a general scoring penalty against casting the same non-damage or debuff skill on the same target multiple times within a single turn. Specifically addresses:
  * **Highwayman** repeatedly casting `Stand and Deliver!` on the same target (1,477 casts in duels) instead of following up with `Point-Blank Buckshot`.
  * **Cat-Burglar** repeatedly spamming `Flash Powder` on the same target (900 casts in duels) instead of striking with `Pilfer`.
  * **Infiltrator** repeatedly casting `Smoke Veil` on self while already in `STEALTH` (1,278 casts in duels).

### 4. Enemy Threat Calibration & Pre-Ascension Snapshot
- [ ] **5.1**: Investigate pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp). Balance against the player's ability to scout and plan for upcoming incursions rather than rubber-banding on deploy; re-evaluate alongside Horizon 2 sector map nodes.

---

## 📝 Playtest Scratchpad

1. **Shard Stats in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
