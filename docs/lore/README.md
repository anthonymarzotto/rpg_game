---
id: lore-index
title: "The Astral Tactics Lore Compendium & World Bible"
category: world
tags: [lore, compendium, index, worldbuilding, firmament]
related_entries: [world-overview, the-firmament, grand-conjunction, wayfarers, cosmic-sprites]
unlock_condition: default
summary: "The canonical master index and contributor guide for the Astral Tactics world bible and lore compendium."
---

# Astral Tactics — The Astral Codex & Lore Compendium

Welcome to the canonical lore compendium and world bible for **Astral Tactics**.

This directory serves as the single source of truth for narrative design, worldbuilding, faction backgrounds, cosmological principles, and in-game codex content.

---

## 🌟 The World in Brief

High above the mortal world lies **The Firmament**—an expansive celestial realm of perpetual twilight skies, floating starlit landmasses, weathered stone plazas, and quiet skyports. 

Once in a great era, the night skies align in the **Grand Conjunction**, casting down gentle starlight bridges that lift ordinary mortals—village squires, curious herbalist apprentices, herd-tenders, town guards, and restless wanderers—into the heavens. 

Here, travelers form small traveling companies and participate in the ancient **Astral Tournaments**—celebrations of mortal determination, skill, and sportsmanship. Guided by native **Cosmic Sprites** (the player persona) who accompany them as beloved campfire friends and navigators, companies test their mettle against **Rival Companies** and star-forged **Trial Guardians**, seeking the ultimate blessing at the pinnacle of the trials: **The Falling Star’s Favor**, capable of granting a single heartfelt wish to aid their loved ones back home.

---

## 🧭 Directory Structure

```text
docs/lore/
├── README.md                      # This master index & contributor guide
├── world_overview.md              # The canonical core overview of the setting
├── templates/
│   └── entry_template.md          # Standardized markdown template for new lore articles
├── cosmology/                     # The laws of the heavens, celestial mechanics, and native beings
│   ├── the_firmament.md           # The twilight skies, floating islands, and stellar tides
│   ├── grand_conjunction.md       # The celestial alignment, starlight paths, and the Falling Star's Favor
│   ├── constellations.md          # The Triad of Traditions (Force, Finesse, Focus) and Ascension
│   └── cosmic_sprites.md          # The luminous native guides and campfire companions (Player Persona)
├── world/                         # Havens, landmarks, arenas, and regional environments
│   ├── the_nexus.md               # The grand skyport haven, starlight docks, campfire commons, and staging dais
│   └── trial_grounds.md           # The ancient floating amphitheaters, terraces, and tournament bout traditions
├── factions/                      # Traveling companies, guilds, and wanderer cultures
│   ├── wayfarers.md               # Everyday wanderers, novice arrivals, trail growth, and campfire bonds
│   └── rival_companies.md         # The competing bands: Academies, City Watch patrols, Guild Artisans, Freeblades
└── bestiary/                      # Impartial sparring sentinels and celestial challenges
    └── trial_guardians.md         # Ancient star-forged sentinels, clockwork automata, and trial evaluations
```

---

## 📚 Core Reading Index

| Category | Key Articles | Core Themes |
| :--- | :--- | :--- |
| **Foundations** | [World Overview](world_overview.md) | The four foundational pillars: The Realm, The Wayfarers, The Bouts, The Sprite |
| **Cosmology** | [The Firmament](cosmology/the_firmament.md)<br>[The Grand Conjunction](cosmology/grand_conjunction.md)<br>[The Stellar Constellations](cosmology/constellations.md)<br>[The Cosmic Sprites](cosmology/cosmic_sprites.md) | Twilight skies, stellar tides, the wish of the Falling Star, the Triad of Traditions, native celestial guides |
| **World & Havens** | [The Nexus](world/the_nexus.md)<br>[Celestial Trial Grounds](world/trial_grounds.md) | The bustling skyport haven, starlight docks, campfire circles, floating arenas, and bout traditions |
| **Factions & Bands** | [The Wayfarers & Novices](factions/wayfarers.md)<br>[Rival Companies](factions/rival_companies.md) | Everyday common folk, humble starter gear, comradeship on the trail, academy scholars, and town guard delegations |
| **Bestiary & Trials** | [The Celestial Trial Guardians](bestiary/trial_guardians.md) | Star-forged sentinels, clockwork skirmishers, and runic evaluators testing company readiness |

---

## 🛠️ Contributor Guidelines

### 1. Focus on Worldbuilding, Not Mechanics
Articles in `docs/lore/` describe the universe as experienced by the people living in it. 
* **Do Not** insert source code references (`src/core/...`), data model names (`CombatUnit`, `Recruit`), or internal game engine jargon (hex grids, CTB ticks, threat budgets).
* **Do** describe atmosphere, sights, sounds, daily campfire habits, local foods, regional crafts, and emotional bonds.

### 2. The Spirit of the Setting
* **Hopeful & Wonder-Filled:** The Firmament is not a place of cosmic horror, despair, or grim slaughter. It is an inspiring, cozy, and grand celestial journey.
* **Everyday Mortals:** Wayfarers are relatable people—squires, apprentices, guards, and wanderers. Their gear is humble, their struggles are earnest, and their growth comes through practice and friendship.
* **Friendly Competition:** Opposing contenders are fellow mortals with their own worthy dreams. Defeat means yielding honorably, nursing bruises on the sidelines, and sharing cider around the evening hearth.
* **The Sprite's Role:** You are a beloved friend and native celestial guide, not an imperious general or cold tactician.

### 3. Markdown & Obsidian Compatible
* All documents use standard YAML frontmatter for codex and tool integration.
* Cross-references use relative markdown links (e.g. `[The Nexus](../world/the_nexus.md)`) that automatically generate rich visual knowledge graphs in Obsidian or Foam.

### 4. Creating New Articles
To add a new article, copy [`templates/entry_template.md`](templates/entry_template.md) into the appropriate subdirectory, fill out the frontmatter, and link it from this master index.
