# Development Plan & Tactical Roadmap

This document outlines the prioritized implementation phases for the ongoing development of the Hex Tactics RPG. 

Following our core architectural tenet (**Decoupled Simulation & Presentation**), every gameplay mechanic, AI decision model, and data pipeline is implemented and tested first as pure headless TypeScript logic in `src/core/` before integrating with the React + SVG + CSS presentation tier.

---

## 📌 Foundation & Current Milestone Status

* **Core Simulation Engine** (`src/core/`): Axial hex math, pathfinding, raycast Line-of-Sight, knockback displacement, collision damage, CTB clock with unspent AP refund, and Triad Vector resolution ($d20$, Graze, Crit, Armor/Ward soak). *(Complete & Tested)*
* **Class Pyramid & Progression** (`src/core/progression/`, `src/data/classes.ts`): Full 100-class catalog, strict lockout validation, additive archetype point advancement, post-battle reconciliation, and constellation recording. *(Complete & Tested)*
* **Visual Combat Arena & Core Loop** (`src/ui/combat/`): Interactive SVG arena, dynamic action bar, floating combat text, transparent combat log, dev dice sandbox, post-battle victory modal with class unlocks, ability swapping, and arena rematch with persistent progression. *(Complete & Tested)*
* **Unit Loadout & Active Class Architecture** (`src/core/types/`, `src/core/units/`): `PassiveTrait`, `ClassPackage`, `UnitLoadout`, non-redundant `Unit` model with `starterAbilityIds`, in-combat `CombatUnit` hydration, and loadout resolution/validation. *(Complete & Tested)*

---

## 🧭 Prioritized Development Phases

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: ACTIVE CLASS, SKILL LOADOUTS & CROSS-CLASS SLOTS   │
│  - [x] 1.1 Active class & loadout domain model (COMPLETED)  │
│  - [x] 1.2 "1 Signature + 2 Domain Pool" package catalog (COMPLETED) │
│  - [ ] 1.3 Passive trait evaluation pipeline               │
│  - [ ] 1.4 Presentation & loadout management integration   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: TACTICAL COMBAT ENEMY AI & MULTI-UNIT BATTLES      │
│  - Headless AI decision engine (scoring, threat, movement)  │
│  - CTB multi-unit turn sequencing (retiring passive dummies)│
│  - Multi-unit party squads (allied targeting, party HUD)    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: PERSISTENCE & CAMPAIGN FLOW                        │
│  - IndexedDB storage engine (roster, saves, checkpoints)    │
│  - Campaign & encounter progression (multi-battle flow)     │
│  - Between-battle camp / barracks hub                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: CLASS & ABILITY EXPANSION (ON-DEMAND MECHANICS)    │
│  - Tier 2+ class ability kits & signature passives          │
│  - Status effects pipeline (introduced as abilities demand) │
│  - Elevation & verticality (introduced as abilities demand) │
│  - Off-node level compensatory perks / stat surges          │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Active Class, Skill Loadouts & Cross-Class Architecture

**Primary Goal**: Rearchitect unit ability loadouts around an **Active Class** system, where each class provides a complete package (3 active skills + 1 passive), supplemented by customizable **cross-class wildcard slots** drawn from the unit's unlocked constellation history.

### 1.1. Unit Loadout & Active Class Domain Model (`src/core/types/`, `src/core/units/`) <── COMPLETED & TESTED
* **Active Class Designation**:
  * Units select one active class from their unlocked constellation nodes (or Novice if level 0).
  * The active class sets the unit's primary title, in-combat theme, and automatically loads its **Core Kit** (3 class-specific active abilities + 1 innate passive).
* **Cross-Class Wildcard Slots**:
  * Extra customizable slots enabling hybrid build customization:
    * **Active Wildcard Slots** (2 slots): Equip active abilities unlocked from any past class along the unit's constellation path or Novice starter kit.
    * **Passive Wildcard Slot** (1 slot): Equip a passive trait unlocked from any past class in the unit's constellation.
    * Universal actions (`Move`, `Wait / End Turn`) remain baseline options available to all units and are separated from class abilities.
