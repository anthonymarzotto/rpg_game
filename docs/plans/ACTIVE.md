# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress
- [x] **B.17 / B.18 (`effect-shout-labels`)**: Declarative effect shout labels (`AbilityEffect.shout`, `CombatEvent.label`, exhaustive `DisplacementKind` floater defaults, silent `Ride-Through`, `"INTERCEPT!"` on Shield-bearer only for `Intercept Step`, and catalog shout guardrails).
- [x] **UX.6 / UX.11 / UX.14 / UX.19 / UX.20 / B.14**: **Clash Dice Tray Expansion, Damage Tooltip & Enemy Turn Tray Mode**:
  - Tri-state Dice Tray toggle (`ALL` / `PLAYER_ONLY` / `OFF`) so enemy attacks can also present the Clash Dice Tray (`UX.19`, `UX.20`).
  - Attacker & Defender directional tokens in the Dice Tray with attack lunge, hit shake/flash, miss sidestep, and defeat indicator (`UX.20`).
  - Fix premature roll spoilers during Stage 1 and Stage 2 dice tumbles (`UX.11`) and slow down stage timings slightly.
  - Simplify `"EVADED / MISS"` stamp to `"MISS"` (`UX.6`).
  - Show Armor/Ward soak and full damage math in the Dice Tray (`B.14`) with a shared rich hover tooltip breakdown (`DamageRollTooltip`) in both the Dice Tray and Combat Log (`UX.14`).

---

## 🎯 Next Up

### 3. Tier 4 Class Kits & Token Integration
Sketch and author class package (signature ability, 2 domain abilities, passive trait, AI heuristic profile, and badge palette) and whitelist tokens for the following new classes:
- [ ] **3.3**: **Ballistician** (`#65`, Tier 4: `1F, 3R, 0M`), `65_human_male`.
- [ ] **3.4**: **Philanderer** (`#84`, Tier 4: `0F, 3R, 1M`), `84_human_male`.
- [ ] **3.5**: **Theurge** (`#79`, Tier 4: `1F, 0R, 3M`), `79_human_male`.
- [ ] **3.6**: **Arcanist** (`#96`, Tier 4: `0F, 1R, 3M`), `96_human_male`.

### 4. No penalty for unit retreat/death
When a unit is defeated in the arena, there's no penalty. Permadeath is too punishing for right now and is a point on the Roadmap to flesh out, but some sort of punishment seems warranted.

---

## 🎨 UX Updates
- [ ] **UX.5**: Let the User place their units at opening. Enemy team to also do better at starting positions.
- [ ] **UX.7**: Dice Tray: Maybe we change it to click to close instead of auto close (re-assess after pacing & clash stage update).
- [ ] **UX.15**: Make Vanguard Squad area in Post Trial XP distribution dialog scrollable.
- [ ] **UX.16**: More interesting Vanguard area. Maybe some sort of campfire with the unit sprites randomly gathered around. Maybe animated milling about?
- [ ] **UX.21**: Combat Log: Damage and Attack roll chips can just show the final result, hover can handle all the details. (e.g. just "9 damage" or "21 vs DC 11")
- [ ] **UX.22**: Combat Log: Flip damage and attack roll chips.
- [ ] **UX.23**: Combat Log: Wyrmflame Breath gets a "Spellcast Roll & Score" chip instead of the standard attack roll. What is this? Why is it different? If it can just be the standard attack roll chip let's use that. If this serves a real purpose, other Focus abilities should use it and it should get a nice tooltip like the attack roll chip.
- [ ] **UX.24**: Combat Log: A Burn Tick killed my unit and an unformatted card was generated about "Cinder Novice was defeated by status condition damage!". I thought all Combat Log chips would now be at least nicely formatted with some default. We need to check that and then also fix up this message generally.
- [ ] **UX.25**: Zone of Control also makes a default unformatted Combat Log card when it triggers.

---

## 🐛 Bugs
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.10**: Shard effects don't show well in the Trial on ability cards.
- [ ] **B.15**: When a unit starts their turn Challenged and the challenging unit is dead, the Challenged status should clear.

---

## 💡 Ideas
- [ ] **I.1**: Persist the last trial's combat log. Can help with identifying all kinds of things like AI behaviour enhancements.
- [ ] **I.2**: Extend `EffectHandler` & `EffectExecutionResult`: return structured effect metadata (e.g. condition badges, displacement chips, damage tags) rather than plain text strings in `logDetail`, enabling rich visual secondary effect badges in the Combat Log.

---

## 📝 Playtest Scratchpad

1. **Ability display in Combat Manifest**:
   * **1.1** *Observation*: Combat Manifest in the Unit Info dialog doesn't always reflect updated values from equipped shards (e.g. Bloodbound Shard modifying damage/dice description). Verify text evaluation vs runtime effect pipeline.
   * **1.2** *Observation*: Effects aren't cleanly described.
   * **1.3** *Possible path forward*: Effects have some way to resolve to text. Abilities get a normal text description for flavour, then a generated description that bundle effect descriptions plus the ability's values together for dynamically built descriptions.
2. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcard3.
4. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static l4st.
5. **Cavalier**:
  - What does he do after a Lance Charge? It's 2AP, so a move doesn't help. He ends up 1 space away from his target. If he doesn't start beside a target or have a ranged Resonant ability he is awkward, taking that last AP and saving it.
  - Maybe increase Ride-Through PENETRATING_STEP to 2. This gives separation to make a Lance Charge.
6. Hellfire Brand and Ignite seem to stack. Intended?
