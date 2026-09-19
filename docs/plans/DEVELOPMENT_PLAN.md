# Development Plan & Tactical Roadmap

This document outlines the prioritized implementation phases for the ongoing development of the Hex Tactics RPG. 

Following our core architectural tenet (**Decoupled Simulation & Presentation**), every gameplay mechanic, AI decision model, and data pipeline is implemented and tested first as pure headless TypeScript logic in `src/core/` before integrating with the React + SVG + CSS presentation tier.

---

## 📌 Foundation & Current Milestone Status

* **Core Simulation Engine** (`src/core/`): Axial hex math, pathfinding, raycast Line-of-Sight, knockback displacement, collision damage, CTB clock with unspent AP refund, and Triad Vector resolution ($d20$, Graze, Crit, Armor/Ward soak). *(Complete & Tested)*
* **Class Pyramid & Progression** (`src/core/progression/`, `src/data/classes.ts`): Full 100-class catalog, strict lockout validation, additive archetype point advancement, post-battle reconciliation, and constellation recording. *(Complete & Tested)*
* **Visual Combat Arena & Core Loop** (`src/ui/combat/`): Interactive SVG arena, dynamic action bar, floating combat text, transparent combat log, dev dice sandbox, post-battle victory modal with class unlocks, ability swapping, and arena rematch with persistent progression. *(Complete & Tested)*

---

## 🧭 Prioritized Development Phases

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: TACTICAL COMBAT ENEMY AI & MULTI-UNIT BATTLES      │
│  - Headless AI decision engine (scoring, threat, movement)  │
│  - CTB multi-unit turn sequencing (retiring passive dummies)│
│  - Multi-unit party squads (allied targeting, party HUD)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: PERSISTENCE & CAMPAIGN FLOW                        │
│  - IndexedDB storage engine (roster, saves, checkpoints)    │
│  - Campaign & encounter progression (multi-battle flow)     │
│  - Between-battle camp / barracks hub                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: CLASS & ABILITY EXPANSION (ON-DEMAND MECHANICS)    │
│  - Tier 2+ class ability kits & signature passives          │
│  - Status effects pipeline (introduced as abilities demand) │
│  - Elevation & verticality (introduced as abilities demand) │
│  - Off-node level compensatory perks / stat surges          │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Tactical Combat Enemy AI & Multi-Unit Battles

**Primary Goal**: Transform the arena from a target-dummy sandbox into a genuine tactical skirmish engine with intelligent hostile behavior and multi-unit squad dynamics.

### 1.1. Headless AI Decision Engine (`src/core/ai/`)
* **Core Responsibilities**: Pure domain logic that takes the current `CombatState` and active enemy `unitId`, and returns a sequence of executable actions for that unit's turn.
* **Evaluation & Scoring Heuristics**:
  * **Target Prioritization**: Evaluates candidate targets based on distance, defensive vulnerabilities (low Evasion vs. kinetic attacks, low Resolve vs. magic), remaining HP (finishing off low-health units), and threat archetype.
  * **Tactical Positioning**:
    * Melee units navigate toward optimal engagement tiles, seeking flanking angles while avoiding hazard tiles and bottlenecks.
    * Ranged and caster units maintain standoff distance, preserving clear Line-of-Sight while seeking partial cover behind obstacles or frontline allies.
  * **AP Allocation & Execution**:
    * Evaluates ability kits against the 3 AP budget (e.g. Move [1 AP] + Strike [1 AP] + Strike [1 AP], or Special Skill [2 AP] + Move [1 AP]).
    * Calculates the value of conserving unspent AP to gain the +20 CTB gauge refund for faster subsequent turns.
* **Testing & Verification**: Headless Vitest simulations verifying deterministic AI behavior across varying board configurations and archetype match-ups without rendering components.

### 1.2. Asynchronous CTB Multi-Unit Sequencing
* **Eliminate Passive Dummy Stepping**:
  * Retire `autoAdvancePassiveDummies` in favor of full asynchronous CTB turn scheduling where hostile units accumulate gauge and claim active turns naturally.
* **Turn Notification & Execution Dispatch**:
  * UI state engine coordinates enemy turn pacing (e.g., brief action pauses so players can follow enemy movements, strikes, and floating combat text).
  * Dev toggles for AI step speed (instant for testing, paced for gameplay).

