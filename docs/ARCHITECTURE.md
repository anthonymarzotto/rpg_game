# Technical Architecture & Stack Specification

This document defines the technical architecture, runtime environment, frameworks, and data boundaries of the project. It focuses strictly on engineering and technology decisions, keeping the core game design and gameplay rules deliberately open.

---

### 1. Core Architectural Pattern: Decoupled Simulation & Presentation

The system is organized into two strictly decoupled tiers:

```
┌─────────────────────────────────────────────────────────────┐
│          PRESENTATION & UI LAYER (React + SVG + CSS)        │
│  - Declarative SVG Hex Grid, dynamic unit tokens, reticles  │
│  - Floating combat text, animations, and glowing filters    │
│  - HUD overlays, Action Bar, Inspector Cards, Log, Modals   │
│  - Reads state reactively; dispatches user intent           │
└──────────────────────────────▲──────────────────────────────┘
                               │ (Zustand Store / Event Hooks)
┌──────────────────────────────▼──────────────────────────────┐
│           SIMULATION ENGINE (Pure TypeScript / Headless)    │
│  - 100% DOM-independent, engine-independent domain logic    │
│  - Hexagonal mathematics, coordinate spaces, line-of-sight  │
│  - Turn sequencing, state transitions, and rule resolution  │
│  - AI decision computation                                  │
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
3. **Unidirectional State Flow**: The simulation is the single source of truth. The presentation tier is a reactive projection of the current simulation state.

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
  * Turn order management (CTB tick system) and state machine transitions.
  * Deterministic rule resolution (hit rolls, damage formulas, archetype XP allocation).
  * Save/load serialization and deserialization.

### 2.3. Presentation & Rendering Layer
* **React + SVG + CSS**: Declarative, high-contrast vector-based presentation layer built directly in the DOM.
* **Key Capabilities & Design Rationale**:
  * **Digital Tabletop Aesthetics**: Eliminates the need for hand-drawn spritesheets or raster art. Uses crisp vector geometry, procedural tokens, SVG filters (glows, drop-shadows), and CSS keyframe animations.
  * **Dynamic Responsive ViewBox**: Hex grid coordinates map directly to SVG points; dynamic SVG `viewBox` handles pan, zoom, and multi-resolution scaling without raster distortion or letterbox bars.
  * **Asset Efficiency**: Leverages free vector iconography (e.g. game-icons.net SVG symbols) for abilities, badges, and status effects.
  * **Audio Strategy**: Audio is decoupled and deferred. When implemented, lightweight native Web Audio API utilities or minimal libraries (e.g., Howler / procedural synth chimes) will be used without adding heavyweight game engine dependencies.

### 2.4. User Interface & State Orchestration
* **React**: Component-based declarative UI layer containing HUD overlays, action bars, unit status cards, combat logs, and progression charts.
* **CSS Modules / Vanilla CSS**: Clean, isolated styling for menus, tooltips, dialogs, and overlays.
* **State Bridge (Zustand & React Hooks)**:
  * Lightweight centralized state store and custom hooks bridging the headless simulation and React components.
  * React components reactively subscribe to state slices.
  * Simulation logic updates state without React lifecycle overhead.

### 2.5. Testing & Verification
* **Vitest**: Native TypeScript test runner.
* **Headless Testing Strategy**:
  * Unit and integration tests run against the core simulation without requiring a browser, canvas mocks, or jsdom.
  * Enables fast feedback loops for testing algorithms, edge cases, and deterministic outcomes.

### 2.6. Persistence & Storage
* **IndexedDB** (via `idb-keyval`): Primary client-side storage for game saves, progress, and battle suspend/checkpoints. Asynchronous, high capacity, non-blocking.
* **localStorage**: Storage for lightweight user preferences (display toggles, keybindings, audio settings).
* **JSON File Export/Import**: Mechanism for players to export save states as portable files.

### 2.7. Static Game Data & Maps
* **Format**: Structured JSON and TypeScript data files with strict type definitions (or schema validators like Zod).
* **Decoupled Definitions**: Static catalogs (units, items, abilities, terrain definitions, map layouts) are version-controlled, hot-reloadable in Vite, and directly importable into unit tests.

---

## 3. Platform & Input Strategy

* **Primary Target**: Desktop web browsers.
* **Input Abstraction**: Interaction logic is built on standard pointer events (`pointerdown`, `pointerup`, `click`, `mouseenter`, `mouseleave`), ensuring immediate mouse support and direct future touchscreen compatibility.
* **Responsive Scaling**: SVG container scaling with CSS flexbox/grid layout maintains sharp visuals across varying browser window sizes and aspect ratios.
* **Mobile Extensibility**: The decoupled architecture and pointer-based input design ensure that touch controls and mobile viewports can be enabled in the future without rearchitecting core systems.

