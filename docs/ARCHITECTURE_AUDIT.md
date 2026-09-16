# Architecture & Specification Audit

This document records the comprehensive architectural sweep conducted across the codebase, identifying tight couplings, monolithic components, and deviations from specifications in `docs/`.

---

## 1. Tight Couplings That Should Be Decoupled

The following components exhibit unnecessary or rigid coupling that impedes testing, modularity, and future feature extension:

| Subsystem / Coupling | Location | What Is Coupled | Recommended Decoupling |
| :--- | :--- | :--- | :--- |
| **`useCombatSimulation` $\leftrightarrow$ Static Encounter** | [`src/ui/combat/useCombatSimulation.ts`](file:///c:/Repos/rpg_game/src/ui/combat/useCombatSimulation.ts#L72-L115) | The combat controller hook embeds `buildTestEncounter`, hardcoding 4 specific training dummies (`dummy-a` through `dummy-d`), player ID `'player'`, and rock obstacle at `(0, 2)`. | Extract an `EncounterDefinition` contract and factory. `useCombatSimulation` should receive any encounter state or factory instead of hardcoding its own. |
| **`HexGridSvg` $\leftrightarrow$ Hardcoded Grid Assumptions** | [`src/ui/combat/HexGridSvg.tsx`](file:///c:/Repos/rpg_game/src/ui/combat/HexGridSvg.tsx#L65-L74) | 1. Hardcodes `radius = 3` instead of querying the arena's actual tiles.<br>2. Hardcodes `unitId === 'player'` for token styling ([line 220](file:///c:/Repos/rpg_game/src/ui/combat/HexGridSvg.tsx#L220)) instead of checking `cu.faction === 'PLAYER'`.<br>3. Hardcodes `"PILLAR"` text on unwalkable tiles. | 1. Read tile coordinates directly from `state.arena.getTile()` or an `arena.getAllTiles()` method.<br>2. Style tokens based on `cu.faction`.<br>3. Read obstacle labels and terrain types from tile metadata. |
| **Core Progression $\leftrightarrow$ Master Data Catalog** | [`src/core/progression/pyramid.ts`](file:///c:/Repos/rpg_game/src/core/progression/pyramid.ts#L2) | Core domain logic (`src/core/`) directly imports `CLASSES_BY_COORD` from `src/data/classes.ts`. | Core progression rules should operate on an injected class catalog or registry, keeping `src/core/` pure and agnostic to specific game data files. |
| **Unit Factory $\leftrightarrow$ Novice Ability Kit** | [`src/core/units/unitFactory.ts`](file:///c:/Repos/rpg_game/src/core/units/unitFactory.ts#L6) | `createRecruit` directly imports `rollNoviceAbilityKit` from `src/data/abilities`. | Pass an optional starter kit generator function via options (dependency injection), keeping factory logic cleanly separated from static ability tables. |
| **Type Contracts $\leftrightarrow$ Runtime Stat Computations** | [`src/core/combat/types.ts`](file:///c:/Repos/rpg_game/src/core/combat/types.ts#L154-L192) | `types.ts` defines runtime computation functions (`getEffectiveStat`, `getEffectiveSpeed`, `getEffectiveMove`, etc.) alongside interfaces. | Move runtime getters into `src/core/units/vitals.ts` or a dedicated `effectiveVitals.ts`. `types.ts` should remain a pure type-definition contract. |
| **Arena Sandbox $\leftrightarrow$ Constellation Progression** | [`src/App.tsx`](file:///c:/Repos/rpg_game/src/App.tsx#L53-L56) | The recruit fighting in the Arena and the recruit leveling in the Constellation Chart are completely isolated, disconnected local states. | XP earned in combat currently has no path to unlock classes on the pyramid. A shared unit state model is needed to connect combat XP to constellation unlocks. |

---

## 2. Monolith-Style Scripts & Functions to Break Down

Several files have accumulated multiple responsibilities and should be refactored into smaller, focused modules:

### A. `useCombatSimulation.ts` (600 lines, 18.3 KB) — The "God Hook"
Currently manages 8 distinct responsibilities simultaneously:
1. **Mock Encounter Setup**: `buildTestEncounter` creates units, stats, and obstacles.
2. **Dev Tools**: `DevDiceRoller` class with force-crit/miss logic.
3. **Action State Machine**: `IDLE` $\leftrightarrow$ `MOVE` $\leftrightarrow$ `ABILITY` selection transitions.
4. **Range & Targeting Footprint**: Filtering candidate targets and calculating in-range hexes.
5. **Target Preview Projections**: Math for hit chance, mitigation, and min/max damage preview.
6. **Turn Clock & Passive AI**: Advancing turns and skipping dummy turns.
7. **Floating Text Lifecycle**: Spawning floating text tokens and scheduling cleanup timeouts.
8. **Sandbox Actions**: Resetting encounter and rerolling starter abilities.

* **Proposed Breakdown**:
  * Extract `src/ui/combat/useFloatingCombatText.ts` (queue, cleanup timer, dispatch).
  * Extract `src/core/combat/targetPreview.ts` (headless pure function calculating hit chance and damage range).
  * Extract `src/data/encounters/testEncounter.ts` (encounter factory outside the UI hook).
  * Keep `useCombatSimulation.ts` strictly focused on combat loop orchestration.

### B. `combat.test.ts` (700+ lines, 28 KB) — Monolith Test Suite
A single monolithic integration test file testing 6 different subsystems:
1. Grid movement & AP deduction.
2. Attack resolution outcomes (Solid, Graze, Crit, Miss, Minimum damage).
3. Secondary effects & collisions (Knockback, collision damage, bystander damage, retreat step, slow, armor/ward buffs).
4. CTB turn clock advancement & unspent AP gauge refund.
5. Action targeting validation (LoS, range, ally/enemy faction filters).
6. Decoupled attack roll and damage modifier attributes.

* **Proposed Breakdown**:
  * `src/core/combat/movement.test.ts`
  * `src/core/combat/turnClock.test.ts`
  * `src/core/combat/actionValidation.test.ts`
  * `src/core/combat/resolution.test.ts`
  * `src/core/combat/displacement.test.ts`

### C. `ClassInspector.tsx` (340 lines, 10.7 KB)
Contains the class inspector modal header, 9-tier level-up simulation buttons, eligibility status, archetype requirements breakdown, full 9-step traversal history, and class perks summary.
* **Proposed Breakdown**: Extract `LevelUpSimulator.tsx` and `ConstellationHistory.tsx`.

### D. `resolver.ts` (400 lines, 12.3 KB)
While attack rolls, damage, and effects were recently modularized, `resolver.ts` still holds:
* `canMove` & `executeMove`
* `canExecuteAbility` (80 lines of action validation logic)
* `applyCombatEvents` (atomic state mutation pipeline)
* `executeAbility` (combat coordinator)
* **Proposed Breakdown**: Extract `canExecuteAbility` and `canMove` into `src/core/combat/validator.ts`.

---

## 3. Deviations from the Files in `docs/`

Comparison of active code against the specification documents in `docs/`:

| Document | Documented Specification | Current Implementation | Severity |
| :--- | :--- | :--- | :---: |
| [`ARCHITECTURE.md`](file:///c:/Repos/rpg_game/docs/ARCHITECTURE.md#L19-L23) | **Render Layer**: Specifies **Phaser 3** for 2D canvas/WebGL rendering, sprite animations, camera panning, and WebAudio. | **Pure SVG**: Rendered entirely via React SVG components ([`HexGridSvg.tsx`](file:///c:/Repos/rpg_game/src/ui/combat/HexGridSvg.tsx), [`ConstellationSvg.tsx`](file:///c:/Repos/rpg_game/src/ui/pyramid/ConstellationSvg.tsx)). Phaser is in `package.json` but never imported or used. | **High** (Architectural direction decision needed) |
| [`ARCHITECTURE.md`](file:///c:/Repos/rpg_game/docs/ARCHITECTURE.md#L77-L81) | **State Bridge**: Specifies **Zustand** as the centralized state store connecting simulation, Phaser, and React. | **React `useState`**: Zero Zustand stores exist; state is isolated inside local component hooks. | **Medium** (Impacting cross-component state flow) |
| [`ARCHITECTURE.md`](file:///c:/Repos/rpg_game/docs/ARCHITECTURE.md#L89) | **Persistence**: Specifies client-side save state storage via **IndexedDB** (`idb-keyval`). | Persistence is not yet wired up; all battle and progression state resets on page refresh. | **Low** (Deferred feature) |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L151-L155) | **Positional Modifiers**: Specifies Flanking ($+2$ or Advantage), Rear Strikes ($+4$ / Crit Boost), and High Ground ($+1$ die face / range). | **Not Implemented**: [`attackRoll.ts`](file:///c:/Repos/rpg_game/src/core/combat/attackRoll.ts) only rolls $d20 + \text{modifier}$ vs defense; facing, adjacent allies, and elevation bonuses are not yet factored in. | **Medium** (Missing gameplay layer) |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L168-L179) | **Dual-Layer Presentation**: Specifies visual tumbling 2D/3D dice on screen and audio clatter for rolls. | Combat rolls are calculated instantaneously with no visual dice animations or audio SFX. | **Low** (Visual polish) |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L98) | **Action Economy Limits**: Specifies special/heavy skills (2–3 AP) carry a "Once per Turn" limit or short cooldown. | `Ability` has no `cooldown` or `oncePerTurn` contract; [`canExecuteAbility`](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts#L141) only checks if the unit has enough AP. | **Medium** (Action economy limit) |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L120-L148) | **Combat Resolution Diagram**: Diagram shows implicit physical=finesse, spell=focus. | Code explicitly declares `attackModifierAttribute` on every ability contract. | **Low** (Doc sync needed) |
| [`PLAYABLE_CHARACTER_ROADMAP.md`](file:///c:/Repos/rpg_game/docs/PLAYABLE_CHARACTER_ROADMAP.md#L49-L73) | **File Paths**: Lists Milestone 2 as `src/data/starterKit.ts` and Milestone 4 as `src/core/combat/state.ts`. | Actual paths in codebase are `src/data/abilities/novice.ts` and `src/core/combat/types.ts`. | **Low** (Doc maintenance) |

---

## 4. Suggested Alignment & Action Plan

1. **Presentation Tier Decision**:
   * Formally decide whether to retain the lightweight **React SVG** renderer and update `ARCHITECTURE.md`, or plan the transition to **Phaser 3**.
2. **Decompose `useCombatSimulation.ts`**:
   * Move target preview calculations into `src/core/combat/targetPreview.ts`.
   * Separate floating text management into `useFloatingCombatText.ts`.
   * Move encounter generation into `src/data/encounters/`.
3. **Bridge Combat XP to Progression**:
   * Introduce a shared state store (or Zustand) so actions executed in the Tactical Arena award XP to the unit and allow leveling in the Constellation Chart.
4. **Update Outdated Docs**:
   * Sync `GAMEPLAY.md` with explicit `attackModifierAttribute`.
   * Update file paths in `PLAYABLE_CHARACTER_ROADMAP.md`.
