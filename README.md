# Astral Tactics

A celestial turn-based tactical RPG featuring a 100-class Constellation Star Pyramid, hex-grid positional combat, and an expedition camp progression loop.

---

## 🛠️ Tech Stack Specification

| Category | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict typing, robust data contracts, high accuracy for automated testing and AI-assisted tooling. |
| **Bundler & Tooling** | [Vite](https://vitejs.dev/) | Sub-second HMR, optimized production builds, native asset pipeline. |
| **Simulation Core** | Pure TypeScript (Headless) | Pure domain logic with zero DOM or rendering engine dependencies. Can execute deterministically in Node.js. |
| **Presentation & Arena** | React + SVG + CSS | Declarative vector-based digital tabletop arena, glowing hex highlights, procedural unit tokens, and smooth CSS animations without raster asset overhead. |
| **HUD & UI Layer** | [React](https://react.dev/) + CSS Modules | Declarative UI for menus, modals, dialogs, inspector cards, and HUD overlays. |
| **State Orchestration** | React Hooks & State | Clean reactive state and hooks connecting headless simulation events and React UI components. |
| **Testing Framework** | [Vitest](https://vitest.dev/) | High-speed unit and integration test runner for verifying simulation logic headlessly. |
| **Client Persistence** | IndexedDB & `localStorage` | IndexedDB (via `idb-keyval`) for game saves and session suspend states; `localStorage` for player settings. |
| **Map & Data Storage** | Structured JSON / TypeScript | Human- and agent-readable static definitions for game data and level layouts. |

---

## 📚 Documentation

### Architecture & Specifications
* [Architecture & Tech Stack Blueprint](docs/architecture/ARCHITECTURE.md)
* [Gameplay & Combat Specification](docs/architecture/GAMEPLAY.md)
* [Class Pyramid & Constellation Progression](docs/architecture/CLASS_PYRAMID.md)

### Development Plans
* [Development Plan & Roadmap](docs/plans/DEVELOPMENT_PLAN.md)

