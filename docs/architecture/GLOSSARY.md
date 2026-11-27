# Astral Tactics — Canonical Thematic Glossary & Style Guide

This document defines the canonical terminology, lore framing, and UI vocabulary for **Astral Tactics**.

Whenever writing user-facing strings, UI components, ability tooltips, combat logs, or documentation, use these terms to maintain consistency across the project. Do not revert to generic RPG jargon, grim dark-fantasy clichés, or internal developer placeholders.

---

## 1. Core Metaphor & Lore Framing

The world of Astral Tactics centers on hopeful celestial tournaments, everyday mortals rising into perpetual twilight skies, and warm camaraderie under the stars (see [`docs/lore/`](../lore/README.md)):

* **The Firmament**: The expansive celestial realm of perpetual twilight skies, floating starlit landmasses, weathered river-slate plazas, and welcoming skyports high above the mortal world.
* **The Grand Conjunction**: The cyclical alignment of the heavens that casts gentle starlight beams down to the mortal world, lifting curious everyday folk upward to the Starlight Docks.
* **The Astral Tournaments**: Centuries-old celebrations of mortal determination, skill, and sportsmanship held across floating amphitheaters—never grim slaughter or cosmic horror.
* **The Falling Star's Favor**: The ultimate blessing awaiting at the pinnacle of the trials, capable of granting a single heartfelt wish to whichever company earns it.
* **Wayfarers**: Everyday mortals—village squires, apprentices, town guards, and wanderers—who travel together in a **Company** and grow through practice, friendship, and trail experience.
* **Cosmic Sprite (Player Persona)**: A small, luminous celestial creature native to the Firmament who travels alongside the Company as their beloved scout, navigator, and campfire friend.
* **Stellar Constellations**: Luminous sky-patterns embodying the **Triad of Traditions** (*Crimson Star / Force*, *Emerald Star / Finesse*, *Violet Star / Focus*) that inspire mortal growth and **Ascension**.

---

## 2. Terminology by Domain

### 2.1. Company & Campaign Domain (`src/core/campaign/`)

| Canonical Term | Avoid Using | Meaning & Usage |
| :--- | :--- | :--- |
| **The Nexus** | Camp, Base Camp, Town, Astral Hub | The grand skyport haven where traveling companies gather, pitch tents, and prepare for tournament bouts. |
| **Company** | Expedition, Squad, Party, Roster | The traveling band of everyday Wayfarers journeying together through the Firmament. |
| **The Staging Dais** | The Vanguard, Active Squad, Conduit, Party Slot | The raised river-stone dais at the heart of The Nexus where wayfarers step forward to take the field for a bout. |
| **Campfire Commons** | The Enclave, Reserve Barracks, Benched, Reserves | The warm hearth and tent courtyards where resting wayfarers mend gear, trade stories, and cheer on friends. |
| **The Starlight Docks** | Summoning Gate, Void Portal | The granite piers at The Nexus where fresh Novices step off the starlight beams from the mortal world. |
| **Wayfarer** | Hero, Unit, Character, Adventurer | Player-controlled mortal travelers and initiates in the Company. |
| **Novice** | Rookie, Level-0, Recruit | A fresh arrival stepping off the Starlight Docks who has not yet specialized into a class. |
| **Welcome Novice** | Awaken Novice, Recruit Hero, Buy Unit | Inviting a newly arrived Novice from the Starlight Docks into Campfire Commons. |
| **Stage / Rest** | Deploy / Bench, Attune / Withdraw | Stepping a wayfarer onto The Staging Dais for a bout, or letting them rest in Campfire Commons. *(Reserve **Attune** for Constellations and Classes.)* |
| **Trial {N}** | Sector {N}, Stage {N}, Floor {N}, Level {N} | Progressive tournament milestone depth for the current journey (e.g. *Trial 1*, *Trial 2*). |
| **Rival Companies** | Hostiles, Enemies, Void Incursions | Fellow traveling bands—academies, town watch patrols, guild artisans—competing in friendly tournament bouts. |
| **Trial Guardians** | Void Monsters, Anomalies | Ancient star-forged sentinels and clockwork automata crafted to impartially evaluate companies (reserved for future construct/boss bouts). |
| **Trial Budget** | Threat Budget, Threat, Difficulty Rating | The point allowance governing how many wayfarers and what combined weight may step onto The Staging Dais for a Trial. |
| **Triumph** | Victory, Win | A victorious tournament bout outcome where all opposing contenders have yielded. |
| **Yield** | Eclipse, Defeat, Loss, Wipe, Astral Severance | An honorable concession when a contender or Company steps to the sidelines to rest after exhausting their stamina. |

---

### 2.2. Constellation & Class Progression (`src/ui/camp/`, `src/ui/pyramid/`)

