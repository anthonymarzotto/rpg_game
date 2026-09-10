# Technical Architecture & Stack Specification

This document defines the technical architecture, runtime environment, frameworks, and data boundaries of the project. It focuses strictly on engineering and technology decisions, keeping the core game design and gameplay rules deliberately open.

---

## 1. Core Architectural Pattern: Decoupled Simulation & Presentation

The system is organized into three strictly separated tiers:

```
┌─────────────────────────────────────────────────────────────┐
│                     UI LAYER (React + CSS)                  │
│  - Declarative HUD overlays, menus, modals, and tooltips    │
│  - Reads state reactively; dispatches user intent           │
└──────────────────────────────▲──────────────────────────────┘
                               │ (Zustand State Store)
┌──────────────────────────────▼──────────────────────────────┐
│                  RENDER LAYER (Phaser 3)                    │
│  - 2D Canvas/WebGL rendering, sprite animations, camera     │
│  - Audio playback (SFX & BGM) via WebAudio                  │
│  - Captures raw canvas pointer inputs                       │
└──────────────────────────────▲──────────────────────────────┘
                               │ (Events & Commands)
┌──────────────────────────────▼──────────────────────────────┐
│           SIMULATION ENGINE (Pure TypeScript / Headless)    │
│  - 100% DOM-independent, engine-independent domain logic    │
│  - Grid mathematics, coordinate spaces, and line-of-sight   │
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
1. **Zero UI/Engine Dependencies in Core**: Code inside `src/core/` must never import from Phaser, React, or browser-specific globals (`window`, `document`).
2. **Headless Execution**: Any game rule, state transition, or algorithm must be executable and verifiable purely in a Node.js test environment.
3. **Unidirectional State Flow**: The simulation is the source of truth. The render and UI tiers are projections of the current simulation state.

---

## 2. Tech Stack Components

### 2.1. Language & Build Tooling
* **TypeScript**: Strict mode enabled (`noImplicitAny`, `strictNullChecks`). Ensures reliable contracts across layers and maximizes AI-assisted refactoring and code generation precision.
* **Vite**: Modern development server providing instant Hot Module Replacement (HMR) and optimized static asset bundling for spritesheets, audio, and data files.

### 2.2. Core Simulation Engine (Headless)
* **Runtime**: Pure TypeScript executed in both browser and Node.js environments.
* **Responsibilities**:
  * Hexagonal coordinate math (supporting axial $(q, r)$ and cube $(q, r, s)$ representations) and elevation/height offsets.
  * Spatial queries: range rings, distance formulas, line-of-sight, and pathfinding.
  * Turn order management and state machine transitions.
  * Deterministic rule resolution.
  * Save/load serialization and deserialization.

### 2.3. Rendering & Presentation
* **Phaser 3**: Battle-tested 2D HTML5 game framework used strictly for rendering and presentation.
* **Key Capabilities Leveraged**:
  * Pixel-art preservation (`pixelArt: true`, nearest-neighbor sampling).
  * 2D camera system (panning, zoom levels, centering on points of interest).
  * Sprite animation playback and depth sorting.
  * WebAudio management for sound effects and background music.
  * Scene lifecycle management.

### 2.4. User Interface Layer
* **React**: Component-based declarative UI layer rendered directly in the DOM on top of the Phaser canvas.
* **CSS Modules / Vanilla CSS**: Clean, isolated styling for menus, tooltips, dialogs, and overlays.
* **State Bridge (Zustand)**:
  * A lightweight, centralized state store that connects the headless simulation, Phaser events, and React components.
  * React components reactively subscribe to state slices.
  * Phaser and simulation logic can read and update state imperatively without React lifecycle overhead.

### 2.5. Testing & Verification
* **Vitest**: Native TypeScript test runner.
* **Headless Testing Strategy**:
  * Unit and integration tests run against the core simulation without requiring a browser, canvas mocks, or jsdom.
  * Enables fast feedback loops for testing algorithms, edge cases, and deterministic outcomes.

### 2.6. Persistence & Storage
* **IndexedDB** (via `idb-keyval`): Primary client-side storage for game saves, progress, and battle suspend/checkpoints. Asynchronous, high capacity, non-blocking.
* **localStorage**: Storage for lightweight user preferences (audio volume, display toggles, keybindings).
* **JSON File Export/Import**: Mechanism for players to export save states as portable files.

### 2.7. Static Game Data & Maps
* **Format**: Structured JSON and TypeScript data files with strict type definitions (or schema validators like Zod).
* **Decoupled Definitions**: Static catalogs (units, items, abilities, terrain definitions, map layouts) are version-controlled, hot-reloadable in Vite, and directly importable into unit tests.

---

## 3. Platform & Input Strategy

* **Primary Target**: Desktop web browsers.
* **Input Abstraction**: Interaction logic is built on standard pointer events (`pointerdown`, `pointerup`), ensuring compatibility with both mouse and future touchscreen inputs.
* **Virtual Resolution**: The game renders to a consistent internal virtual resolution with letterboxing managed by Phaser's scale system to prevent viewport distortions.
* **Mobile Extensibility**: The decoupled architecture and pointer-based input design ensure that touch controls and mobile viewports can be enabled in the future without rearchitecting core systems.
