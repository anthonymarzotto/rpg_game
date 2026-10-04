# Development Plan & Tactical Roadmap

This document outlines the prioritized implementation phases for the ongoing development of Astral Tactics. 

Following our core architectural tenet (**Decoupled Simulation & Presentation**), every gameplay mechanic, AI decision model, and data pipeline is implemented and tested first as pure headless TypeScript logic in `src/core/` before integrating with the React + SVG + CSS presentation tier.

---

## 📌 Foundation & Current Milestone Status

* **Core Simulation Engine** (`src/core/`): Axial hex math, pathfinding, raycast Line-of-Sight, knockback displacement, collision damage, CTB clock with unspent AP refund, and Triad Vector resolution ($d20$, Graze, Crit, Armor/Ward soak). *(Complete & Tested)*
* **Class Pyramid & Progression** (`src/core/progression/`, `src/data/classes.ts`): Full 100-class catalog, strict lockout validation, additive archetype point advancement, post-battle reconciliation, and constellation recording. *(Complete & Tested)*
* **Visual Combat Arena & Core Loop** (`src/ui/combat/`): Interactive SVG arena, dynamic action bar, floating combat text, transparent combat log, dev dice sandbox, post-battle victory modal with class unlocks, ability swapping, and arena rematch with persistent progression. *(Complete & Tested)*
* **Unit Loadout & Active Class Architecture** (`src/core/types/`, `src/core/units/`): `PassiveTrait`, `ClassPackage`, `UnitLoadout`, non-redundant `Unit` model with `starterAbilityIds`, in-combat `CombatUnit` hydration, and loadout resolution/validation. *(Complete & Tested)*
* **Directional Facing & Combat Arcs** (`src/core/grid/`, `src/core/combat/`, `src/ui/combat/`): True directional facing (`HexDirection` 0..5), combat arc classification (`FRONT`, `FLANK`, `REAR`), dynamic facing updates, flank/rear advantage resolution, and directional token chevrons. *(Complete & Tested)*
* **Multi-Unit Squad Combat & CTB Timeline** (`src/core/combat/`, `src/ui/combat/`): 3-hero squad party, asynchronous CTB turn order lookahead ribbon, friendly targeting, and squad wipe defeat conditions. *(Complete & Tested)*
* **Tactical Enemy AI Decision Engine** (`src/core/ai/`): Pure domain logic, composite move-and-act evaluation, dynamic archetype heuristics (Brawler, Skirmisher, Sniper, Support), finishing blow priority, defensive vulnerability targeting, flanking navigation, and CTB AP conservation. *(Complete & Tested)*
* **Camp & Barracks Progression Hub** (`src/core/campaign/`, `src/ui/camp/`, `src/ui/start/`): Screen flow (`StartScreen` -> `CampHub` -> `CombatArena` -> Victory/Defeat reconciliation -> Return to Camp), Active Vanguard dock, Reserve Barracks tray with smart swapping & recruitment, Expedition War Room threat briefings, and two-column Deep Progression constellation dashboard. *(Complete & Tested)*

---

## 🧭 Prioritized Development Phases

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: ACTIVE CLASS, SKILL LOADOUTS & TACTICAL FACING     │
│  - [x] 1.1 Active class & loadout domain model (COMPLETED)  │
│  - [x] 1.2 "1 Signature + 2 Domain Pool" packages (COMPLETED)│
│  - [x] 1.3 Passive trait evaluation pipeline (COMPLETED)    │
│  - [x] 1.4 Presentation & loadout integration (COMPLETED)   │
│  - [x] 1.5 Directional facing & combat arcs (COMPLETED)     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: TACTICAL COMBAT ENEMY AI & MULTI-UNIT BATTLES      │
│  - [x] 2.1 Headless AI decision engine (COMPLETED)          │
│  - [x] 2.2 CTB multi-unit turn sequencing & pacing (COMPLETED)│
│  - [x] 2.3 Multi-unit party squads & allied targeting (COMPLETED)│
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: CAMPAIGN PROGRESSION & CLIENT PERSISTENCE          │
│  - [x] 3.1 Campaign & roster domain model (COMPLETED)       │
│  - [x] 3.2 Camp / barracks hub & deployment loop (COMPLETED)│
│  - [x] 3.3 Client persistence & save management (COMPLETED) │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: CLASS & ABILITY EXPANSION (ON-DEMAND MECHANICS)    │
│  - [ ] 4.1 Tier 2+ class ability kits & signature passives  │
│  - [ ] 4.2 Status effects pipeline (as abilities demand)    │
│  - [ ] 4.3 Elevation & verticality (as abilities demand)    │
│  - [ ] 4.4 Off-node level compensatory perks / stat surges  │
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