| Canonical Term | Avoid Using | Meaning & Usage |
| :--- | :--- | :--- |
| **The Constellation** | Skill Tree, Class Pyramid, Tech Tree | The 100-class celestial chart connecting novice beginnings to specialized capstones. |
| **Ascend / ✦ Ascension** | Level Up, Rank Up | Milestones where trail experience clicks into place, unlocking new classes or Wayfarer breakthroughs. |
| **✦ ASCENSION READY** | LEVEL READY, Skill Point Available | Prominent UI badge displayed when a wayfarer meets the XP threshold to follow a guiding star. |
| **Triad of Traditions** | Stat Branches, Paths | The three guiding stars of mortal craft: **Crimson Star (Force)**, **Emerald Star (Finesse)**, and **Violet Star (Focus)**. |
| **Attuned Class** | Active Class, Main Class | The primary class package currently equipped to define a wayfarer's core combat kit. |
| **Combat Manifest** | Loadout, Deck, Action Bar | The complete set of prepared skills a wayfarer brings to a bout (Core Kit + Resonant abilities). |
| **Resonant Ability** | Wildcard Ability, Cross-class skill | Active abilities carried forward from previously unlocked classes (Slots I and II). |
| **Resonant Passive** | Wildcard Passive, Sub-trait | A secondary passive trait equipped from any past class along the wayfarer's constellation path. |
| **Off-Node Coordinate** | Empty node, Dead space, Sub-node | A coordinate in the 100-class chart without a catalog class node, awarding Wayfarer milestones. |
| **Starlight Waypoint** | Minor star, Waypoint, Sub-star | Illuminated barycentric waypoint rendered on the constellation chart along facet edges. |
| **Wayfarer Attunement** | Stat pick, Perk, Level bonus | Permanent poise and vital refinement selected on off-node breakthroughs (*Bastion*, *Stride*, *Ward*, *Zenith*). |
| **Wayfarer Rank** | Sub-rank, Off-node level | Dynamic title appended to a wayfarer based on completed off-node milestones (e.g. *Warrior • Wayfarer I*). |
| **Astral Augment Shard** | Gem, Rune, Upgrade module, Materia | A socketable celestial shard that permanently augments an ability slot in combat kits. |
| **Slot Socketing** | Gem slotting, Skill enchantment | The mechanic where shards socket into an ability slot (0..4), persisting when abilities are swapped. |
| **Harmonization Stat Surge** | Stat boost, Attribute surge | The derived vital gains awarded upon unlocking an off-node waypoint. |
| **Starlight Chart** | Node Scanner, Star Scanner, Tooltip | The HUD readout inspecting requirements, passives, and active skills on constellation stars. |

---

### 2.3. Tactical Bout & Trial Grounds (`src/core/combat/`, `src/ui/combat/`)

| Canonical Term | Avoid Using | Meaning & Usage |
| :--- | :--- | :--- |
| **Bout** | Astral Trial, Arena, Match, Battle, Sandbox | A structured tournament engagement against Rival Companies or Trial Guardians. |
| **Trial Grounds** | Astral Grid, Map, Hex Board, Stage | The ancient floating river-slate amphitheaters and terraced plazas where bouts take place. |
| **Yielded (`🏳️`)** | Fallen, Defeated, Dead, Killed, `💀`, `☠️` | Status when a contender's stamina (HP) reaches 0 and they honorably step to the sidelines. |
| **Initiative** | CTB, CTB Gauge, Action Gauge, ATB | A contender's real-time turn readiness counter (0–100) driven by Speed ticks. Never display "CTB" in user-facing text. |
| **Turn Queue** | CTB Queue, Turn Order Ribbon | The horizontal timeline ribbon displaying upcoming contender turns. |
| **Traverse** | Move (in flavor text) | Maneuvering across hexes (e.g. *Traverse the trial grounds (costs 1 AP)*). |
| **Astral Chronicle** | Combat Log | The transparent inspectable ledger recording dice rolls, damage breakdowns, and maneuvers. |
| **Combat Arcs** | Angles, Directions | The three tactical engagement angles: **Front Arc** (180°), **Flank Arc** (±120°), and **Rear Arc** (180°). |
| **Reactive Facing** | Turn-to-hit | The rule where a contender hit by an attack immediately turns to face the attack vector. |
| **Allied Pincer** | Flank Bonus | Flanking status granted to attackers when an ally is engaged adjacent to the target. |
| **Status Condition** | Debuff, Status effect, Buff | An attributed persistent state on a contender (`POISON`, `BURN`, `CHALLENGED`, `STEALTH`, etc.). |
| **Metamagic Primer** | Buff, Spell charge | An in-bout modifier that enhances and is consumed by the next cast spell (e.g. *Spell Sculpt*). |
| **Wild Surge** | Magic miscast, Wild magic | Spontaneous celestial surges triggered by spell critical hits from the Sorcerer's *Wild Surge*. |
| **Wall-Slam Impact** | Knockback damage, Collision | Bonus physical damage suffered when forced displacement collides with walls or colonnades. |
| **Elevation Tier** | Height, Level | Discrete terrace altitude (0 to 3) determining tactical vantage and step costs. |
| **Ledge Drop** | Cliff Jump, Drop | Stepping down a height difference of 2 or more (`dh <= -2`), incurring landing impact. |
| **Fall Impact Damage** | Gravity damage, Fall damage | Unmitigated impact damage (`|dh| * 4`) suffered from dropping `dh <= -2`. |
| **Cliff Slam** | Wall slam, Wall impact | Collision impact suffered when displacement pushes a contender into a terrace face (`dh >= 2`). |

