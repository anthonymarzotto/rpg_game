# Astral Tactics — Development Roadmap (October 2026)

This document establishes the tactical development roadmap for **Astral Tactics**, succeeding the completed foundational phases archived in [`docs/plans/archived/DEVELOPMENT_PLAN.md`](file:///c:/Repos/rpg_game/docs/plans/archived/DEVELOPMENT_PLAN.md).

Following our core architectural tenet (**Decoupled Simulation & Presentation**), every gameplay mechanic, AI decision model, and data pipeline is implemented and tested first as pure headless TypeScript logic in `src/core/` before integrating with the React + SVG + CSS presentation tier.

---

## 📌 Foundation & Verified Baseline

All foundational systems through Phase 4 are fully implemented, verified, and backed by a comprehensive headless Vitest test suite (**52 test suites, 369/369 tests passing**):

* **Headless Simulation Engine (`src/core/`)**: Axial hex math, pathfinding, Line-of-Sight raycasting, kinetic displacement, wall-slam collision damage, CTB accumulator clock with unspent AP recovery, and Triad Vector resolution ($d20$ attack rolls, Grazes, Crits, Armor/Ward damage mitigation).
* **Directional Facing & Combat Arcs (`src/core/grid/`, `src/core/combat/`)**: Six-direction unit facing, tactical engagement arcs (`FRONT`, `FLANK`, `REAR`), on-hit reactive rotation, allied pincers, and directional sprite tokens.
* **Composable Ability Pipeline & Universal Modifiers (`src/core/types/`, `src/core/combat/`)**: Atomic `effects: readonly AbilityEffect[]` execution pipeline, declarative `AbilityModifier` patches, pure `getEffectiveAbility` evaluation, provenance attribution tracking, and UI augment indicators (`✦`).
* **Combat Conditions Engine (`src/core/combat/effects/`)**: `ActiveCondition` tracking with mandatory `sourceUnitId`, turn-start DoT processing (`POISON`, `BURN`), behavioral constraints (`STEALTH` single-target immunity, `CHALLENGED` disadvantage), instantaneous CTB manipulation (`CTB_DELAY`), and on-crit passive triggers (`Wild Surge`).
* **Tactical Autonomous AI (`src/core/ai/`)**: Composite move-and-act evaluations across behavioral profiles (`BRAWLER`, `SKIRMISHER`, `SNIPER`, `SUPPORT`), tactical primer scoring (`Spell Sculpt`), and AP conservation.
* **Expedition Camp Hub & Roster Loop (`src/core/campaign/`, `src/ui/camp/`)**: The Nexus hub, Active Vanguard dock (3 conduits), Reserve Barracks (The Enclave) with smart swapping & novice awakening, procedural encounter generator with dynamic threat budgeting, and persistent multi-slot save/export management.
* **Pure Tier 2 Class Packages (`src/data/packages/`)**: Complete bespoke kits for **Knight** `(2, 0, 0)`, **Infiltrator** `(0, 2, 0)`, and **Sorcerer** `(0, 0, 2)`.
* **Off-Node Harmonization & Augment Shards (`src/core/progression/`)**: 39 off-node waypoints in the 100-class lattice, Harmonization stat surges, Wayfarer Attunements (*Bastion*, *Stride*, *Ward*, *Zenith*), interactive two-step `OffNodeChoiceModal`, full catalog of 17 socketable `AstralAugmentShard` modules (Power, Geometry, Infusion) bound to ability slots 0..4, constellation Starlight Waypoints, and dynamic Wayfarer Hero Titles.

---

## 🧭 Prioritized Development Phases

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: TIER 3 HYBRID CLASS EXPANSION                      │
│  - [x] 5.1 Cavalier (2, 1, 0) kit & shock charge mechanics  │
│  - [x] 5.2 Berserker (2, 0, 1) kit & blood frenzy primers   │
│  - [x] 5.3 Highwayman (1, 2, 0) kit & skirmish ambush       │
│  - [x] 5.4 Warlock (1, 0, 2) kit & eldritch drain           │
│  - [x] 5.5 Witch (0, 1, 2) kit & misfortune ward            │
│  - [x] 5.6 Hybrid AI profiles & primer heuristics           │
│  - [ ] 5.7 Campaign encounter budget & token mapping        │
│  - [*] (Cat-burglar moved to Phase 6b for elevation)        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: TACTICAL VERTICALITY & DYNAMIC ELEVATION           │
│  - [ ] 6.1 Discrete hex elevation math & cliff boundaries   │
│  - [ ] 6.2 High-ground tactical advantages (Range & Roll)   │
│  - [ ] 6.3 Vertical movement, climbing & ledge drop-downs   │
│  - [ ] 6.4 Plunging knockback & fall impact damage          │
│  - [ ] 6.5 Isometric SVG height shading & elevation steps   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6b: CAT-BURGLAR & ELEVATION INFILTRATION              │
│  - [ ] 6b.1 Cat-burglar (0, 2, 1) kit & second-story vault  │
│  - [ ] 6b.2 Vertical infiltration AI heuristics             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 7: EXPEDITION SECTOR MAPS & NON-LINEAR BRANCHING      │
│  - [ ] 7.1 Branching node-based sector navigation           │
│  - [ ] 7.2 Celestial Shrines, Havens & Astral Anomalies     │
│  - [ ] 7.3 Celestial Relics & passive squad artifacts       │
│  - [ ] 7.4 Elite Trials & multi-hex boss entities           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 8: TACTILE JUICE, VISUAL DICE & COMBAT POLISH         │
│  - [ ] 8.1 Animated visual dice pop & clatter overlays      │
│  - [ ] 8.2 Screen-shake shaders & tactical impact particles │
│  - [ ] 8.3 Floating combat numbers & bezier animations      │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 5: Tier 3 Hybrid Class Expansion

**Primary Goal**: Author the complete roster of 6 Tier 3 dual-archetype hybrid classes in the 100-class lattice (`CLASS_CATALOG`), leveraging our existing battle-tested mechanics (atomic effects, `POISON`, `BURN`, `STEALTH`, `CHALLENGED`, kinetic displacement, and CTB clock manipulation) without introducing unused or redundant status conditions. Each class is authored one at a time with its own dedicated package, active loadout, and passive mastery trait.

### 5.1. Cavalier Class Package (`src/data/packages/cavalier.ts`) - [x] COMPLETED
* **Archetype**: `(2, 1, 0)` (Fighter/Rogue — Dominant Fighter) — Mounted shock vanguard, foppish duelist & line breaker.
* **Signature**: `Lance Charge` (2 AP, straight-line 2–3 hex charge dealing 1d8 + Force physical damage and pushing the target 1 hex with wall-slam collision risk).
* **Domain 1**: `Ride-Through` (1 AP, 1d4 + Finesse saber strike advancing through target into rear hex when clear).
* **Domain 2**: `Flamboyant Flourish` (1 AP, aristocratic melee taunt inflicting `CHALLENGED` on target for 2 turns and granting self +2 Evasion for 1 turn).
* **Passive**: `Impact Velocity` (+2 flat collision and wall-slam damage bonus caused by this unit).
* **AI Profile**: `BRAWLER` (charges frontline, initiates wall-slams).

### 5.2. Berserker Class Package (`src/data/packages/berserker.ts`) - [x] COMPLETED
* **Archetype**: `(2, 0, 1)` (Fighter/Mage — Dominant Fighter) — Blood-rage juggernaut & arcane reckoning.
* **Signature**: `Blood Frenzy` (1 AP + 3 HP self-sacrifice, primes next physical attack with +1 Die Step and +2 Attack Roll bonus).
* **Domain 1**: `Reckless Cleave` (2 AP, 2d4 + Force physical damage vs Evasion sweeping up to 2 adjacent frontal hexes for rolled collateral damage; inflicts -2 Evasion on self for 1 turn).
* **Domain 2**: `Ignite Rage` (1 AP, 1d6 + Focus magical damage vs Resolve and inflicts `BURN` DoT [2 dmg/turn for 2 turns]).
* **Passive**: `Deathbound Fury` (+2 flat damage to physical attacks and expands Critical Hit threshold to 19–20 when current HP <= 50% max HP).
* **AI Profile**: `BRAWLER` (activates blood frenzy, engages high-density clusters).

### 5.3. Highwayman Class Package (`src/data/packages/highwayman.ts`) - [x] COMPLETED
* **Archetype**: `(1, 2, 0)` (Rogue/Fighter — Dominant Rogue) — Debonair gentleman ambusher & range-controlling skirmisher.
* **Signature**: `Point-Blank Buckshot` (2 AP, range 1–2, 1d8 + Finesse physical damage vs Evasion and knocks target back 1 hex with wall-slam collision risk).
* **Domain 1**: `Stand and Deliver!` (1 AP, range 1–2 utility hold-up, inflicts 30 CTB initiative delay and -2 Armor on target for 2 turns).
* **Domain 2**: `Gallant Flourish` (1 AP, range 1, 1d4 + Finesse physical damage vs Evasion and grants self +2 Evasion for 1 turn).
* **Passive**: `Highway Toll` (+2 flat physical damage against targets with positive Armor > 0).
* **AI Profile**: `SKIRMISHER` (proactively seeks Range 1–2, targets armored foes, creates spacing with Buckshot).

### 5.4. Warlock Class Package (`src/data/packages/warlock.ts`) - [x] COMPLETED
* **Archetype**: `(1, 0, 2)` (Mage/Fighter — Dominant Mage) — Eldritch battlemage & soul brander.
* **Signature**: `Eldritch Blast` (2 AP, range 3, 1d8 + Focus magical damage vs Resolve and knocks target back 1 hex with wall-slam collision risk).
* **Domain 1**: `Pact Blade` (1 AP, range 1, 1d6 + Focus magical damage vs Resolve, bypassing physical Armor).
* **Domain 2**: `Hellfire Brand` (1 AP, range 2, 1d4 + Focus magical damage vs Resolve and inflicts `BURN` DoT [2 dmg/turn for 2 turns]).
* **Passive**: `Soul Carapace` (landing a magical attack grants self +1 Armor and +1 Ward for 1 turn).
* **AI Profile**: `SNIPER` (hovers at range 2–3, repels with eldritch blast, punishes close combat with pact blade).

### 5.5. Witch Class Package (`src/data/packages/witch.ts`) - [x] COMPLETED
*(Note: Cat-burglar class package deferred to Phase 6b to leverage verticality & dynamic elevation mechanics).*
* **Archetype**: `(0, 1, 2)` (Mage/Rogue — Dominant Mage) — Occult hexer, sympathetic saboteur & tempo controller.
* **Signature**: `Baleful Hex` (1 AP, range 3, 1d4 + Focus magical damage vs Resolve; inflicts `POISON` DoT [2 dmg/turn for 2 turns] and 20 CTB gauge delay).
* **Domain 1**: `Poppet Needle` (1 AP, range 3, 1d6 + Focus magical damage vs Resolve; pierces the effigy, forcing target facing 180° away and inflicting -2 Resolve for 2 turns).
* **Domain 2**: `Witch's Talisman` (1 AP, range 2 on ally; grants target ally +25 CTB ticks and +2 Speed for 1 turn).
* **Passive**: `Misfortune Ward` (Target-centric protective aura: attacks targeting allies or self within 2 hexes of the Witch suffer -2 to their Attack Roll; establishes the reusable target-proximity aura architecture for Shield Bearer and Cleric).
* **AI Profile**: `SUPPORT` (prioritizes debuffing high-threat targets, controlling combat tempo, and buffing frontline allies with talisman).

### 5.6. Hybrid AI Profiles & Tactical Primer Heuristics (`src/core/ai/`) - [x] COMPLETED
* **Behavioral Profile Mapping**:
  * `cavalier` -> `BRAWLER` (charges frontline, initiates wall-slams).
  * `berserker` -> `BRAWLER` (activates blood frenzy, engages high-density clusters).
  * `highwayman` -> `SKIRMISHER` (seeks flank/rear positions, uses smoke repositioning).
  * `warlock` -> `SNIPER` (maintains range, snipes with eldritch blast, drains threatened targets).
  * `witch` -> `SUPPORT` (debuffs priority targets with hexes, controls combat tempo, and buffs frontline allies with talisman).
* **Tactical Primer Heuristics**: Teach composite move-and-act evaluation to value self-buff primers (`Blood Frenzy`, `Rallying Pennant`) when follow-up AP is available.

### 5.7. Campaign Encounter Budget & Pixel Token Mapping (`src/core/campaign/`, `src/ui/combat/`)
* **Dynamic Threat Budgeting**: Update `encounterGenerator.ts` to spawn Tier 3 hybrid enemies at Stage 5+ with higher threat budgets (60–80 points).
* **Token Asset Whitelisting**: Map unique pixel sprites from `characters_packed.png` for all active Tier 3 classes in `tokenAssets.ts` with dedicated unit cards and color badges.

---

## Phase 6: Tactical Verticality & Dynamic Elevation

**Primary Goal**: Elevate combat into three dimensions by introducing discrete terrain heights on the hex grid, granting high-ground tactical superiority and enabling kinetic vertical knockback over cliffs.

### 6.1. Discrete Hex Elevation Model (`src/core/grid/`)
* **Data Model**: Extend `HexCoord` or tile state with an integer `elevation: number` (defaults to `0`; hills at `1`, cliffs/peaks at `2`, plateaus at `3`).
* **Line-of-Sight Occlusion**: Raycasting accounts for elevation:
  * Targets at lower elevations behind a higher tile are obstructed.
  * Units on high ground can shoot over intermediate obstacles of equal or lower height.

### 6.2. High-Ground Tactical Advantages (`src/core/combat/`)
* **Ranged Elevation Superiority**:
  * Ranged attacks fired from higher elevation ($\Delta h \ge +1$) gain **+1 Effective Range** per elevation level.
  * Firing downward onto a lower target grants **+2 to the Attack Roll** (or Advantage if $\Delta h \ge +2$).
* **Low-Ground Vulnerability**:
  * Ranged attacks fired upward into higher elevation suffer **-2 to the Attack Roll** (or Disadvantage).

### 6.3. Vertical Movement & Traversal Rules (`src/core/combat/movement.ts`)
* **Step Restrictions**: Moving up an elevation difference of $\Delta h = +1$ costs $+1$ additional AP (or reduces Move distance by 1).
* **Cliff Barriers**: Ascending an elevation rise of $\Delta h \ge +2$ is impassable without specialized abilities (e.g. *Teleport*, *Shadow Step*, *Leap*).
* **Ledge Drop-Down**: Walking off a ledge ($\Delta h \le -1$) is permitted, but dropping $\Delta h \le -2$ inflicts fall impact damage.

### 6.4. Kinetic Plunging Knockback & Fall Damage (`src/core/combat/displacement.ts`)
* **Falling Off Ledges**: When an ability with knockback (e.g. *Shield Bash*, *Gust*, *Lance Charge*) displaces a unit off a ledge:
  * The unit drops to the lower hex's elevation.
  * The unit suffers **Fall Impact Damage**: $\max(1, \Delta h \times 4 - \text{Armor})$.
* **Pit / Chasm Hazards**: Units pushed off perimeter void tiles are immediately severed/routed from combat.

### 6.5. Presentation & Rendering Tier (`src/ui/combat/HexGridSvg.tsx`)
* **Layered Extrusions**: Render elevated hexes with faux-3D extruded prism side walls and darker drop shadows.
* **Elevation Step Indicators**: Display subtle elevation contour badges (`+1`, `+2`) on hover and selection rings.

---

## Phase 6b: Cat-Burglar Class Package & Elevation Infiltration

**Primary Goal**: Author the Tier 3 **Cat-burglar** `(0, 2, 1)` (Rogue/Mage — Dominant Rogue) class package (`src/data/packages/catBurglar.ts`), specifically designed to leverage Phase 6's verticality mechanics (wall climbing, ledge drop-downs, obstacle vaulting, and immunity to fall damage).

* **Motivation for Phase 6b Timing**: The core fantasy of a second-story cat-burglar is an agile acrobat who scales heights, escapes being cornered, and steals tempo rather than dealing brute damage. Implementing this class after discrete elevation is in place allows the kit to naturally interact with cliffs ($\Delta h \ge +2$), rooftops, and wall boundaries.

### Explored Kit Candidates:

#### Option 1: "The Second-Story Acrobat" (Focus: Vaulting & Spatial Elusiveness)
* **Signature**: `Rooftop Vault` (1 AP, Range 2 hex leap to an unoccupied walkable hex, ignoring intervening enemies, obstacles, and up to $\Delta h = +2$ elevation cliffs; grants self +2 Evasion for 1 turn).
* **Domain 1**: `Pilfer` (1 AP, range 1, 1d4 + Finesse physical damage vs Evasion; siphons 20 CTB initiative ticks from target directly into the Burglar).
* **Domain 2**: `Flash Powder` (1 AP, range 1 adjacent burst; forces targets to face away and inflicts -2 Attack Roll or -20 CTB Delay for 1 turn).
* **Passive**: `Feline Grace` (Immune to Wall-Slam collision damage and Fall Impact Damage; grants +2 Evasion when adjacent to walls, obstacles, or when occupying higher elevation).
* **AI Profile**: `SKIRMISHER` (seeks high-ground infiltration routes, siphons tempo from priority targets, and vaults away from frontline pressure).

#### Option 2: "The Master Thief" (Focus: Audacious Heist & Slippery Getaways)
* **Signature**: `Purloin` (1 AP, range 1, 1d4 + Finesse physical damage vs Evasion; siphons -2 Armor from target for 2 turns and grants +2 Evasion to Burglar for 1 turn).
* **Domain 1**: `Slip the Net` (1 AP, range 2; drops decoy smoke, teleports 2 hexes, and grants `STEALTH` for 1 turn).
* **Domain 2**: `Flash Powder` (1 AP, range 1; disorients adjacent foes, resetting facing and delaying CTB).
* **Passive**: `Slippery Paws` (Immune to collision/fall damage; whenever an enemy attack results in a MISS or GRAZE against the Burglar, Burglar immediately gains +15 CTB ticks).
* **AI Profile**: `SKIRMISHER`.

### 6b.2. Vertical Infiltration AI Heuristics (`src/core/ai/`)
* Teach skirmisher profile to seek rooftop perches, vault over frontline guards to reach isolated squishy targets, and deploy flash powder when threatened in melee.

---

## Phase 7: Expedition Sector Maps & Non-Linear Branching

**Primary Goal**: Transform the campaign between battles from a linear stage progression into a rich, strategic expedition navigation map with meaningful risk/reward choices.

### 7.1. Node-Based Sector Navigation (`src/core/campaign/sectorMap.ts`)
* **Branching Node Tree**: Each expedition sector generates a procedural directed acyclic graph (DAG) of nodes:
  * **Combat Trials**: Standard skirmishes against hostile void incursions.
  * **Elite Anomalies**: Higher threat budget encounters rewarding rare Astral Augment Shards or class unlocks.
  * **Celestial Havens**: Safe rest nodes where wayfarers can heal HP, attune abilities, or remove afflictions without spending gold.
  * **Astral Shrines**: Interactive altars offering dangerous gambits (e.g. sacrifice max HP for permanent stat surges).
  * **Mystery Rifts**: Random celestial events with narrative choices and dice-check resolutions.

### 7.2. Celestial Relics & Squad Artifacts (`src/core/items/`)
* **Passive Relic Items**: Equippable squad charms found during expeditions that alter global rules:
  * *Chrono Hourglass*: Unspent AP refund increased from 20 to 30 initiative gauge.
  * *Sunstone Prism*: Friendly AoE aura radiuses increased by +1 hex.
  * *Lodestone Shield*: Knockback impact damage increased by +2.

### 7.3. Boss Encounters & Multi-Hex Behemoths
* **Multi-Hex Units**: Large astral entities occupying 2–3 contiguous hexes with custom footprint masks.
* **Multi-Action Boss Turns**: Elite adversaries possessing dynamic turn-phases or double CTB gauge ticks.

---

## Phase 8: Tactile Juice, Visual Dice & Combat Polish

**Primary Goal**: Deliver visceral sensory polish, dynamic physical feedback, and tactile drama without sacrificing the game's lightweight headless web architecture.

### 8.1. Visual Dice Tumbler & Animation Layer (`src/ui/combat/DiceTray.tsx`)
* **Tactile Rolling Dice**: Visual tumbling dice modal/drawer that rolls when abilities execute, settling on values with screen-shake impact for Critical Hits.
* **Dice Customization**: Celestial cosmetic dice skins reflecting vanguard attunements (Bastion gold, Stride emerald, Ward violet, Zenith starlight).

### 8.2. Screen-Shake Shaders & Tactical Impact Particles (`src/ui/combat/`)
* **Dynamic Impact Shaders**: Micro-directional screen shake on heavy kinetic impacts and wall-slam collisions.
* **Particle Bursts**: SVG/Canvas particle flourishes on critical strikes, condition applications, and waypoint attunements.

### 8.3. Floating Text & Status Animations
* **Combat Floaters**: Polished bezier floating combat numbers with color coding (Physical: orange, Magic: violet, Healing: emerald, DoTs: crimson).
* **Turn Notification Badges**: Dynamic turn-transition banner sliding across the CTB timeline ribbon.

---

## 🧊 Deferred Items (Future Strategic Horizons)

* **Procedural Audio Engine & Sound FX**: Web Audio API synth architecture, chiptune humming, and dice clatter sounds (deferred until sound design and acoustic direction are determined).
* **Tier 9+ Centroid Classes (e.g. Bard `3, 3, 3`)**: Will be authored alongside high-tier endgame progression when the tri-archetype class pyramid reaches those heights.

---

## 📅 Roadmap Maintenance & Archival Policy

* When all tasks within a Phase or major milestone reach 100% completion and verification, update the milestone markers here.
* Once this document's scope is fulfilled, archive it with its completion date to `docs/plans/archived/DEVELOPMENT_PLAN_YYYY_MM_DD.md` and initialize the subsequent horizon plan.
