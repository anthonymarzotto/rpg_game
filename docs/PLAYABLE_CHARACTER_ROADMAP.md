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
* **Location**: `src/core/types/ability.ts`, `src/data/abilities/`
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
* **Location**: `src/core/combat/resolver.ts`, `src/core/combat/types.ts`
* **Deliverables**:
  * **Action Validator**: Checks whether a selected action is legal (target within range, tile unoccupied for movement, sufficient resource).
  * **Execution Pipeline**:
    * Applying movement (updating unit's hex coordinate).
    * Applying attack damage to a dummy target unit.
    * Awarding archetype XP (Fighter / Rogue / Mage) to the actor based on the executed action's tag.
  * **End Turn / Battle Check**: Concluding a unit's turn and verifying whether XP thresholds trigger Level-1 readiness.
* **Verification**: Headless Vitest simulation running a full mock turn: Unit moves 2 hexes, attacks target with Mage cantrip, deals damage, and receives 1 Mage XP.

---

### Milestone 5: Interactive Visual Testbed (In-Game)  <── COMPLETED & TESTED
* **Location**: `src/ui/combat/`
* **Deliverables**:
  * **Hex Grid Rendering**: Pointy-topped SVG hex grid (`HexGridSvg.tsx`) rendering 37-tile radial arena with reachable movement and ability target highlights.
  * **Unit Visuals**: Rendering recruit token and training dummies with live HP bars and action point pips.
  * **Player Action HUD**:
    * Action bar (`ActionBar.tsx`) with Move, Wait/End Turn (+CTB refund), and 3 equipped starter abilities with rich hover tooltips.
    * Real-time unit inspector (`UnitStatusCard.tsx`) showing vitals, CTB gauge, defense matrix (Evasion/Resolve/Armor/Ward), active modifiers, XP tally, and target preview.
    * Dev sandbox controls: Dice mode overrides (Random, Nat 20, Graze, Miss), starter kit re-roller, and encounter reset.
  * **Live Feedback**: Floating combat text animations (`-X HP`, `Knockback!`, `Critical!`) and transparent scrollable combat log (`CombatLogPanel.tsx`).

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
[Milestone 3: Hex Grid Math]            [Milestone 4: Combat Resolver]
 (COMPLETED & TESTED)                    (COMPLETED & TESTED)
         │                                │
         └────────────────┬───────────────┘
                          │
                          ▼
            [Milestone 5: Playable Testbed] <── COMPLETED & TESTED
```
