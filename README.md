# Hex Tactics RPG

A browser-based turn-based tactical RPG built with a strictly decoupled simulation and presentation architecture.

---

## 🛠️ Tech Stack Specification

| Category | Technology | Purpose & Rationale |
| :--- | :--- | :--- |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict typing, robust data contracts, high accuracy for automated testing and AI-assisted tooling. |
| **Bundler & Tooling** | [Vite](https://vitejs.dev/) | Sub-second HMR, optimized production builds, native asset pipeline. |
| **Simulation Core** | Pure TypeScript (Headless) | Pure domain logic with zero DOM or rendering engine dependencies. Can execute deterministically in Node.js. |
| **Game Renderer** | [Phaser 3](https://phaser.io/) | 2D canvas/WebGL engine with battle-tested support for pixel art (`pixelArt: true`), camera control, and audio. |
| **HUD & UI Layer** | [React](https://react.dev/) + CSS Modules | Declarative UI for menus, modals, dialogs, and HUD overlays without canvas UI boilerplate. |
| **State Bridge** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight bidirectional reactive store bridging the headless simulation/Phaser canvas and React UI. |
| **Testing Framework** | [Vitest](https://vitest.dev/) | High-speed unit and integration test runner for verifying simulation logic headlessly. |
| **Client Persistence** | IndexedDB & `localStorage` | IndexedDB (via `idb-keyval`) for game saves and session suspend states; `localStorage` for player settings. |
| **Map & Data Storage** | Structured JSON / TypeScript | Human- and agent-readable static definitions for game data and level layouts. |

---

## 📚 Documentation

For the full architectural model and subsystem responsibilities, see:
* [Architecture & Tech Stack Blueprint](docs/ARCHITECTURE.md)
