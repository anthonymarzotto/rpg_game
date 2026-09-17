# Architecture & Specification Audit

This document records the comprehensive architectural sweep conducted across the codebase, identifying tight couplings, monolithic components, and deviations from specifications in `docs/`.

---

## 1. Tight Couplings That Should Be Decoupled

The following components exhibit unnecessary or rigid coupling that impedes testing, modularity, and future feature extension:

| Subsystem / Coupling | Location | What Is Coupled | Resolution / Status |
| :--- | :--- | :--- | :--- |
| **`useCombatSimulation` $\leftrightarrow$ Static Encounter** | [`src/ui/combat/useCombatSimulation.ts`](file:///c:/Repos/rpg_game/src/ui/combat/useCombatSimulation.ts) | The combat controller hook hardcoded 4 specific training dummies (`dummy-a` through `dummy-d`), player ID `'player'`, and rock obstacle at `(0, 2)`. | **Resolved**: Extracted `EncounterDefinition` contract and `buildEncounterState` factory in `src/core/combat/encounter.ts`. Extracted sandbox encounter definition to `src/data/encounters/noviceSandbox.ts`. Hook now accepts an optional `encounterFactory`. |
| **`HexGridSvg` $\leftrightarrow$ Hardcoded Grid Assumptions** | [`src/ui/combat/HexGridSvg.tsx`](file:///c:/Repos/rpg_game/src/ui/combat/HexGridSvg.tsx) | 1. Hardcodes `radius = 3` instead of querying the arena's actual tiles.<br>2. Hardcodes `unitId === 'player'` for token styling instead of checking `cu.faction === 'PLAYER'`.<br>3. Hardcodes `"PILLAR"` text on unwalkable tiles. | **Resolved**: Queries tiles dynamically via `arena.getAllTiles()`, dynamically calculates `viewBox` and backdrop radius, displays data-driven obstacle labels from tile metadata (`tile.label`), and styles unit tokens and AP pips using faction allegiance (`cu.faction`). |
| **Core Progression $\leftrightarrow$ Master Data Catalog** | [`src/core/progression/pyramid.ts`](file:///c:/Repos/rpg_game/src/core/progression/pyramid.ts) | Core domain logic (`src/core/`) directly imported `CLASSES_BY_COORD` from `src/data/classes.ts`. | **Resolved**: Introduced pure `ClassRegistry` interface and factory in `src/core/progression/registry.ts`. Decoupled `pyramid.ts` by requiring explicit `registry: ClassRegistry` injection across all lookup and advancement functions with zero global singletons. |
| **Unit Factory $\leftrightarrow$ Novice Ability Kit** | [`src/core/units/unitFactory.ts`](file:///c:/Repos/rpg_game/src/core/units/unitFactory.ts) | `createRecruit` directly imported `rollNoviceAbilityKit` from `src/data/abilities`. | **Resolved**: Removed data import from `unitFactory.ts`. `createRecruit` now accepts explicit `abilities` or an injected `abilityKitGenerator` function via `CreateRecruitOptions`, defaulting to `[]` if omitted. |
| **Type Contracts $\leftrightarrow$ Runtime Stat Computations** | [`src/core/combat/types.ts`](file:///c:/Repos/rpg_game/src/core/combat/types.ts) | `types.ts` defined runtime computation functions (`getEffectiveStat`, `getEffectiveSpeed`, `getEffectiveMove`, etc.) alongside interfaces. | **Resolved**: Extracted all runtime stat getters into `src/core/combat/effectiveVitals.ts`. Updated consumers (`turnClock`, `targetPreview`, `resolver`, `damageEngine`, `attackRoll`, `knockbackHandler`) to import directly, leaving `types.ts` as a 100% pure type contract. |
| **Arena Sandbox $\leftrightarrow$ Constellation Progression** | [`src/App.tsx`](file:///c:/Repos/rpg_game/src/App.tsx#L53-L56) | The recruit fighting in the Arena and the recruit leveling in the Constellation Chart are completely isolated, disconnected local states. | **Resolved / Won't Do (Closed)**: Combat recruit and constellation chart remain intentionally isolated testbeds; unified progression will not be pursued. |

---

## 2. Monolith-Style Scripts & Functions to Break Down

Several files have accumulated multiple responsibilities and should be refactored into smaller, focused modules:

### A. `useCombatSimulation.ts` — Decomposed (Reduced from 600 lines to ~280 lines)
**Status: Resolved**
Extracted modules:
1. `src/core/combat/encounter.ts`: Headless `EncounterDefinition` contract and `buildEncounterState` factory.
2. `src/data/encounters/noviceSandbox.ts`: Novice sandbox encounter definition.
3. `src/core/combat/targetPreview.ts`: Pure headless `computeTargetPreview` domain logic.
4. `src/ui/combat/devDice.ts`: Developer dice overrides and forced roll generator.
5. `src/ui/combat/useFloatingCombatText.ts`: Floating combat text state management, dispatch queue, and auto-dismiss timers.
`useCombatSimulation.ts` now strictly orchestrates turn management and user interaction flows.

### B. `combat.test.ts` — Decomposed & Replaced
**Status: Resolved**
Decomposed the 708-line monolith test suite into 5 focused domain test suites with zero test loss:
1. `src/core/combat/movement.test.ts`: Grid movement execution and AP cost deduction.
2. `src/core/combat/turnClock.test.ts`: CTB turn clock advancement, unspent AP recovery, and modifier expiration lifecycle.
3. `src/core/combat/resolution.test.ts`: Attack roll outcomes (Solid, Crit, Graze, Miss), in-battle archetype XP awards, buffs, and decoupled attribute scaling.
4. `src/core/combat/displacement.test.ts`: Knockback, map border collisions, bystander collateral damage, retreat steps, and pluggable effect handlers.
5. `src/core/combat/validator.test.ts`: Targeting constraints, LoS screening, self-targeting rules, and faction allegiance checks.
`combat.test.ts` has been deleted.

### C. `ClassInspector.tsx` (340 lines, 10.7 KB)
Contains the class inspector modal header, 9-tier level-up simulation buttons, eligibility status, archetype requirements breakdown, full 9-step traversal history, and class perks summary.
* **Proposed Breakdown**: Extract `LevelUpSimulator.tsx` and `ConstellationHistory.tsx`.

### D. `resolver.ts` — Decomposed (Reduced to ~250 lines)
**Status: Resolved**
Extracted modules:
1. `src/core/combat/validator.ts`: Pure headless `canMove` and `canExecuteAbility` validation rules.
2. `src/core/combat/validator.test.ts`: Dedicated unit test suite for legal reach, AP thresholds, faction allegiance, range, and Line of Sight.
3. Cleaned backwards-compatibility re-export shims from `resolver.ts`, requiring consumers to import directly from authoritative source modules.

---

## 3. Deviations from the Files in `docs/`

Comparison of active code against the specification documents in `docs/`, with resolution status:

| Document | Documented Specification | Current Implementation | Disposition / Status |
| :--- | :--- | :--- | :---: |
| [`ARCHITECTURE.md`](file:///c:/Repos/rpg_game/docs/ARCHITECTURE.md#L19-L23) | **Render Layer**: Specifies **Phaser 3** for 2D canvas/WebGL rendering, sprite animations, camera panning, and WebAudio. | **Pure SVG**: Rendered via React SVG components ([`HexGridSvg.tsx`](file:///c:/Repos/rpg_game/src/ui/combat/HexGridSvg.tsx), [`ConstellationSvg.tsx`](file:///c:/Repos/rpg_game/src/ui/pyramid/ConstellationSvg.tsx)). | **Intentional (Maintained)**: Phaser remains the planned production target. Current React SVG UI is a lightweight testbed framework. |
| [`ARCHITECTURE.md`](file:///c:/Repos/rpg_game/docs/ARCHITECTURE.md#L77-L81) | **State Bridge**: Specifies **Zustand** as the centralized state store connecting simulation, Phaser, and React. | **React `useState`**: State is currently isolated inside local component hooks. | **Deferred**: Zustand will be introduced when Phaser / the production game UI is built. Arena and Constellation isolation is currently intentional. |
| [`ARCHITECTURE.md`](file:///c:/Repos/rpg_game/docs/ARCHITECTURE.md#L89) | **Persistence**: Specifies client-side save state storage via **IndexedDB** (`idb-keyval`). | Persistence is not yet wired up; all battle and progression state resets on page refresh. | **Deferred**: Future feature. |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L151-L155) | **Positional Modifiers**: Specifies Flanking ($+2$ or Advantage), Rear Strikes ($+4$ / Crit Boost), and High Ground ($+1$ die face / range). | [`attackRoll.ts`](file:///c:/Repos/rpg_game/src/core/combat/attackRoll.ts) rolls $d20 + \text{modifier}$ vs defense; facing and elevation bonuses not yet active. | **Deferred**: Future combat depth feature. |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L168-L179) | **Dual-Layer Presentation**: Specifies visual tumbling 2D/3D dice on screen and audio clatter for rolls. | Combat rolls are calculated instantaneously with no visual dice animations or audio SFX. | **Deferred**: Future visual/audio polish. |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L98) | **Action Economy Limits**: Specifies special/heavy skills (2–3 AP) carry a "Once per Turn" limit or short cooldown. | `Ability` has no cooldown/oncePerTurn fields; all abilities can be executed as long as AP permits. | **Deferred**: Will add properties when higher-tier/heavy abilities require them. |
| [`GAMEPLAY.md`](file:///c:/Repos/rpg_game/docs/GAMEPLAY.md#L120-L148) | **Combat Resolution Diagram**: Diagram showed implicit physical=finesse, spell=focus. | Ability contracts now explicitly encode `attackModifierAttribute` and `damageProfile.modifierAttribute`. | **Resolved**: Updated `GAMEPLAY.md` Section 3.2 to document explicit attribute contract and baseline standard. |
| [`PLAYABLE_CHARACTER_ROADMAP.md`](file:///c:/Repos/rpg_game/docs/PLAYABLE_CHARACTER_ROADMAP.md#L49-L73) | **File Paths**: Listed Milestone 2 as `src/data/starterKit.ts` and Milestone 4 as `src/core/combat/state.ts`. | Actual paths are `src/data/abilities/` and `src/core/combat/types.ts`. | **Resolved**: Corrected paths in `PLAYABLE_CHARACTER_ROADMAP.md`. |

---

## 4. Action Plan & Next Steps

1. **Documentation Alignment (Section 3)**:
   * ✅ **Resolved**: `GAMEPLAY.md` Section 3.2 updated to document explicit `attackModifierAttribute` and standard baseline.
   * ✅ **Resolved**: `PLAYABLE_CHARACTER_ROADMAP.md` paths updated.
   * ✅ **Aligned**: Phaser 3, Zustand, Persistence, Positional Modifiers, Dice Animations, and Action Limits recorded as intentional testbed scaffolding or deferred future features.
2. **Decompose Monoliths (Section 2)**:
   * ✅ **Resolved**: Refactored `useCombatSimulation.ts` to separate target preview math, floating combat text lifecycle, dev dice, and encounter setup.
   * ✅ **Resolved**: Decomposed `combat.test.ts` into `movement.test.ts`, `turnClock.test.ts`, `resolution.test.ts`, `displacement.test.ts`, and `validator.test.ts`.
   * Next: Decompose `ClassInspector.tsx`.
   * ✅ **Resolved**: Extracted action/movement validators (`canMove`, `canExecuteAbility`) from `resolver.ts` to `src/core/combat/validator.ts` and eliminated backwards-compatibility re-export shims.
3. **Decouple Tight Couplings (Section 1)**:
   * ✅ **Resolved**: Decoupled `useCombatSimulation.ts` from hardcoded encounter dummies via `EncounterDefinition`.
   * ✅ **Resolved**: Decoupled `HexGridSvg.tsx` from hardcoded radius 3, `unitId === 'player'`, and static obstacle text.
   * ✅ **Resolved**: Decoupled `pyramid.ts` from static `CLASSES_BY_COORD` via explicit `ClassRegistry` dependency injection.
   * ✅ **Resolved**: Decoupled `unitFactory.ts` from static `rollNoviceAbilityKit` via dependency injection.
   * ✅ **Resolved**: Decoupled Type Contracts $\leftrightarrow$ Runtime Stat Computations by extracting `getEffectiveStat` and getters to `src/core/combat/effectiveVitals.ts`.
   * ✅ **Resolved / Closed**: Arena Sandbox $\leftrightarrow$ Constellation Progression (Item 18) — Closed as intentional testbed isolation; unified progression will not be pursued.