### 1.4. Presentation & Loadout Management Integration (`src/ui/`) <── COMPLETED & TESTED
* **Action Bar Adaptation**:
  * Rendered the expanded active combat deck with clear visual grouping:
    * Core Class abilities (Signature + 2 Domain, or 3 Starter abilities) styled with archetype themes.
    * Wildcard abilities visually separated by a deck divider with a distinct "Wildcard" ribbon.
    * Real-time Passives Tray adjacent to the AP counter displaying active passives and advantage readiness (e.g. Momentum glowing when $\ge 2$ hexes moved).
* **Unit Inspector & Tooltips**:
  * Dynamic role titles (`Level X <Class Name>`) replacing hardcoded labels.
  * Active Passives chip row on player and inspected unit status cards with full hover tooltips.
  * Target Preview displays `✦ Advantage (Momentum)` when a passive condition is met.
* **Post-Battle & Loadout UI**:
  * Integrated Loadout Customizer in `BattleVictoryModal`:
    * Active Class selector pills (Novice + unlocked constellation classes).
    * Core Class Deck preview (3 locked abilities + innate passive).
    * Strict slot selectors for 2 Wildcard abilities and 1 Wildcard passive, structurally guaranteed valid by filtering out core/innate and duplicate abilities.
    * Rematch button instantly carries over configured loadout to restart the encounter with the updated class and wildcards.

### 1.5. Directional Facing & Combat Arcs (`src/core/grid/`, `src/core/combat/`, `src/ui/combat/`) <── COMPLETED & TESTED
* **Pure Directional Hex Model**:
  * Pointy-topped hex directions (`0..5`: East, Northeast, Northwest, West, Southwest, Southeast) with exact SVG rotation mappings.
  * Headless `getDirectionBetween(from, to)` computes directional vectors from Cartesian coordinates using `atan2`.
  * `CombatArc = 'FRONT' | 'FLANK' | 'REAR'` cleanly categorizes target relative angles:
    * Front: 180° forward arc (relative indices 0, 1, 5)
    * Flank: lateral side hexes (relative indices 2, 4)
    * Rear: 180° blind spot (relative index 3)
* **Tactical Flanking & Sneak Attack Resolution**:
  * `isFlankOrRear` strictly checks if the attacker is in the target's Flank or Rear arc, OR if an ally of the attacker is engaged (Allied Pincer).
  * Synthetic obstacle/wall pin was completely retired.
  * Sneak Attack calculates Advantage and +1d6 precision damage upon striking from flank/rear.
* **Visual Presentation & Dynamic Facing**:
  * Units update facing dynamically upon moving (`executeMove`) or executing abilities towards targets (`executeAbility`).
  * `HexGridSvg` renders directional chevrons on tokens rotated to the unit's facing.
  * Target Preview HUD displays `✦ Flank (+1d6)` or `✦ Rear (+1d6)` advantage indicator.

---

## Phase 2: Tactical Combat Enemy AI & Multi-Unit Battles

**Primary Goal**: Transform the arena from a target-dummy sandbox into a genuine tactical skirmish engine with intelligent hostile behavior and multi-unit squad dynamics.

