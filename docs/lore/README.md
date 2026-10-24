# Astral Tactics — The Astral Codex & Lore Compendium

Welcome to the canonical lore compendium and world bible for **Astral Tactics**.

This directory serves as the single source of truth for narrative design, worldbuilding, faction backgrounds, cosmological rules, and in-game codex content.

---

## 🧭 Directory Structure

```text
docs/lore/
├── README.md               # This master index & contributor guide
├── templates/              # Standardized markdown templates for new lore articles
│   └── entry_template.md   # Base template with YAML frontmatter
├── cosmology/              # Laws of the universe, celestial mechanics, magic systems
│   ├── astral_realm.md     # The cosmic field, planar decay, and astral rifts
│   └── constellations.md   # The Stellar Constellations, Archetype Triad, and Ascension
├── world/                  # Havens, landmarks, sectors, and environment lore
│   └── the_nexus.md        # The central sanctuary, conduits, and Enclave
├── factions/               # Groups, orders, philosophical traditions, and wayfarers
│   └── wayfarers.md        # Mortal initiates, novice awakening, and vanguard bonds
└── bestiary/               # Threats, void entities, corrupted forms, and trial foes
    └── voidborn_incursions.md # Nature of hostile incursions and the eclipse phenomenon
```

---

## 🛠️ How to Use This Wiki

### 1. Markdown & Obsidian Friendly
This directory is structured to work seamlessly both as plain Git-tracked Markdown and as a standalone vault in [Obsidian](https://obsidian.md/) or with VS Code extensions (*Foam*, *Markdown All in One*, or *Markdown Notes*):
- **Wikilinks**: You may use standard relative markdown links `[The Nexus](../world/the_nexus.md)` or bi-directional wikilinks `[[the_nexus]]`.
- **Graph View**: If you open `docs/lore/` in Obsidian, all cross-referenced lore will automatically form an interactive visual graph.

### 2. "Docs-as-Data" Ready
Every lore entry includes a YAML frontmatter block at the top:
```yaml
---
id: the-nexus
title: The Nexus
category: world # cosmology | world | factions | history | bestiary
tags: [haven, camp, vanguard, enclave]
related_entries: [astral-realm, wayfarers]
unlock_condition: default # default | sector-3 | defeat-boss | codex-discovery
summary: The central celestial sanctuary where wayfarers rest and attune to constellations.
---
```
This metadata enables:
- Seamless parsing into an in-game **Codex** or **Bestiary** UI in `CampHub`.
- Automated filtering and tagging in tools and AI workflows.
- Programmatic validation against canonical rules.

### 3. Canonical Alignment
All terminology MUST adhere to [`docs/architecture/GLOSSARY.md`](../architecture/GLOSSARY.md).
- Use **The Nexus** (not Camp/Town)
- Use **The Vanguard** & **The Enclave** (not Active Party/Reserves)
- Use **Wayfarer** (not Hero/Unit)
- Use **✦ Ascension** (not Level Up)
- Use **Astral Trial** (not Match/Battle)
- Use **Triumph** & **Eclipse** (not Victory/Defeat)

---

## 📚 Core Reading Index

| Category | Key Articles | Themes |
| :--- | :--- | :--- |
| **Cosmology** | [The Astral Realm](cosmology/astral_realm.md)<br>[The Constellations](cosmology/constellations.md) | Dimensional physics, starlight energy, the Triad of Force/Finesse/Focus |
| **World** | [The Nexus](world/the_nexus.md) | Sanctuaries, the expedition conduit system, sector depths |
| **Factions** | [Wayfarers](factions/wayfarers.md) | Mortal seekers, novice awakening, attunement traditions |
| **Bestiary** | [Voidborn Incursions](bestiary/voidborn_incursions.md) | Eclipse manifestations, rift horrors, combat behaviors |

---

## ✍️ Creating New Entries
To add a new lore article, copy [`templates/entry_template.md`](templates/entry_template.md) into the appropriate subfolder, populate the frontmatter fields, and link it from this index.
