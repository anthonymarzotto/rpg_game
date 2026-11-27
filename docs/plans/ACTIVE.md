# Active Focus & Sprint Board

> **How to use this file**: Keep this open while playing and coding. Track active work in **Next Up**, note bugs and thoughts in the **Playtest Scratchpad**, and clear completed items at the start of each session.

---

## 🔨 In Progress
- [X] **Nexus Hearth & Cosmic Sprite (`nexus-hearth-and-cosmic-sprite`)**: Animated campfire diorama in The Nexus with gathered/wandering company sprites, luminous Cosmic Sprite presence (Nexus + Start Screen), and vertical Campfire Commons grid (covers Phase 2 Nexus visuals, **UX.16**, and **UX.26**).
- [X] **Astral Codex (`astral-codex`)**: In-game lore compendium modal backed by `docs/lore/` frontmatter, accessible from Start Screen & The Nexus.
- [X] **3.6**: **Arcanist** (`#96`, Tier 4: `0F, 1R, 3M`), `96_human_male`.
- [X] **3.5**: **Theurge** (`#79`, Tier 4: `1F, 0R, 3M`), `79_human_male`.
- [X] **B.15**: If a unit is Challenged and the challenging unit dies, the Challenged status should clear (also covering `CHARMED` and `HENOSIS` with Combat Log cards).
- [X] **B.17**: Combat Log: "Graze Mitigation" breaks out of its tooltip container.
- [X] **B.18**: I don't think "Coiled Apex" is working right. When my Dragoon skips a turn and then gets their next turn there doesn't appear to be any buffs.
- [X] **B.19**: Theurge token isn't visible.
- [X] **Shard × Ability Compatibility & Timing**: Audit Astral Augment Shard interactions across all ability types; design effect timing triggers, compatibility/socketing rules, and resolver fixes (e.g. `Shadow Shard` + `Sneak Attack`).
- [X] **B.22**: Henosis Action Bar lockout UX & arena token status icon clarity (`MORTAL_EBB`, `CHARMED`, `BLINDED` icons + disabled ability tooltip reasons).

---

## 🎯 Next Up

### Lore Alignment Pass (Phase 1 — Docs, UI Copy & Naming)
Align `GLOSSARY.md`, `DESIGN.md`, UI copy, and procedural naming/encounters with the hopeful twilight tournament lore in `docs/lore/`.

**Locked-In Canonical Swaps & Scope:**
- **Setting & Persona**: `The Firmament`, `Grand Conjunction`, `Astral Tournaments`, `Falling Star's Favor`, `Cosmic Sprite` (player persona)
- **Player Group**: `Company`
- **Active Team / Dock**: `The Staging Dais` (retire *The Vanguard* and *Conduit*)
- **Reserves**: `Campfire Commons` (retire *The Enclave*)
- **Roster Swap**: `Stage / Rest` (reserve *Attune* for Constellations/Classes)
- **Recruiting**: `Welcome Novice` from *The Starlight Docks* (retire *Awaken Novice*)
- **Progression Depth**: `Trial {N}` (retire *Sector {N}*)
- **Combat / Arena**: `Bout` on the `Trial Grounds`
- **Opponents**: Frame all current generated bouts as `Rival Companies`; document `Trial Guardians` in the Glossary for future construct/boss bouts
- **Difficulty Points**: `Trial Budget` (retire *Threat Budget* / *Threat*)
- **Bout Outcomes**: `Triumphs / Yields` (retire *Eclipses*)
- **Unit KO (0 HP)**: `Yielded` with `🏳️` (retire *Fallen* / *Defeated* and `💀` / `☠️`)
- **Constellation Tooltip**: `Starlight Chart` (retire *Node Scanner*)
- **Naming (`src/data/names.ts`)**: Remove grim recruit epithets & occult enemy adjectives; use grounded hometown/craft/starlight surnames and Rival Company/guild prefixes; keep recruit first names male/neutral (matching current male sprites)
- **Out of Scope**: Keep existing class, ability, and shard names as-is (only fix leaked `CTB` → `Initiative` wording in tooltips/logs/shard descriptions)

**Execution Checklist:**
- [X] Update `docs/architecture/GLOSSARY.md` and `DESIGN.md` with the canonical terminology above (and tidy parenthetical aliases in `docs/lore/world/the_nexus.md` if needed)
- [X] Apply UI copy pass across Start/Archives (`StartScreen`, `SaveSlotDrawer`, `storage/types`), Nexus (`CampHub`, `ActiveSquadDock`, `ReserveBarracksTray`, `HeroCard`, `HeroMiniCard`, `ExpeditionWarRoom`), Progression (`HeroProgressionDrawer`, `OffNodeChoiceModal`), and Bout UI (`CombatArena`, `EnemyTurnBanner`, `HarvestDistributionModal`, `BattleDefeatModal`, `DiceTumblerTray`, `CombatLogPanel`, `combatLogger`, `UnitStatusCard`, `harmonization`)
- [X] Update procedural naming & encounter framing (`src/data/names.ts`, `src/core/campaign/campaignFactory.ts`, `src/core/campaign/encounterGenerator.ts`, `src/data/encounters/noviceSandbox.ts`) + update affected tests

### Lore Alignment Pass (Phase 2 — Visuals & Codex, Later)
- [X] Twilight indigo/violet + warm lantern palette pass (`src/styles/tokens.css`, `StartScreen.css`, `CampHub.css`)
- [X] Cosmic Sprite UI presence & Campfire Commons staging visuals (pairs with **UX.16** below)

---

## 🎨 UX Updates
- [ ] **UX.7**: Dice Tray: Maybe we change it to click to close instead of auto close (re-assess after pacing & clash stage update).
- [ ] **UX.15**: Make Vanguard Squad area in Post Trial XP distribution dialog scrollable.
- [X] **UX.16**: More interesting Vanguard area. Maybe some sort of campfire with the unit sprites randomly gathered around. Maybe animated milling about?
- [X] **UX.26**: "The Enclave" should scroll vertically, not horizontally.

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