### 2.1. Headless AI Decision Engine (`src/core/ai/`) <── COMPLETED & TESTED
* **Core Responsibilities**: Pure domain logic that takes current `CombatState` and active enemy `unitId`, and returns a sequence of executable actions for that unit's turn (`decideNextAction` / `executeAiTurn`).
* **Evaluation & Scoring Heuristics**:
  * **Target Prioritization**: Evaluates candidate targets factoring finishing blows (lethal damage threshold bonus), defensive vulnerabilities (Evasion vs Kinetic, Resolve vs Magic), and injured target focus fire.
  * **Tactical Positioning**:
    * Melee units navigate toward optimal engagement tiles, seeking flanking and rear combat arc angles for Sneak Attack advantage.
    * Ranged and caster units maintain standoff distance (preferred range 2–3) while preserving clear Line-of-Sight.
  * **AP Allocation & Execution**:
    * Evaluates composite move-and-act options against 3 AP budget.
    * Conserves unspent AP to bank the +20 CTB gauge refund when actions fall below baseline utility threshold.
* **Testing & Verification**: 7 headless Vitest simulations verifying deterministic AI behavior, vulnerability targeting, flanking, standoff range, AP conservation, seeded dice tie-breaking, and multi-action turn execution without rendering components.

### 2.2. Asynchronous CTB Multi-Unit Sequencing (`src/core/ai/`, `src/ui/combat/`) <── COMPLETED & TESTED
* **Eliminate Synchronous Hostile Turn Loops**:
  * Retired synchronous batch execution in favor of full asynchronous CTB turn scheduling where hostile units accumulate gauge and claim active turns naturally.
* **Extensible Headless Sequencer & DRY Action Execution**:
  * Extracted pure `executeAiAction` in `src/core/ai/decisionEngine.ts` returning structured `AIActionResult` and `AbilityResolution`.
  * Implemented headless, event-driven `executeHostileTurnAsync` in `src/ui/combat/asyncTurnSequencer.ts` using `CombatExecutionObserver` and `AbortSignal` cancellation for safe lifecycle management.
* **Turn Notification, HUD Banner & Execution Dispatch**:
  * Dedicated `EnemyTurnBanner` replaces the player's Action Bar during hostile turns, rendering the enemy's standee portrait, real-time action description (e.g. *"Bandit Skirmisher B attacks Alden with Throw Dart"*), and hostile AP pips while strictly locking player inputs.
  * Direct action execution with sustained feedback pause: applies actions immediately, fires floating combat text (hits, crits, grazes, misses, knockback), and holds for step delay so players can observe each hostile maneuver.
  * Added 3-tier dev speed controls (`1x` 600ms, `2x` 200ms, `Instant` 0ms) in the testbed bar, with a 400ms turn-transition pause between consecutive active combatants.
  * Dev dice overrides isolated to player actions; hostile units always roll standard fair dice.
* **Battle Defeat Flow**:
  * Added `BattleDefeatModal` when all squad members fall in combat (`outcome === 'DEFEAT'`), pausing combat and offering a "Retry Skirmish" rematch button.

### 2.3. Multi-Unit Party & Squad Combat (`src/core/combat/`, `src/ui/combat/`, `src/data/encounters/`) <── COMPLETED & TESTED
* **Party Roster in Combat**:
  * Deployed an authentic 3-member Level 1 squad: Alden (Warrior), Lyra (Thief), and Vael (Wizard) with full 5-ability combat decks (3 Core + 2 Novice Wildcards) and 2 passives (Innate + Momentum).
  * Smooth turn handoff shifting player command to whichever allied hero reaches 100 CTB gauge.
  * Extracted shared `stepClockUntilReady` engine function to eliminate code duplication between runtime clock advancement and turn lookahead.
* **CTB Initiative Queue Ribbon**:
  * Implemented pure, non-mutating `predictTurnOrder(state, 8)` projecting upcoming turns along the timeline.
  * Rendered `InitiativeRibbon` below header displaying faction-coded chips (cyan for party, crimson for enemies), animated golden halo on active turn, and natural speed lapping.
* **Targeting & Visual Distinction**:
  * Full friendly targeting support (`targetType: 'ALLY'`) allowing abilities like *Minor Ward* to buff teammates.
  * Emerald reticles for ally buffs vs amber/red reticles for hostile attacks.
  * Radiant golden halo and dynamic AP pips under active player unit.
* **Squad Defeat & Multi-Unit Victory Flow**:
  * Evaluated squad wipe defeat condition (defeat only when all player units are defeated) and declarative `FACTION_DEFEATED` encounter objective.
  * Added squad member tabs in `BattleVictoryModal` for individual XP review, archetype choices, and loadout customization.