* **Pure Headless Domain Contracts & Resolution**:
  * `Unit` holds `loadout: UnitLoadout` and `starterAbilityIds: readonly string[]` with zero redundant arrays.
  * `CombatUnit` holds in-combat hydrated `abilities` and `passives`.
  * `resolveUnitLoadout()` and `validateUnitLoadout()` implemented with 100% test coverage.

### 1.2. Class Package Architecture ("1 Signature + 2 Domain Pool") <── COMPLETED & TESTED
* **Class Definition Expansion**:
  * Every class definition specifies:
    * **1 Unique Signature Ability**: Bespoke, thematic mechanic exclusive to the class.
    * **2 Archetype/Domain Pool Abilities**: Reusable or tiered abilities pulled from thematic archetype pools (Force/Fighter, Finesse/Rogue, Focus/Mage, and hybrid vector blends).
    * **1 Class Passive Trait**: Persistent combat modifier or conditional trigger.
* **Tier 0 & Tier 1 Reference Implementations**:
  * Fully flesh out and test complete 3-active + 1-passive packages for foundational classes:
    * **Novice** `(0, 0, 0)`: Baseline recruit toolkit.
    * **Warrior** `(1, 0, 0)`: Melee force, armor resilience, kinetic displacement.
    * **Thief** `(0, 1, 0)`: High mobility, precision strikes, flanking lethality.
    * **Wizard** `(0, 0, 1)`: Ranged arcana, spell warding, area disruption.

### 1.3. Passive Trait Evaluation Pipeline (`src/core/combat/`) <── COMPLETED & TESTED
* **Headless Passive System**:
  * Established dedicated headless pipeline (`src/core/combat/passives/`) evaluating passive effects:
    * **Stat Modifiers**: Flat bonuses (`getPassiveStatModifier`) evaluated via `getEffectiveStat` for Armor, Ward, Speed, Move, Evasion, Resolve.
    * **Pre-Attack Roll Modifiers**: Distance-triggered advantages (`evaluateRollPassives`) like `Momentum` (+Advantage when moving 2+ hexes, consumed on attack).
    * **Turn Lifecycle Hook**: `onTurnStartPassives` resetting turn-scoped state (e.g. `hexesMovedThisTurn`) in `turnClock.ts`.
* **Testing & Verification**:
  * Dedicated test suite (`src/core/combat/passives.test.ts`) verifying cross-class wildcard passive stacking (Warrior + Momentum, Thief + Unyielding, Wizard + Quickstep) and turn clock integration with 100% pass rate.

### 1.4. Presentation & Loadout Management Integration (`src/ui/`)
* **Action Bar Adaptation**:
  * Render the expanded active combat deck (Core Class abilities + equipped Wildcards) alongside universal Move/Wait actions with clear visual grouping.
* **Unit Inspector & Tooltips**:
  * Display active passives on unit cards and combat preview inspectors.
* **Post-Battle & Loadout UI**:
  * Update post-battle flow and victory modal to support selecting an Active Class and configuring Wildcard ability/passive slots upon unlocking new classes.

---

## Phase 2: Tactical Combat Enemy AI & Multi-Unit Battles

**Primary Goal**: Transform the arena from a target-dummy sandbox into a genuine tactical skirmish engine with intelligent hostile behavior and multi-unit squad dynamics.

### 2.1. Headless AI Decision Engine (`src/core/ai/`)
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

### 2.2. Asynchronous CTB Multi-Unit Sequencing
* **Eliminate Passive Dummy Stepping**:
  * Retire `autoAdvancePassiveDummies` in favor of full asynchronous CTB turn scheduling where hostile units accumulate gauge and claim active turns naturally.
* **Turn Notification & Execution Dispatch**:
  * UI state engine coordinates enemy turn pacing (e.g., brief action pauses so players can follow enemy movements, strikes, and floating combat text).
  * Dev toggles for AI step speed (instant for testing, paced for gameplay).

### 2.3. Multi-Unit Party & Squad Combat
* **Party Roster in Combat**:
  * Support for 2–3 player-controlled units fighting alongside each other against enemy squads.
  * Turn handoff seamlessly shifts player control to whichever allied unit reaches 100 CTB gauge.
* **Targeting Expansion**:
  * Friendly targeting support for buffs, heals, shields, and positioning maneuvers.
