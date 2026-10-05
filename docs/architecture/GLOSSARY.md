# Astral Tactics — Canonical Thematic Glossary & Style Guide

This document defines the canonical terminology, lore framing, and UI vocabulary for **Astral Tactics**. 

Whenever writing user-facing strings, UI components, ability tooltips, combat logs, or documentation, use these terms to maintain consistency across the project. Do not revert to generic RPG jargon or internal developer placeholders.

---

## 1. Core Metaphor & Lore Framing

The world of Astral Tactics centers on celestial navigation, astral rifts, and stellar resonance:
* **The Astral Realm**: The cosmic dimension through which expeditions travel across unstable sectors.
* **Wayfarers**: Mortal champions and initiates who traverse the astral field and attune their souls to celestial constellations.
* **Stellar Constellations**: The celestial lattices of martial, agile, and mystical knowledge that govern character growth and class specializations.

---

## 2. Terminology by Domain

### 2.1. Expedition & Campaign Domain (`src/core/campaign/`)

| Canonical Term | Avoid Using | Meaning & Usage |
| :--- | :--- | :--- |
| **The Nexus** | Camp, Base Camp, Town | The central astral haven where wayfarers rest, regroup, and prepare for upcoming trials. |
| **The Vanguard** | Active Squad, Party | The active combat echelon deployed to the astral field (strictly 3 wayfarer conduits). |
| **The Enclave** | Reserve Barracks, Benched, Reserves | The haven sanctuary where standby wayfarers rest when not attuned to the active vanguard. |
| **Conduit** | Slot, Party Slot | The celestial anchors (Conduit I, II, III) into which wayfarers are attuned for combat. |
| **Wayfarer** | Hero, Unit, Character, Adventurer | Player-controlled combatants and initiates on the expedition roster. |
| **Novice** | Rookie, Level-0, Recruit | An unformed wayfarer who has not yet attuned to a specialized class. Awakened at The Nexus. |
| **Awaken Novice** | Recruit Hero, Buy Unit | The act of summoning/initiating a fresh Novice wayfarer into The Enclave. |
| **Attune / Withdraw** | Deploy / Bench, Swap | Attuning a wayfarer from The Enclave into a Vanguard conduit, or withdrawing them back to The Enclave. |
| **Sector {N}** | Stage {N}, Floor {N}, Level {N} | The progressive milestone depth of the current expedition run (e.g. *Sector 1*, *Sector 2*). |
| **Triumph** | Victory, Win | A victorious trial outcome where hostile void incursions are banished and objectives fulfilled. |
| **Eclipse** | Defeat, Loss, Wipe | A failed trial where all vanguard wayfarers fall, causing an astral severance back to The Nexus. |

---

### 2.2. Constellation & Class Progression (`src/ui/camp/`, `src/ui/pyramid/`)

| Canonical Term | Avoid Using | Meaning & Usage |
| :--- | :--- | :--- |
| **The Constellation** | Skill Tree, Class Pyramid, Tech Tree | The 100-class celestial lattice connecting novice beginnings to specialized capstones. |
| **Ascend / ✦ Ascension** | Level Up, Rank Up | Milestones where accumulated archetype experience is channeled into permanent stat and class points. |
| **✦ ASCENSION READY** | LEVEL READY, Skill Point Available | Prominent UI badge displayed when a wayfarer satisfies the archetype XP threshold to ascend. |
| **Discipline** | Stat Branch, Path | The three primary paths of celestial power: *Fighter* (Force), *Rogue* (Finesse), *Mage* (Focus). |
| **Assumed Class** | Active Class, Main Class | The primary class package currently equipped to define the wayfarer's core combat deck. |
| **Combat Manifest** | Loadout, Deck, Action Bar | The complete set of abilities a wayfarer brings to battle (Core Kit + Resonant Wildcards). |
| **Resonant Ability** | Wildcard Ability, Cross-class skill | Active abilities borrowed from previously unlocked classes (Slots I and II). |
| **Resonant Passive** | Wildcard Passive, Sub-trait | A secondary passive trait equipped from any past class along the wayfarer's constellation path. |
| **Off-Node Coordinate** | Empty node, Dead space, Sub-node | A coordinate in the 100-class lattice without a catalog class node, awarding Wayfarer milestones. |
| **Starlight Waypoint** | Minor star, Waypoint, Sub-star | Illuminated barycentric waypoint rendered on the constellation star chart along facet edges. |
| **Wayfarer Attunement** | Stat pick, Perk, Level bonus | Permanent defensive vital choice selected on off-node level-up (*Bastion*, *Stride*, *Ward*, *Zenith*). |
| **Wayfarer Rank** | Sub-rank, Off-node level | Dynamic title appended to a hero based on completed off-node milestones (e.g. *Warrior • Wayfarer I*). |
| **Astral Augment Shard** | Gem, Rune, Upgrade module, Materia | A socketable celestial module that permanently augments an ability slot in combat loadouts. |
| **Slot Socketing** | Gem slotting, Skill enchantment | The mechanic where shards socket into an ability slot (0..4), persisting when abilities are swapped. |
| **Harmonization Stat Surge** | Stat boost, Attribute surge | The derived vital gains awarded upon unlocking an off-node lattice coordinate. |
| **Node Scanner** | Star Scanner, Tooltip | The HUD component inspecting requirements, passives, and active skills on constellation nodes. |

---

### 2.3. Tactical Combat Arena (`src/core/combat/`, `src/ui/combat/`)

