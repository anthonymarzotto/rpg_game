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
- [x] **UX.21 / UX.22 / UX.23 / UX.24 / UX.25 (`combat-log-polish`)**:
  - Simplify Combat Log attack roll & damage chips to final results (`🎲 21 vs DC 11` / `🎲 15`, `💥 9 dmg`) with hover tooltips handling full breakdowns, and flip their order (`UX.21`, `UX.22`).
  - Populate `attackRollBreakdown` on ground-targeted `HEX` rolls (`Wyrmflame Breath`, empty-hex `Arcane Blast`) so they get `AttackRollTooltip`, remove `"Spellcast Roll & Score"`, and include `BURN` application in `Wyrmflame Breath` cone splash details (`UX.23`).
  - Emit dedicated `DEFEATED` card (naming lethal condition) and `ZONE_OF_CONTROL` card (with `faction` and `affectedUnitIds` for both units), and add faction/header styling to the `GENERIC` fallback card (`UX.24`, `UX.25`).
- [x] **I.2 (`structured-effect-badges`)**: Extend `EffectHandler` & `EffectExecutionResult` to return structured `EffectOutcome` metadata (and unify `resolver.ts` splash/context outcomes) rather than plain text strings (`logDetail` / `secondaryDetail` / `effectDetail`), enabling compact color-coded effect pills and portal hover tooltips (`EffectBadgeTooltip`) in the Combat Log.
- [x] **B.10 / Scratchpad 1 (`unified-ability-descriptions`)**: Unified dynamic ability descriptions across Camp and Trial surfaces (pure flavor `description` + deterministic hybrid Stat Strip pills & Effect Clauses + compact mechanical 1-liner on Selected Unit card with hover tooltip + `Normal -> Shard -> In-Trial` color precedence and `getEffectiveAbility` attribution preservation).
- [x] **3.3 (`tier-4-ballistician`)**: **Ballistician** (`#65`, Tier 4: `1F, 3R, 0M`), `65_human_male` — `Zeroed In` passive, `Siege Barrage` delayed bombardment signature, `Shrapnel Canister` stealth reveal & rough terrain rubble, and `Sighting Bolt` telemetry spotter.
- [x] **UX.5 (`tactical-opening-deployment`)**: Let the User place their units at opening. Enemy team to also do better at starting positions.

---

## 🎯 Next Up

### 3. Tier 4 Class Kits & Token Integration
Sketch and author class package (signature ability, 2 domain abilities, passive trait, AI heuristic profile, and badge palette) and whitelist tokens for the following new classes:
- [ ] **3.4**: **Philanderer** (`#84`, Tier 4: `0F, 3R, 1M`), `84_human_male`.
- [ ] **3.5**: **Theurge** (`#79`, Tier 4: `1F, 0R, 3M`), `79_human_male`.
- [ ] **3.6**: **Arcanist** (`#96`, Tier 4: `0F, 1R, 3M`), `96_human_male`.

### 4. No penalty for unit retreat/death
When a unit is defeated in the arena, there's no penalty. Permadeath is too punishing for right now and is a point on the Roadmap to flesh out, but some sort of punishment seems warranted.

---

## 🎨 UX Updates
- [ ] **UX.7**: Dice Tray: Maybe we change it to click to close instead of auto close (re-assess after pacing & clash stage update).
- [ ] **UX.15**: Make Vanguard Squad area in Post Trial XP distribution dialog scrollable.
- [ ] **UX.16**: More interesting Vanguard area. Maybe some sort of campfire with the unit sprites randomly gathered around. Maybe animated milling about?

---

## 🐛 Bugs
- [ ] **B.3**: Active turn halo is generally not clearing well. Hard to pinpoint exactly what's going on, but I'm on turn 7 and 4 units have a halo.
- [ ] **B.4**: When an enemy uses Smoke Veil I can still see them.
- [ ] **B.15**: When a unit starts their turn Challenged and the challenging unit is dead, the Challenged status should clear.

---

## 💡 Ideas
- [ ] **I.1**: Persist the last trial's combat log. Can help with identifying all kinds of things like AI behaviour enhancements.

---

## 📝 Playtest Scratchpad

2. **Wildcard Loadout Impact on Combat Dynamics**:
   * *Observation*: In campaign generation (`createEnemyUnit`), enemies receive `wildcardPassiveIds: ['momentum']` and up to 2 starter abilities. Pure-kit benchmarks without wildcards hide natural synergies—e.g. Force units getting Advantage from `Momentum` after moving, or Cavalier using `Shield Bash` (1-hex knockback) to re-enable `Lance Charge` in close melee. Consider benchmark profiles that include standard starter wildcard3.
4. **Varied Resonant Loadouts for Generated Enemies**:
   * *Observation*: Generated enemies in encounters currently receive a static wildcard passive (Momentum) and starter abilities. Implement a "level up" generation system where enemies dynamically draw realistic resonant abilities and passives from their unlocked constellation path with randomized variation across encounters rather than a static l4st.
5. **Cavalier**:
  - What does he do after a Lance Charge? It's 2AP, so a move doesn't help. He ends up 1 space away from his target. If he doesn't start beside a target or have a ranged Resonant ability he is awkward, taking that last AP and saving it.
  - Maybe increase Ride-Through PENETRATING_STEP to 2. This gives separation to make a Lance Charge.
6. Hellfire Brand and Ignite seem to stack. Intended?
