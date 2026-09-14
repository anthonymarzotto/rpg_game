# Roadmap: Minimum Path to a Playable Level-0 Character

This document outlines the vertical slice required to get a fully interactive, playable **Level-0 Character** on screen, moving on a tactical grid, executing archetype-tagged actions, and earning XP toward their first class unlock.

Following our core architectural principle (**Decoupled Simulation & Presentation**), every milestone is implemented and verified first as headless TypeScript domain logic with automated tests, then connected to the interactive presentation layer.

---

## The Vertical Slice: "First Blood"

```
┌─────────────────────────────────────────────────────────────┐
│                   INTERACTIVE PRESENTATION                  │
│  - Interactive hex arena (Phaser / React)                   │
│  - Unit token at coordinate (q, r)                          │
│  - Action HUD: [Move] [Strike] [Flank] [Spark] [Wait]       │
│  - Damage floating numbers & Archetype XP gain feedback     │
└──────────────────────────────▲──────────────────────────────┘
                               │ Dispatches Actions / Subscribes to State
┌──────────────────────────────▼──────────────────────────────┐
│                  MINIMAL COMBAT SIMULATION                  │
│  - Turn loop: Active unit turn -> Select Action -> Resolve  │
│  - Move validation: Reachable hexes within Unit.stats.move  │
│  - Action resolution: Hit/Damage formula + XP accumulation  │
└──────────────────────────────▲──────────────────────────────┘
                               │ Operates On
┌──────────────────────────────▼──────────────────────────────┐
│                    SPATIAL & DOMAIN DATA                    │
│  - Hex Grid (Axial q, r math, distance, tile occupancy)     │
│  - Unit Instance (Base stats, Current HP/MP, Level 0 class) │
│  - Starter Ability Kit (1 Fighter, 1 Rogue, 1 Mage action)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Milestones & Minimum Requirements

### Milestone 1: Core Unit Stats Schema
* **Location**: `src/core/types/stats.ts`, `src/core/types/unit.ts`
* **Deliverables**:
  * **Core Stat Block**: Attributes governing survivability (HP), resources (MP), offense (Phys/Mag Attack), mitigation (Phys/Mag Defense), turn frequency (Speed), and spatial mobility (Move).
  * **Unit State Definition**: Concrete representation of an in-game unit combining identity, progression state (`UnitProgression`), base stats, current combat vitals (`currentHp`, `currentMp`), and board placement.
* **Verification**: Vitest tests validating unit instantiation and derived stat calculations.

---

### Milestone 2: Level-0 Class Identity & Starter Ability Kit
* **Location**: `src/core/types/ability.ts`, `src/data/starterKit.ts`
* **Deliverables**:
  * **Class Naming & Identity**: Formal name and lore/thematic identity for the Level-0 recruit.
  * **Ability Contract**: Type definitions for combat actions (`id`, `name`, `archetypeTag`, `range`, `targetType`, `cost`).
  * **Starter Action Trio**:
    1. ⚔️ **Fighter Action**: Melee physical strike generating Fighter XP.
    2. 🗡️ **Rogue Action**: Mobile/flanking physical strike generating Rogue XP.
    3. 🔮 **Mage Action**: Ranged magical attack or cantrip generating Mage XP.
  * **Universal Actions**: `Move` and `Wait/Defend`.
* **Verification**: Unit tests ensuring abilities export correct archetype tags and range parameters.

---

### Milestone 3: Hex Grid Math & Minimal Arena
* **Location**: `src/core/grid/hex.ts`, `src/core/grid/arena.ts`
* **Deliverables**:
  * **Axial Coordinate Math**: Addition, subtraction, distance formula, neighbor lookups for `(q, r)`.
  * **Range Ring & Reach Calculation**: Finding all hexes within range $N$ of a point.
  * **Arena Container**: Simple map layout (e.g. radius-3 hexagon or small arena) with walkable tiles and unit occupancy tracking.
* **Verification**: Vitest test suite covering hex distance, neighbor adjacency, and movement footprint queries.

---

### Milestone 4: Headless Combat Action Resolution
* **Location**: `src/core/combat/resolver.ts`, `src/core/combat/state.ts`
* **Deliverables**:
  * **Action Validator**: Checks whether a selected action is legal (target within range, tile unoccupied for movement, sufficient resource).
  * **Execution Pipeline**:
    * Applying movement (updating unit's hex coordinate).
    * Applying attack damage to a dummy target unit.
    * Awarding archetype XP (Fighter / Rogue / Mage) to the actor based on the executed action's tag.
  * **End Turn / Battle Check**: Concluding a unit's turn and verifying whether XP thresholds trigger Level-1 readiness.
* **Verification**: Headless Vitest simulation running a full mock turn: Unit moves 2 hexes, attacks target with Mage cantrip, deals damage, and receives 1 Mage XP.

---

### Milestone 5: Interactive Visual Testbed (In-Game)
* **Location**: `src/render/` or `src/ui/combat/`
* **Deliverables**:
  * **Hex Grid Rendering**: Interactive canvas/DOM rendering hex cells with hover states.
  * **Unit Visuals**: Rendering the Level-0 recruit token and an enemy target dummy on the grid.
  * **Player Action HUD**:
    * Action bar displaying the starter abilities (`Strike`, `Flank`, `Spark`, `Move`, `Wait`).
    * Click-to-target visual range highlights on the grid.
  * **Live Feedback**: Floating combat text / log showing damage dealt and archetype XP gained.

---

## Current Step Dependency Map

```
[Milestone 1: Core Unit Stats]          <── COMPLETED & TESTED
         │
         ▼
[Milestone 2: Level-0 Starter Kit]      <── COMPLETED & TESTED
         │
         ├────────────────────────────────┐
         ▼                                ▼
[Milestone 3: Hex Grid Math]            [Milestone 4: Combat Resolver] <── (WE ARE HERE)
 (COMPLETED & TESTED)                     │
         │                                │
         └────────────────┬───────────────┘
                          │
                          ▼
            [Milestone 5: Playable Testbed]
```