| Canonical Term | Avoid Using | Meaning & Usage |
| :--- | :--- | :--- |
| **Trial / Astral Trial** | Arena, Match, Battle, Sandbox | The tactical combat engagement against hostile void incursions on the hex grid. |
| **Initiative** | CTB Gauge, Action Gauge, ATB | A wayfarer's real-time turn readiness counter (0–100) driven by Finesse/Speed ticks. |
| **Turn Queue** | CTB Queue, Turn Order Ribbon | The horizontal timeline ribbon displaying the dynamic sequencing of upcoming unit turns. |
| **Astral Grid / Field** | Map, Hex Board, Stage | The pointy-topped hexagonal terrain where combat movement and tactical line-of-sight occur. |
| **Traverse** | Move (in flavor text) | Maneuvering across hexes (e.g. *Traverse the astral grid (costs 1 AP)*). |
| **Astral Chronicle** | Combat Log | The transparent inspectable ledger recording dice rolls, damage breakdowns, and movements. |
| **Combat Arcs** | Angles, Directions | The three tactical engagement angles: **Front Arc** (180°), **Flank Arc** (±120°), and **Rear Arc** (180°). |
| **Reactive Facing** | Turn-to-hit | The tactical rule where a unit hit by an attack immediately rotates to face the attack vector. |
| **Allied Pincer** | Flank Bonus | Flanking status granted to all attackers when an ally is engaged adjacent to the target. |
| **Status Condition** | Debuff, Status effect, Buff | An attributed persistent state on a unit (`POISON`, `BURN`, `CHALLENGED`, `STEALTH`). |
| **Metamagic Primer** | Buff, Spell charge | An in-combat modifier that enhances and is consumed by the next cast spell (e.g. *Spell Sculpt*). |
| **Wild Surge** | Magic miscast, Wild magic | Spontaneous celestial surges triggered by spell critical hits from the Sorcerer's *Wild Surge*. |
| **Wall-Slam Impact** | Knockback damage, Collision | Bonus physical damage suffered when forced kinetic displacement collides with walls or obstacles. |
| **Threat Budget** | Difficulty Rating, Enemy Points | The numerical cap used by the procedural generator to budget hostile archetype quantities. |

---

## 3. UI Phrasing & Style Guide

When generating or refactoring user interface elements, refer to this standard phrasing table:

| Context | Preferred Phrasing | Do Not Use |
| :--- | :--- | :--- |
| **Start Screen CTA** | `✦ New Astral Expedition` | `Start Game`, `New Game` |
| **Resume CTA** | `✦ Resume Expedition` | `Continue Run` |
| **Enter Battle CTA** | `✦ ENTER TRIAL` | `DEPLOY SQUAD`, `Start Fight` |
| **End Turn Button** | `End Turn (+{N} Initiative)` | `End Turn (+{N} CTB)` |
| **Empty Conduit** | `Vacant Conduit` | `Empty Slot` |
| **Empty Conduit Hint** | `Attune a reserve wayfarer to this conduit` | `Deploy a hero from barracks below` |
| **Empty Reserve State** | `No wayfarers in The Enclave. Awaken a Novice to expand your roster!` | `No heroes in reserve. Recruit a Novice...` |
| **Replace Unit Hint** | `Select a wayfarer from The Enclave to attune in place of {name}:` | `Select a reserve hero below to replace...` |
| **Withdraw Guard** | `Cannot withdraw the only wayfarer in The Vanguard` | `Cannot bench the only active squad hero` |
| **Victory Modal Header** | `✦ Celestial Milestone Secured` | `Objective Complete` |
| **Victory Modal Title** | `Trial Triumph!` | `Trial Victory!` |
| **Defeat Modal Header** | `⚔️ Vanguard Defeated` | `Squad Defeated` |
| **Defeat Modal Title** | `The Trial Was Lost` | `The Skirmish Was Lost` |
| **Return Button** | `✦ Return to The Nexus` | `Return to Camp` |
| **Retry Button** | `↺ Retry Trial` | `Retry Skirmish`, `Reset Arena` |
| **Enemy Turn Banner** | `Enemy Turn` (Sub: `Scrutinizing the astral field...`) | `Hostile Turn`, `Thinking...` |

---

## 4. Class Packages & Archetype Tokens

Class names remain grounded and direct, while archetype accents maintain high-contrast accessibility:

* **Archetypes**:
  * **Fighter / Force**: `--color-archetype-fighter` (`#ef4444` Crimson / Rust)
  * **Rogue / Finesse**: `--color-archetype-rogue` (`#10b981` Emerald / Jade)
  * **Mage / Focus**: `--color-archetype-mage` (`#8b5cf6` Starlight Violet)
* **Foundation Classes (Tier 1)**:
  * **Novice**: `--color-class-novice` (`#94a3b8` Silver Slate)
  * **Warrior**: `--color-class-warrior` (`#f97316` Tempered Bronze)
  * **Thief**: `--color-class-thief` (`#34d399` Shadow Emerald)
  * **Wizard**: `--color-class-wizard` (`#a78bfa` Starlight Lavender)
* **Specialized Classes (Tier 2)**:
  * **Knight**: `--color-class-knight` (`#f59e0b` Royal Amber Gold / Burnished Steel) — Token: `02_human_male`
  * **Infiltrator**: `--color-class-infiltrator` (`#059669` Obsidian Shadow / Nightshade Jade) — Token: `82_human_male`
  * **Sorcerer**: `--color-class-sorcerer` (`#7c3aed` Deep Starlight Indigo / Wild Arcane) — Token: `98_human_male`
