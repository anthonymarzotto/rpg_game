# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress

### 2. AI & Mechanics Edge Cases
- [x] **2.1**: Fix Infiltrator `Smoke Veil` AI loop & edge case: ensure AI decision engine assigns 0 score to stealth abilities if the actor is already in `STEALTH` (avoid artificial `oncePerTurn` cooldowns), and clarify collision/blocking rules while in smoke.
- [x] **2.2**: Restrict dev-mode debug shortcuts/overlays to `localhost` environments only. (Implemented: `isLocalhost` environment helper gates floating dev menu in `App.tsx`, dev banner, `dev-dice-controls` in `CombatArena.tsx`, and `btn-dev-grant-xp` in `HeroProgressionDrawer.tsx`; added `~` and `Ctrl+Shift+D` localhost-only keyboard shortcuts).
- [ ] **2.3**: The Cat Burglar's Rooftop Vault sounds cool, but in practice it isn't actually giving very much utility. It only helps when the unit is physically blocked, in which case it functions very much like Shadow Step. Maybe this belongs more as a passive, where the regular Move gets modified to all moving to any hex within normal range.
- [x] **2.4**: Assess `Sneak Attack`, `Poppet Needle`, and `Baleful Hex` for AP cost, potency, and debuff scaling: decoupled automatic Advantage from flank/rear `Sneak Attack` (retaining `+1d6` precision damage); rebalanced Witch kit (`Poppet Needle` 2 AP, 2d4 damage; `Baleful Hex` 0 direct damage, retaining Poison & 20 CTB delay vs Resolve; `Witch's Talisman` grants +2 Speed and +2 Ward); updated `arenaRadius` to 4 for Tier-3 standard; verified via 100-match 3v3 simulation suite (Witch win rate normalized from 91.3% to 65.2% with healthy 58.7% survival, 0 timeouts).
- [ ] **2.5**: Evaluate support/control abilities (`Stand and Deliver!`, `Flash Powder`) in 3v3 team scenarios: assess whether multi-target debuffing across separate foes functions well with allied follow-up without needing `oncePerTurn` restrictions.
- [ ] **2.6**: AI awareness of enemy count & duplicate skill targeting deprioritization: incorporate living enemy count into AI decision-making (e.g. deprioritize control/setup primers when only 1 foe remains) and add a general scoring penalty against casting the same non-damage or debuff skill on the same target multiple times within a single turn. Specifically addresses:
  * **Highwayman** repeatedly casting `Stand and Deliver!` on the same target (1,477 casts in duels) instead of following up with `Point-Blank Buckshot`.
  * **Cat-Burglar** repeatedly spamming `Flash Powder` on the same target (900 casts in duels) instead of striking with `Pilfer`.
  * [x] **Infiltrator** repeatedly casting `Smoke Veil` on self while already in `STEALTH`: resolved via active condition guard in `scoreBuffAbility`.
- [ ] **2.7**: AI scoring support for unselected/underused kit abilities:
  * Add AoE splash evaluation to `computeAbilityMetrics` for single-target blast abilities (e.g. Wizard's `Arcane Blast`).
  * Add hostile `SLOW` debuff evaluation in `scoreDebuffAndUtility` for abilities like `Frostbite`.
  * Add `RETREAT_STEP` tactical disengagement scoring for hit-and-run abilities like `Skirmish`.
- [ ] **2.8**: AI Threat Scoring & High-Ground Disruption:
  * Add target threat weighting to AI decision engine to target high-damage backline casters (Warlock, Witch) even when low-ground vertical penalties reduce hit probability.
  * Add displacement / `KNOCKBACK` utility scoring against units holding High Ground Vantage (prioritize shoving perched snipers off cliffs for fall impact damage and vantage disruption).
- [ ] **2.9**: Highwayman Tactical Role & Survivability Audit: assess why Highwayman suffers a bottom-tier 34% win rate and 14% survival (23.2 damage taken) even with resonant options; evaluate mid-range self-peel (e.g. backward recoil on buckshot or evasion on Stand and Deliver!) and range-1 vs range-2 kit flow.
- [x] **2.10**: Infiltrator Kit Identity vs. Resonant Cannibalization: investigated and resolved. Discovered `Shadow Step` teleport lookahead (+30–45 score) dominates 1-AP choices when equipped as a wildcard; fixed engine Move + Self-Buff gap and added turn-end vanish/approach heuristics, elevating `Smoke Veil` usage 15x (19–31 targets) and `Expose Weakness` to 97 targets.
- [ ] **2.11**: Make Arcane Blast target a hex. Targeted square gets full damage, surrounding squares get splash.
- [ ] **2.12**: Assess breaking CHALLENGE status if damaged by an enemy other than the challenger.
- [x] **2.13**: Assess if Smoke Veil's STEALTH should last until an attack and persist past turn start. (Implemented: STEALTH persists across turn starts until broken by attack, damage, or front-arc detection; AI scores turn-ending vanish and infiltration approach; Move + Self-Buff engine gap fixed).

---

## 🎯 Next Up (Immediate Combat & UX Tuning)

### 1. In-Combat Unit Inspection & Effect Tooltips
- [ ] **1.1**: Allow clicking/selecting any unit (ally or enemy) to pin their info card during combat.
- [ ] **1.2**: Hover tooltips on active condition badges (inspect exact `POISON`, `BURN`, `STEALTH`, `CHALLENGED` effects & durations).
- [ ] **1.3**: View active skill loadout and remaining AP/CTB in the pinned card.

### 4. Enemy Threat Calibration & Pre-Ascension Snapshot
- [ ] **4.1**: Investigate pre-ascension enemy threat snapshot (enemies for the next trial are currently determined before player ascensions take effect in Camp). Balance against the player's ability to scout and plan for upcoming incursions rather than rubber-banding on deploy; re-evaluate alongside Horizon 2 sector map nodes.

### 5. UX Updates
- [ ] **5.1**: Higlight movement path

---

## 📝 Playtest Scratchpad

1. **Shard Stats in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
2. **Knight Survivability & Soak**:
   * *Observation*: Knight average soak in 3v3 was only 2.3. With 2 Armor and 0 Ward, magical damage (Warlock, Witch, Wizard, Sorcerer) completely bypasses mitigation, while physical attacks often shred or bypass armor. Consider exploring protective scaling (e.g. base Ward, or armor/soak bonuses against `CHALLENGED` foes).
3. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcards.
4. **Cavalier Kit Flow: Inherent Spacing vs. Wildcard Synergy**:
   * *Observation*: Cavalier win rate rose from 38.1% to 50.0% and misses halved to 10.5% when equipped with Shield Bash (61 casts) and Momentum, breaking its range-1 lockout. Consider whether Cavalier needs an innate spacing mechanic in its base kit (e.g. minor shove or step) or if relying on brawler wildcards is the intended progression payoff.
5. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static list.
