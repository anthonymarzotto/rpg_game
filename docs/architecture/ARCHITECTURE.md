# Technical Architecture & Stack Specification

This document defines the technical architecture, runtime environment, frameworks, and data boundaries of the project. It focuses strictly on engineering and technology decisions, keeping the core game design and gameplay rules deliberately open.

---

### 1. Core Architectural Pattern: Decoupled Simulation & Presentation

The system is organized into two strictly decoupled tiers:

```
┌─────────────────────────────────────────────────────────────┐
│          PRESENTATION & UI LAYER (React + SVG + CSS)        │
│  - Declarative SVG Hex Grid, 64x64 pixel sprites / tokens   │
│  - Floating combat text, animations, and glowing filters    │
│  - HUD overlays, Action Bar, Inspector Cards, Log, Modals   │
│  - Expedition Camp Hub (The Nexus, Vanguard, The Enclave)   │
│  - Reads state reactively; dispatches user intent           │
└──────────────────────────────▲──────────────────────────────┘
                               │ (React State / Reducer Hooks)
┌──────────────────────────────▼──────────────────────────────┐
│           CAMPAIGN DOMAIN & PROGRESSION LOOP                │
│  - CampaignState: Roster, Vanguard conduits, stage tracker  │
│  - Smart Two-Way Wayfarer swapping, recruit & ascension     │
│  - Procedural encounter generation & dynamic threat budget  │
│  - Post-battle reconciliation loop (HP, XP carryover)       │
└──────────────────────────────▲──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│           SIMULATION ENGINE (Pure TypeScript / Headless)    │
│  - 100% DOM-independent, engine-independent domain logic    │
│  - Hexagonal mathematics, coordinate spaces, line-of-sight  │
│  - Turn sequencing (Initiative / Turn Queue), state machine │
│  - Deterministic rule resolution & AI decision computation  │
└──────────────────────────────┬──────────────────────────────┘
                               │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
┌─────────────────────────┐           ┌───────────────────────┐
│     DATA & PERSISTENCE   │           │   TESTING (Vitest)    │
│ - JSON / TS Data Schemas│           │ - Headless Simulation │
│ - IndexedDB Save States │           │ - Sub-second execution│
│ - localStorage Settings │           │ - Deterministic tests │
└─────────────────────────┘           └───────────────────────┘
```

### Architectural Rules
1. **Zero UI/DOM Dependencies in Core**: Code inside `src/core/` must never import from React, SVG/DOM elements, or browser-specific globals (`window`, `document`).
2. **Headless Execution**: Any game rule, state transition, or algorithm must be executable and verifiable purely in a Node.js / Vitest test environment without a browser or canvas mocks.
3. **Unidirectional State Flow**: The simulation and campaign domain states are the single source of truth. The presentation tier is a reactive projection of the current simulation/campaign state.

---

## 2. Tech Stack Components

### 2.1. Language & Build Tooling
* **TypeScript**: Strict mode enabled (`noImplicitAny`, `strictNullChecks`). Ensures reliable contracts across layers and maximizes AI-assisted refactoring and code generation precision.
* **Vite**: Modern development server providing instant Hot Module Replacement (HMR) and optimized static asset bundling.

### 2.2. Core Simulation Engine (Headless)
* **Runtime**: Pure TypeScript executed in both browser and Node.js environments.
* **Responsibilities**:
  * Hexagonal coordinate math (supporting axial $(q, r)$ and cube $(q, r, s)$ representations) and elevation/height offsets.
  * Spatial queries: range rings, distance formulas, line-of-sight, and pathfinding.
  * Turn order management: Continuous Turn-Based (CTB) accumulator clock driving tactical turns. While the internal math uses continuous accumulator ticks, player-facing contracts and the presentation layer standardize strictly on **Initiative** and the **Turn Queue**.
  * Deterministic rule resolution (hit rolls, damage formulas, archetype XP allocation).
  * Save/load serialization and deserialization.

