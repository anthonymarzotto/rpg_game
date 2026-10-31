# Astral Tactics — Strategic Roadmap

> **The Architectural North Star**: Every gameplay mechanic, AI decision model, and data pipeline is implemented and verified first as pure headless TypeScript logic in `src/core/` before integrating with the React + SVG + CSS presentation tier.

---

## Horizon 1: Combat Feel & Tactical Clarity

**Goal**: Transform the combat experience from "mechanically functional" to "tactile, clear, and perfectly balanced."

1. **Unit Inspection & State Visibility**:
   * Click-to-pin unit inspection cards during combat for both allies and enemies.
   * Interactive hover tooltips for active conditions (`POISON`, `BURN`, `STEALTH`, `CHALLENGED`, stat buffs).
   * Transparent enemy ability preview (view threat range, primary attacks, remaining AP).
2. **Tactical Facing Control**:
   * Post-move facing selection: upon moving to a destination hex, prompt a directional wheel/arrow to set unit orientation before ending the action or taking follow-up actions.
3. **Initiative & Combat Tempo Balance**:
   * Break the "player-always-acts-first" tempo lock. Add randomized initial CTB ticks, agility modifiers, or enemy ambush conditions.
   * Rebalance Rogue/Thief action economy to prevent disproportionate turn frequency and XP accumulation compared to Fighters and Mages.
4. **Progression Smoothing**:
   * Alleviate the friction of using basic Novice skills to grind off-archetype XP. Explore ability starring, secondary archetype victory resonance, or flexible skirmish XP allocation.

---

## Horizon 2: Expedition Sector Map & Roguelike Run Loop

**Goal**: Replace linear stage progression with a strategic, non-linear expedition map, ambient micro-lore, and a satisfying run completion loop.

1. **Procedural Sector Navigation (`src/core/campaign/sectorMap.ts`)**:
   * Directed Acyclic Graph (DAG) generation connecting nodes across 3–4 expedition sectors:
     * **Skirmish Trials**: Standard void incursion battles.
     * **Elite Anomalies**: High-threat battles yielding rare augment shards and relics.
     * **Celestial Havens**: Safe campsites to heal HP, re-attune abilities, and recruit novices.
     * **Astral Shrines**: Risky altars offering powerful blessings in exchange for permanent vitals.
     * **Mystery Rifts**: Unpredictable celestial rifts with dice-check outcomes.
2. **Ambient Micro-Lore & Narrative Framing**:
   * Maintain a **gameplay-first, zero-friction** narrative style:
     * **Named Astral Sectors**: Thematic sector names (*The Obsidian Verge*, *The Weeping Nebula*, *The Shattered Apex*, *The Clockwork Abyss*) with distinct environmental hazard rules.
     * **Shrine Vignettes**: 2-sentence mysterious narrative choices presenting clear risk vs. reward without long exposition.
     * **Battle Barks**: 1-sentence floating combat whispers triggered on key events (entering stealth, blood frenzy, killing blows).
     * **Shard & Class Epigraphs**: Short, poetic lore fragments embedded in ability tooltips and Constellation cards.
3. **Expedition Win/Loss Closure & Run Summary**:
   * Sector boss encounters concluding each sector.
   * Final Trial victory screen: Run Summary showing battles won, MVPs, total starlight harvested, and constellation mastery achieved.
4. **Passive Squad Relics (`src/core/items/`)**:
   * Global run modifiers found during exploration (e.g. *Chrono Hourglass* boosting unspent AP refund, *Sunstone Prism* expanding aura radii).
5. **Tactical Terrain Hexes & Environmental Hazards (`src/core/grid/terrain.ts`)**:
   * Expand the hex grid beyond basic obstacles and elevation terraces to support distinct tactical terrain types:
     * **Hazard Hexes**: Void fissures, magma pools, and toxic miasmas dealing damage or applying status conditions (`BURN`, `POISON`) upon entry or turn end.
     * **Impeding Terrain**: Astral mire, crystal rubble, and ice sheets increasing movement AP costs (e.g. 2 MP to enter) or inducing involuntary slides.
     * **Cover & Concealment**: Obscuring mist clouds and dense astral brush screening ranged Line of Sight or conferring defensive evasion bonuses.
     * **Resonance Glyphs**: Leyline nodes and recovery fonts granting temporary AP, ward recharge, or damage amplification while occupied.

---

## Horizon 3: Sensory Juice, Visual Dice & Audio Engine

**Goal**: Give every tactical choice visceral physical feedback.

1. **Visual Dice Tumbler Tray** (✅ Completed — Moved to ACTIVE.md):
   * Procedural 2.5D tumbling dice banner animating attack checks and damage rolls, landing on values with kinetic screen impacts, advantage discard styling, and hit outcome stamps.
2. **Procedural & Synthesized Audio**:
   * Lightweight Web Audio API or audio sprite sound engine:
     * Dice rolling and clattering on the tray.
     * Kinetic impact sounds (blade clash, blunt thud, wall slam, spell burst).
     * Interface sounds (hex selection, turn chimes, condition popups).
     * Dynamic victory fanfare and ambient astral drone.
3. **Tactile Screen Effects**:
   * Directional screen-shake on wall collisions and critical strikes.
   * Polished bezier floating combat text (Physical: orange, Magic: violet, Healing: emerald, DoTs: crimson).

---

## Horizon 4: Expanded Roster & Boss Behemoths

**Goal**: Scale the 100-class pyramid and introduce massive adversaries.

1. **Tier 4 Class Packages (6 Classes)**
   * Dragoon, Shield Bearer, Ballistician, Philanderer, Arcanist, Theurge.
3. **Multi-Hex Boss Behemoths**:
   * Multi-tile astral entities occupying 2–3 contiguous hex footprints with custom directional arcs and multi-phase action economies.
4. **Higher Pyramid Horizons**:
   * Progressive authoring of Tier 5–9 class nodes advancing toward the geometric centroid (*Bard* `3, 3, 3`).

---

## 💡 Future Small Enhancements (Quality of Life & Micro-Polish)

Small, targeted enhancements and visual polish to evaluate in future tuning passes:

* **In-Place Unit Reorientation**: Allow clicking the active player unit token while in `IDLE` mode to open the compass ring and pivot facing for 0 AP at any time during their turn (outside of post-move).
* **Combat Arc Preview Shading**: Subtly tint the 3 forward hexes (FRONT cone) in cyan and the rear hex (REAR blind spot) in crimson when hovering a directional chevron on the compass ring to visualize defensive coverage.

---

## 🔮 Future Systems Exploration (Unscheduled)

Broad mechanical concepts to prototype and evaluate after the core run loop is established:

* **Nemeses**: Enemies that flee at low HP threshold, level up, and return in later sectors with higher threat budgets, counter-abilities, and persistent battle history. Upon ascending to Nemesis status, enemies evolve from procedural astral adjective titles (e.g. *Ash Novice* or *Ash Thief*) into true individual names with notorious epithets (e.g. *Vael the Sneaky*).
* **Camp Tutoring**: Veterans training Novices in Camp by passing on earned archetype XP while sitting out trials for a set number of rounds.
* **Wayfarer Aging & Mortality**: Units aging after each skirmish, progressing through age brackets with changing stat modifiers, and eventually retiring into Constellation legends.
* **Stat tracking**: Track stats per unit. Things like: total damage, damage per skill, hits, misses, grazes, crits, hexes moved, damage soaked, etc.
* **Achievements per unit to unlock titles**: >100 kills, >x soaked damage, >x soaked damage on allies, >x damage done, >x times in battle with lower level allies, etc.