### 1.3. Multi-Unit Party & Squad Combat
* **Party Roster in Combat**:
  * Support for 2–3 player-controlled units fighting alongside each other against enemy squads.
  * Turn handoff seamlessly shifts player control to whichever allied unit reaches 100 CTB gauge.
* **Targeting Expansion**:
  * Friendly targeting support for buffs, heals, shields, and positioning maneuvers.
* **Squad Arena UI Enhancements**:
  * Active unit indicator and dynamic reticles distinguishing player allies from enemies.
  * Initiative queue tracker showing upcoming turn order along the CTB timeline.

---

## Phase 2: Client Persistence & Campaign Flow

**Primary Goal**: Enable persistent progression, roster management, and multi-encounter campaigns across browser sessions.

### 2.1. IndexedDB Storage Architecture (`idb-keyval`)
* **Serialization Contracts**:
  * **Party & Unit State**: Base attributes, accumulated archetype points, completed constellation path, unlocked classes, and currently equipped ability loadouts.
  * **Session Checkpoint / Suspend State**: Exact mid-battle serialization allowing players to refresh or leave the browser and resume in-progress combat.
  * **Settings & Preferences** (`localStorage`): Combat text speed, dice display preferences, and UI options.
  * **Portable Save Export/Import**: JSON export and import mechanism for backup and portability.
* **Testing**: Headless unit tests verifying round-trip serialization and schema migrations.

### 2.2. Campaign & Multi-Encounter Progression Flow
* **Encounter Progression Graph**:
  * Structure encounters into sequential battles, gauntlets, or branching node maps with scaling difficulty and objective types.
* **Post-Battle Camp / Barracks Hub**:
  * Transition from the battle victory modal into a dedicated camp screen between encounters.
  * Inspect party members, review constellations, allocate earned archetype points, and swap equipped abilities from the unlocked class pool.
  * Prepare and select party loadouts for the next deployment.

---

## Phase 3: Class & Ability Content Expansion (With On-Demand Systems)

**Primary Goal**: Deepen tactical variety by authoring Tier 2+ classes and introducing combat mechanics organically as specific abilities demand them.

### 3.1. Tier 2+ Class Kits & Archetype Trees
* Author bespoke active ability loadouts and passive mastery traits for Tier 2 classes:
  * **Knight** `(2, 0, 0)`: Defensive bulwark, guard/intercept mechanics, heavy kinetic displacement.
  * **Infiltrator** `(0, 2, 0)`: High mobility, stealth/evasion, lethal flank strikes.
  * **Sorcerer** `(0, 0, 2)`: Multi-target spell fields, elemental focus, resolve debuffs.
  * **Cavalier** `(2, 1, 0)`, **Berserker** `(2, 0, 1)`, **Witch** `(0, 1, 2)`, etc.
* Progress toward mid-tier hybrid classes (e.g. **Bard** `(3, 3, 3)` at the pyramid centroid).

### 3.2. Status Effects & Modifiers (Introduced on Demand)
* *Architectural Principle*: Implement status conditions only when newly authored abilities require them.
* **Pipeline Integration**:
  * Status effect registry with defined durations, trigger hooks (turn start, on hit, on move, turn end), and stacking rules.
  * Potential initial conditions as demanded by abilities:
    * *Bleed / Poison*: Damage-over-time tick per CTB clock turn.
    * *Stun / Daze*: AP reduction or CTB tick pause.
    * *Fortify / Ward Barrier*: Temporary flat mitigation bonuses.
    * *Root / Cripple*: Movement restriction.

### 3.3. Dynamic Elevation & Verticality (Introduced on Demand)
* *Architectural Principle*: Implement height rules when abilities interact with verticality.
* **Potential Capabilities**:
  * Discrete integer elevation levels (`0, 1, 2...`) on hex tiles.
  * High-ground advantage (hit bonuses or range increases for ranged attacks).
  * Cliff climbing abilities and knockback off ledges with fall impact damage.

### 3.4. Off-Node Level Progression
* Implement compensatory stat surges or perk selection for intermediate levels (e.g. `(1, 1, 0)` at Level 2) that do not possess a unique class node in the 100-class lattice.

---

## 🧊 Deferred / Low-Priority Items

The following areas are intentionally deprioritized until tactical combat, persistence, and core content are fully established:
* **Audio Engine & Sound FX**: Procedural Web Audio API sound effects, ability impact audio, and dice clatter.
* **Visual Juice & 3D Dice**: 3D tumbling dice animations, screen-shake shaders, and particle flourishes.