---

## Phase 3: Campaign Progression & Client Persistence

**Primary Goal**: Establish a coherent multi-encounter campaign loop with a dedicated Camp/Barracks hub for squad progression, backed by client persistence across browser sessions.

### 3.1. Campaign & Roster Domain Model (`src/core/campaign/`) <── COMPLETED & TESTED
* **Pure Campaign Domain Architecture**:
  * `CampaignState`: Active campaign metadata, player roster (`Unit[]`), unlocked progression milestones, and active campaign stage.
  * **Encounter Progression Graph**:
    * Structured progression across sequential battles or branching nodes with scaling enemy squad compositions and objectives.
    * Encounter definitions decoupled from presentation, taking in the player's persistent roster and returning battle definitions.
  * **Campaign State Transitions**:
    * Clean transition lifecycle: `Camp` -> `Deployment` -> `Encounter` -> `Victory / Defeat Reconciliation` -> `Return to Camp`.
    * Unit progression carries over: XP, archetype point allocation, unlocked classes, and loadouts directly update the persistent roster.
* **Testing & Verification**:
  * Headless Vitest suite validating campaign creation, roster progression across multi-battle sequences, and victory/defeat state handling.

### 3.2. Camp / Barracks Hub & Progression Loop (`src/ui/camp/`) <── COMPLETED & TESTED
* **Campaign Screen Flow & Lifecycle**:
  * **Start Screen**: Root entry view supporting `New Game` (initializes fresh campaign with starter Novices) and `Continue` (resumes persistent campaign state).
  * **Unified Game Loop**: `Start Screen` -> `Camp Hub` -> `Tactical Combat Arena` -> `Victory / Defeat Reconciliation` -> `Return to Camp`.
  * **Defeat Flow**: Combat defeat **always** returns the party to Camp (no in-arena rematch on squad wipe; prompts tactical reconsideration, hero rotation, or ability re-speccing before re-deploying).
* **Camp Information Architecture ("Active Squad Dock + Reserve Drawer")**:
  * **Active Vanguard (Top / Main Dock)**: High-prominence hero cards for the active 1–3 units who just fought, displaying accumulated XP progress, glowing `✦ LEVEL READY` alerts, quick loadout adjustments, and swap actions.
  * **Reserve Barracks (Bottom / Expandable Tray)**: Scalable, filterable tray supporting uncapped roster growth (filters: *All*, *Level Ready*, *Class*, *Level*) with 1-click swap into active slots.
  * **Expedition Briefing & War Room (Side Panel)**: Real-time stage overview displaying stage index, threat budget, detected enemy composition (rendered via pixel token chips), active squad summary, and `[ DEPLOY SQUAD ]` action.
  * **Deep Progression Drawer**: Inspecting a hero or clicking Level Up slides in the Constellation Pyramid and wildcard loadout customizer in a focused overlay/drawer.
* **Aesthetic System & Token Standardization**:
  * **Pixel Art Primary**: Standardize on pixel art sprite tokens (`public/assets/tokens/pixel/`) as the game's primary token visual identity, deprecating legacy standees and using vector badges purely as a graceful fallback.
  * **Design Tokens & Architecture**: Introduce centralized design tokens (`DESIGN.md` and CSS variables) for dark celestial glassmorphism, archetype colors (Force/Finesse/Focus), and typography to enable clean aesthetic customization and drop-in asset slots.

### 3.3. Client Persistence & Save Management (`src/core/storage/`) <── COMPLETED & TESTED
* **Multi-Slot Persistence & Save Management**:
  * Headless storage manager utilizing IndexedDB (`idb-keyval`) across 3 fixed save slots (`slot-1`, `slot-2`, `slot-3`).
  * Structured `SaveEnvelope` format with versioning (`version: 1`), saved timestamp, slot binding, and campaign payload.
  * Strict version checking with instant invalidation on incompatible saves (no complex migration overhead during active development).
  * Lightweight slot metadata summary extraction for instant Start Screen slot card rendering without full roster deserialization.
  * Dedicated `[ ✦ Save Expedition ]` button in the Camp Hub header providing manual save triggers with immediate `✦ Saved!` visual confirmation.
  * Portable JSON Save Export/Import supporting file download and upload into empty slots.
  * Start Screen integration with dynamic `✦ Resume Expedition`, auto-allocation of first open slot on `✦ New Astral Expedition`, capacity blocking when all 3 slots are occupied, and an interactive `SaveSlotDrawer` for managing archives.
