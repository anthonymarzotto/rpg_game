# RPG Game Design System & Aesthetic Guide

## 1. Vision & Core Philosophy

The game presents a **Dark Fantasy Tactical RPG** aesthetic combining two core visual pillars:
1. **Crisp Pixel Art Characters**: Retro, directionally-aware pixel art sprites (`64x64` multi-directional PNGs scaled with `image-rendering: pixelated;`) representing heroes and monsters with tactical personality across 6 hex orientations + south facing.
2. **Modern Glassmorphic Tactical UI**: Sleek, high-contrast, semi-translucent dark slate surfaces (`backdrop-filter: blur(12px)`) with glowing golden and archetype-colored accents that keep tactical calculations, timelines, and vitals immediately readable.

### 1.1. Thematic UI Framing Glossary

The user interface uses a cohesive celestial and astral vocabulary to frame core tactical RPG systems (for the full authoritative lexicon and copy guide, see [`docs/architecture/GLOSSARY.md`](file:///c:/Repos/rpg_game/docs/architecture/GLOSSARY.md)):

| System / Area | Thematic Term | UI Presentation & Context |
| :--- | :--- | :--- |
| **Expedition Base** | **The Nexus** | Primary camp hub (`CampHub`) where wayfarers rest, attune, and plan expeditions |
| **Active Squad** | **The Vanguard** | The deployed combat team occupying active tactical **Conduits** (up to 3) |
| **Reserve Barracks** | **The Enclave** | Standby roster storage for wayfarers awaiting conduit attunement |
| **Playable Character** | **Wayfarer** | Player units traversing the astral realm and attuning to combat archetypes |
| **Class Progression** | **The Constellation** | The 100-class lattice composed of interconnected class **Nodes** |
| **Level-Up / Advancement** | **✦ Ascension** | Milestone reached when threshold archetype resonance is satisfied (`✦ ASCENSION READY`) |
| **Tactical Deck** | **Combat Manifest** | A wayfarer's active class package, baseline skills, and **Resonant** wildcard abilities |
| **Combat Encounter** | **Trial / Astral Trial** | Tactical skirmish on the hex grid (`Sector {stage} Trial`) |
| **Battle Outcome** | **Triumph / Eclipse** | Victory (incursion banished, starlight harvested) or Defeat (astral severance back to The Nexus) |
| **Turn Timeline** | **Turn Queue / Initiative** | Continuous timeline ribbon and unit initiative gauge ordering tactical turns |

---

## 2. Design Tokens (`src/styles/tokens.css`)

All color values, typography choices, and elevation surfaces MUST use the CSS custom properties defined in [`src/styles/tokens.css`](file:///c:/Repos/rpg_game/src/styles/tokens.css). Do not use one-off hardcoded hex values in component styles.

### 2.1. Archetype Triad & Attributes

The primary progression engine revolves around the three archetypes. Each archetype has a dedicated color signature used across XP meters, damage popups, ability cards, and constellation stars:

| Archetype | Primary Attribute | Token Variable | Hex Value | Semantic Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Fighter** | Force | `--color-archetype-fighter` | `#ef4444` | Crimson / Rust — physical might, kinetic blows, armor |
| **Rogue** | Finesse | `--color-archetype-rogue` | `#10b981` | Emerald / Jade — speed, criticals, flanking, agility |
| **Mage** | Focus | `--color-archetype-mage` | `#8b5cf6` | Violet / Arcane — spell fields, barriers, resolve |

### 2.2. Class Highlights

Specific class nodes in the Constellation and combat arena have distinct thematic accents for currently implemented classes:

* `--color-class-novice`: `#94a3b8` (Unformed Slate / Silver)
* `--color-class-warrior`: `#f97316` (Tempered Bronze / Amber)
* `--color-class-thief`: `#34d399` (Shadow Emerald)
* `--color-class-wizard`: `#a78bfa` (Starlight Lavender)

*(Future Tier 2+ classes will define their color signatures when their class packages are authored in Phase 4).*

### 2.3. Tactical Factions & UI States

* **Player / Active Faction**:
  * `--color-player-active`: `#f59e0b` (Radiant Amber Gold — active turn halos, selected action outlines, `✦ ASCENSION READY` callouts)
  * `--color-player-ally`: `#06b6d4` (Luminous Cyan — friendly targeting reticles, teammate health bars, buff effects)
* **Hostile / Enemy Faction**:
  * `--color-hostile`: `#ef4444` (Vicious Crimson — enemy threat badges, hostile turn banners, attack targeting reticles)
  * `--color-hostile-glow`: `rgba(239, 68, 68, 0.4)`
* **Vitals & Combat Resources**:
  * `--color-vital-hp`: `#22c55e` (Vitality Green)
  * `--color-vital-hp-low`: `#ef4444` (Critical Red)
  * `--color-vital-ap`: `#f59e0b` (Action Point Gold)
  * `--color-vital-ctb`: `#38bdf8` (Initiative / Turn Queue Cyan / Azure)

### 2.4. Surfaces, Elevations & Glassmorphism

* `--surface-app-bg`: `#06080e` (Deep Obsidian / Midnight Void)
* `--surface-panel`: `rgba(15, 23, 42, 0.8)` (Translucent Slate Panel)
* `--surface-panel-elevated`: `rgba(30, 41, 59, 0.85)` (Cards, Active Selectors)
* `--surface-overlay`: `rgba(2, 6, 23, 0.75)` (Modal backdrops)
* `--border-subtle`: `rgba(255, 255, 255, 0.08)` (Default 1px divider)
* `--border-highlight`: `rgba(255, 255, 255, 0.2)` (Hover state)
* `--border-focus-gold`: `#f59e0b` (Active selection ring)
* `--shadow-glass`: `0 8px 32px 0 rgba(0, 0, 0, 0.37)`
* `--blur-panel`: `blur(12px)`

### 2.5. Typography Scale

* **Display Font** (`--font-display`): `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  * Used for: Titles, victory/defeat headers, class names, camp banners.
  * Weight: `700` or `800`, letter-spacing: `0.02em`.
* **UI Font** (`--font-ui`): `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
  * Used for: Body text, ability tooltips, dialogs, button labels.
  * Weights: `400` (body), `500` (medium), `600` (semibold).
* **Data & Numerics Font** (`--font-mono`): `'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace`
  * Used for: Combat log entries, HP/AP numerical values, Initiative / timeline ticks, dice roll breakdowns.
  * Ensures clean tabular alignment of numbers in tactical combat.

---

## 3. Asset & Token Guidelines

### 3.1. Primary Character Sprites: Pixel Art
* **Location**: [`public/assets/tokens/pixel/`](file:///c:/Repos/rpg_game/public/assets/tokens/pixel/)
* **Resolution**: Standardized `64x64` PNGs with transparency, clean pixel grid.
* **Rotations**: 6 hex-grid directions + front-facing `south`:
  * `east.png`, `north-east.png`, `north-west.png`, `west.png`, `south-west.png`, `south-east.png`, `south.png`.
* **CSS Display Requirement**: Always use `image-rendering: pixelated;` to avoid bilinear blurring when sprites are scaled up.
* **Scoped Preloading**: Scoped asset preloader (`preloadCombatUnitTokens`) asynchronously caches token graphics into the browser cache before combat encounters start.
* **Graceful Fallback**: If a newly added class or monster does not yet have a pixel sprite generated, the system falls back to a procedural vector circular token badge with the unit's initials and class icon.

### 3.2. Camp & Background Artwork
* Backgrounds support CSS gradients as default with clean image overrides.
* When dropping in painted background images (e.g. The Nexus at night), use modern `.webp` formats placed in `public/assets/art/` and referenced via CSS class.

---

## 4. How to Change Aesthetics in the Future

* **Swapping Global Fonts**: Edit `--font-display`, `--font-ui`, or `--font-mono` in `src/styles/tokens.css`.
* **Tuning Class Highlights (e.g., Warrior)**: Update `--color-class-warrior` in `src/styles/tokens.css`.
* **Adjusting Arena or Camp Backdrop**: Update `--surface-app-bg` or `--surface-panel` in `src/styles/tokens.css`.