* **Squad Arena UI Enhancements**:
  * Active unit indicator and dynamic reticles distinguishing player allies from enemies.
  * Initiative queue tracker showing upcoming turn order along the CTB timeline.

---

## Phase 3: Client Persistence & Campaign Flow

**Primary Goal**: Enable persistent progression, roster management, and multi-encounter campaigns across browser sessions.

### 3.1. IndexedDB Storage Architecture (`idb-keyval`)
* **Serialization Contracts**:
  * **Party & Unit State**: Base attributes, accumulated archetype points, completed constellation path, unlocked classes, designated active class, and equipped wildcard abilities/passives.
  * **Session Checkpoint / Suspend State**: Exact mid-battle serialization allowing players to refresh or leave the browser and resume in-progress combat.
  * **Settings & Preferences** (`localStorage`): Combat text speed, dice display preferences, and UI options.
  * **Portable Save Export/Import**: JSON export and import mechanism for backup and portability.
* **Testing**: Headless unit tests verifying round-trip serialization and schema migrations.

### 3.2. Campaign & Multi-Encounter Progression Flow
* **Encounter Progression Graph**:
  * Structure encounters into sequential battles, gauntlets, or branching node maps with scaling difficulty and objective types.
* **Post-Battle Camp / Barracks Hub**:
  * Transition from the battle victory modal into a dedicated camp screen between encounters.
  * Inspect party members, review constellations, allocate earned archetype points, set active classes, and customize equipped ability/passive wildcard slots from the unlocked pool.
  * Prepare and select party loadouts for the next deployment.

---

## Phase 4: Class & Ability Content Expansion (With On-Demand Systems)

**Primary Goal**: Deepen tactical variety by authoring Tier 2+ classes and introducing combat mechanics organically as specific abilities demand them.

### 4.1. Tier 2+ Class Kits & Archetype Trees
* Author bespoke active ability loadouts and passive mastery traits for Tier 2 classes using the 1 Signature + 2 Domain Pool model:
  * **Knight** `(2, 0, 0)`: Defensive bulwark, guard/intercept mechanics, heavy kinetic displacement.
  * **Infiltrator** `(0, 2, 0)`: High mobility, stealth/evasion, lethal flank strikes.
  * **Sorcerer** `(0, 0, 2)`: Multi-target spell fields, elemental focus, resolve debuffs.
  * **Cavalier** `(2, 1, 0)`, **Berserker** `(2, 0, 1)`, **Witch** `(0, 1, 2)`, etc.
* Progress toward mid-tier hybrid classes (e.g. **Bard** `(3, 3, 3)` at the pyramid centroid).

### 4.2. Status Effects & Modifiers (Introduced on Demand)
* *Architectural Principle*: Implement status conditions only when newly authored abilities require them.
* **Pipeline Integration**:
  * Status effect registry with defined durations, trigger hooks (turn start, on hit, on move, turn end), and stacking rules.
  * Potential initial conditions as demanded by abilities:
    * *Bleed / Poison*: Damage-over-time tick per CTB clock turn.
    * *Stun / Daze*: AP reduction or CTB tick pause.
    * *Fortify / Ward Barrier*: Temporary flat mitigation bonuses.
    * *Root / Cripple*: Movement restriction.

### 4.3. Dynamic Elevation & Verticality (Introduced on Demand)
* *Architectural Principle*: Implement height rules when abilities interact with verticality.
* **Potential Capabilities**:
  * Discrete integer elevation levels (`0, 1, 2...`) on hex tiles.
  * High-ground advantage (hit bonuses or range increases for ranged attacks).
  * Cliff climbing abilities and knockback off ledges with fall impact damage.

### 4.4. Off-Node Level Progression
* Implement compensatory stat surges or perk selection for intermediate levels (e.g. `(1, 1, 0)` at Level 2) that do not possess a unique class node in the 100-class lattice.

---

## 🧊 Deferred / Low-Priority Items

The following areas are intentionally deprioritized until tactical combat, persistence, and core content are fully established:
* **Audio Engine & Sound FX**: Procedural Web Audio API sound effects, ability impact audio, and dice clatter.
* **Visual Juice & 3D Dice**: 3D tumbling dice animations, screen-shake shaders, and particle flourishes.