* **Testing & Verification**:
  * Headless Vitest suites (`saveManager.test.ts`, `exportImport.test.ts`, `StartScreen.test.tsx`, `SaveSlotDrawer.test.tsx`, `CampHub.test.tsx`) validating multi-slot saves, loads, slot deletions, corrupted version rejection, JSON round-trips, and UI integration.

---

## Phase 4: Class & Ability Content Expansion (With On-Demand Systems)

**Primary Goal**: Deepen tactical variety by authoring Tier 2+ classes and introducing combat mechanics organically as specific abilities demand them.

### 4.1. Tier 2 Pure Archetype Classes & Status Conditions (`src/data/packages/`, `src/core/combat/`) <── COMPLETED & TESTED
* **Pure Tier 2 Class Kits Authoring**:
  * Author bespoke active ability loadouts and passive mastery traits for pure Tier 2 classes using the 1 Signature + 2 Domain Pool model:
    * **Knight** `(2, 0, 0)`: Leader & Controller identity (`Lead the Charge` friendly AoE aura, `Challenging Shout` forced facing taunt, `Pommel Strike` CTB delay, `Tactical Vanguard` +25 pre-encounter initiative).
    * **Infiltrator** `(0, 2, 0)`: Saboteur / Stealth / DoT identity (`Expose Weakness` multi-stat debuff, `Smoke Veil` stealth condition, `Toxic Shiv` poison DoT, `Elusive Stride` on-move evasion boost).
    * **Sorcerer** `(0, 0, 2)`: Metamagic & Wild Magic identity (`Spell Sculpt` range/AoE priming, `Ignite` burn DoT, `Gust` kinetic push, `Wild Surge` spontaneous on-crit 1d3 surges).
* **On-Demand Combat Engine Infrastructure**:
  * `ActiveCondition` model with mandatory `sourceUnitId` for accurate attribution, DoT resolution, and tactical challenge enforcement.
  * Turn clock DoT processing (`POISON`, `BURN`) at turn start before AP grant with clean defeat termination.
  * Pluggable `ctbDelayHandler` with gauge floored at 0.
  * Friendly AoE buff aura resolution for `damageType: 'NONE'` abilities.
  * Ephemeral `pendingAbilityModifier` with automatic consumption on spell cast and purge on turn end.
  * Tactical combat advantage/disadvantage integration for `STEALTH` and `CHALLENGED`.
* **AI, Campaign, & Presentation Systems Integration**:
  * AI profile mapping (`knight` -> `SUPPORT`, `infiltrator` -> `SKIRMISHER`, `sorcerer` -> `SNIPER`) and Spell Sculpt primer heuristics in `heuristics.ts`.
  * Procedural enemy encounter generation (`encounterGenerator.ts`) spawning Tier 2 units at Stage 3+ for 40 threat budget.
  * Pixel token asset whitelisting for Knight (`02_human_male`), Infiltrator (`82_human_male`), and Sorcerer (`98_human_male`).
* **Testing & Verification**:
  * Comprehensive test suites (`tier2Integration.test.ts`, `tier2ProgressionIntegration.test.ts`, `tier2Mechanics.test.ts`, `ctbDelayHandler.test.ts`, `conditionHandler.test.ts`) validating recruit promotion to Tier 2 in Camp, loadout validation, pre-encounter setups, and battle resolution with 100% test pass rate across 44 suites.

### 4.2. Tier 2+ Hybrid Classes & Centroid Classes (Next)
* Author hybrid classes (e.g. **Cavalier** `(2, 1, 0)`, **Berserker** `(2, 0, 1)`, **Witch** `(0, 1, 2)`) and mid-tier centroid classes (e.g. **Bard** `(3, 3, 3)`).

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