---

## 3. UI Phrasing & Style Guide

When generating or refactoring user interface elements, refer to this standard phrasing table:

| Context | Preferred Phrasing | Do Not Use |
| :--- | :--- | :--- |
| **Start Screen CTA** | `✦ Start New Company` | `New Astral Expedition`, `Start Game` |
| **Resume CTA** | `✦ Resume Journey` | `Resume Expedition`, `Continue Run` |
| **Archives Drawer Title** | `COMPANY CHRONICLES` | `EXPEDITION ARCHIVES` |
| **Empty Archive Slot** | `✦ Open Starlight Path` | `Empty Astral Void` |
| **Enter Bout CTA** | `✦ ENTER BOUT` | `ENTER TRIAL`, `DEPLOY SQUAD`, `Start Fight` |
| **End Turn Button** | `End Turn (+{N} Initiative)` | `End Turn (+{N} CTB)` |
| **Active Team Dock** | `✦ The Staging Dais` | `The Vanguard`, `Active Squad` |
| **Open Dais Spot** | `Open Dais Spot` / `Room on the Dais` | `Vacant Conduit`, `Empty Slot` |
| **Reserves Tray** | `Campfire Commons` | `The Enclave`, `Reserve Barracks` |
| **Recruit CTA** | `+ Welcome Novice` | `+ Awaken Novice`, `Recruit Hero` |
| **Empty Commons State** | `Campfire Commons is quiet. Welcome a Novice from the Starlight Docks!` | `No wayfarers in The Enclave...` |
| **Stage / Rest Actions** | `Stage` / `Rest` | `Deploy` / `Withdraw`, `Bench` |
| **Swap Banner Hint** | `Select a wayfarer from Campfire Commons to stage in place of {name}:` | `Select a wayfarer from The Enclave to attune...` |
| **Rest Guard Tooltip** | `Cannot rest the only wayfarer on The Staging Dais` | `Cannot withdraw the only wayfarer in The Vanguard` |
| **Bout Preview Panel** | `Upcoming Tournament Bout` / `Opposing Contenders` | `Astral Scrying & Recon` / `Detected Hostiles` |
| **Constellation HUD** | `✦ Starlight Chart` | `✦ Node Scanner` |
| **Opening Formation CTA** | `Begin Bout` (`Opening Bell`) | `Begin Trial` (`Roll Initiative`) |
| **Victory Modal Header** | `✦ Bout Triumph — Bells Sound Twice!` | `Harvest Trial Spoils`, `Objective Complete` |
| **Victory Modal Title** | `Share Trail Experience` | `Distribute Vanguard XP` |
| **Yield Modal Header** | `🏳️ Honorable Yield` | `Trial Retreat & Salvage`, `Vanguard Defeated` |
| **Yield Modal Title** | `Lessons from a Tough Bout` / `Your Company Yielded` | `Salvaged Experience`, `The Trial Was Lost` |
| **Return Button** | `✦ Return to The Nexus` / `⛺ Regroup at The Nexus` | `Proceed to Camp`, `Retreat to Camp` |
| **Rematch Button** | `↺ Rematch Bout` | `Retry Trial`, `Retry Skirmish` |
| **Opponent Turn Banner** | `Rival Turn` (Sub: `Sizing up the trial grounds...`) | `Enemy Turn`, `Hostile Turn`, `Scrutinizing the astral field...` |
| **Unit KO Presentation** | `🏳️ YIELDED` / `Yielded` | `💀 DEFEATED`, `Fallen`, `☠️` |

---

## 4. Triad of Traditions & Color Signatures

Tradition accents maintain high-contrast accessibility across all UI meters, dice, and markers:

* **Crimson Star — Force (`FIGHTER`)**: `--color-archetype-fighter` (`#ef4444` Crimson / Rust)
* **Emerald Star — Finesse (`ROGUE`)**: `--color-archetype-rogue` (`#10b981` Emerald / Jade)
* **Violet Star — Focus (`MAGE`)**: `--color-archetype-mage` (`#8b5cf6` Starlight Violet)