### 2.3. Presentation & Rendering Layer
* **React + SVG + CSS**: Declarative, high-contrast presentation layer combining vector geometry with pixel art assets built directly in the DOM.
* **Hybrid Token & Asset Pipeline**:
  * **Primary Pixel Art Sprites**: `64x64` multi-directional PNG sprites (`public/assets/tokens/pixel/`) with 6 hex orientations + south facing, rendered with `image-rendering: pixelated;` to preserve crisp retro outlines.
  * **Scoped Asset Preloading**: Scoped asset preloader (`preloadCombatUnitTokens`) loads combatant sprite textures into the browser cache asynchronously before skirmishes launch.
  * **Graceful Vector Fallback**: Units lacking raster art fall back seamlessly to procedural SVG vector circular tokens with class icons and initials.
  * **Dynamic Responsive ViewBox**: Hex grid coordinates map directly to SVG points; dynamic SVG `viewBox` handles pan, zoom, and multi-resolution scaling without raster distortion or letterbox bars.
  * **Asset Efficiency**: Leverages free vector iconography (e.g. game-icons.net SVG symbols) for abilities, badges, and status effects.
  * **Audio Strategy**: Audio is decoupled and deferred. When implemented, lightweight native Web Audio API utilities or minimal libraries (e.g., Howler / procedural synth chimes) will be used without adding heavyweight game engine dependencies.

### 2.4. Campaign Domain & Progression Loop (`src/core/campaign/`)
* **State Boundaries**:
  * `CampaignState`: Manages persistent expedition state including roster (`Unit[]`), active squad conduit IDs (`activeSquadIds`), sector stage index, win/loss tallies (Triumphs and Eclipses), and current trial encounter.
  * **Pure State Transitions**: All roster modifications (benching, conduit assignment, recruiting novices, archetype ascension point allocation) are implemented as pure, immutable domain functions (`setCampActiveSquad`, `recruitNovice`, `allocateCampArchetypePoint`).
* **Procedural Trial Generator & Threat Budgeting**:
  * `encounterGenerator.ts` generates tactical skirmishes dynamically scaled to squad composition using `threatBudget.ts`, balancing enemy quantities, archetypes, and obstacle density.
* **Post-Battle Reconciliation Loop**:
  * `useCombatSimulation.ts` bridges combat outcomes back to persistent campaign state, reconciling surviving HP, fallen states, accumulated archetype XP, and unlocked classes.

### 2.5. User Interface & State Orchestration
* **React**: Component-based declarative UI layer containing HUD overlays, action bars, unit status cards, combat logs, the Expedition Camp Hub (`The Nexus`), and progression drawers.
* **CSS Custom Properties & Tokens**: Centralized design system in `src/styles/tokens.css` providing semantic colors, dark glassmorphic elevations, and typography tokens.
* **State Bridge**:
  * Lightweight centralized state orchestration and custom hooks bridging headless simulation, campaign transitions, and React views.
  * React components reactively subscribe to state slices.
  * Simulation logic updates state without React lifecycle overhead.

### 2.6. Testing & Verification
* **Vitest**: Native TypeScript test runner.
* **Headless Testing Strategy**:
  * Unit and integration tests run against the core simulation and campaign domain without requiring a browser, canvas mocks, or jsdom.
  * Enables fast feedback loops for testing algorithms, edge cases, and deterministic outcomes.

### 2.7. Persistence & Storage
* **IndexedDB** (via `idb-keyval`): Primary client-side storage for game saves, progress, and battle suspend/checkpoints. Asynchronous, high capacity, non-blocking.
* **localStorage**: Storage for lightweight user preferences (display toggles, keybindings, audio settings).
* **JSON File Export/Import**: Mechanism for players to export save states as portable files.

### 2.8. Static Game Data & Maps
* **Format**: Structured JSON and TypeScript data files with strict type definitions (or schema validators like Zod).
* **Decoupled Definitions**: Static catalogs (units, items, abilities, terrain definitions, map layouts) are version-controlled, hot-reloadable in Vite, and directly importable into unit tests.

---

## 3. Platform & Input Strategy

* **Primary Target**: Desktop web browsers.
* **Input Abstraction**: Interaction logic is built on standard pointer events (`pointerdown`, `pointerup`, `click`, `mouseenter`, `mouseleave`), ensuring immediate mouse support and direct future touchscreen compatibility.
* **Responsive Scaling**: SVG container scaling with CSS flexbox/grid layout maintains sharp visuals across varying browser window sizes and aspect ratios.
* **Mobile Extensibility**: The decoupled architecture and pointer-based input design ensure that touch controls and mobile viewports can be enabled in the future without rearchitecting core systems.

