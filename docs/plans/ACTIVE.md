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
- [ ] **2.1**: Fix Infiltrator `Smoke Veil` edge case: clarify collision/blocking rules while in smoke, and verify AI decision engine doesn't stall when a stealthed unit is adjacent to obstacles/elevation.
- [ ] **2.2**: Restrict dev-mode debug shortcuts/overlays to `localhost` environments only.
- [ ] **2.3**: The Cat Burglar's Rooftop Vault sounds cool, but in practice it isn't actually giving very much utility. It only helps when the unit is physically blocked, in which case it functions very much like Shadow Step. Maybe this belongs more as a passive, where the regular Move gets modified to all moving to any hex within normal range.

### 4. Enemy Threat Calibration & Pre-Ascension Snapshot
- [ ] **5.1**: Investigate pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp). Balance against the player's ability to scout and plan for upcoming incursions rather than rubber-banding on deploy; re-evaluate alongside Horizon 2 sector map nodes.

---

## 📝 Playtest Scratchpad

1. **Shard Stats in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
