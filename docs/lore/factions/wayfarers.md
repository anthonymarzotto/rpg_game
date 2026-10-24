---
id: wayfarers
title: "The Wayfarers"
category: factions
tags: [factions, wayfarers, initiates, novices, vanguard]
related_entries: [the-nexus, constellations, voidborn-incursions]
unlock_condition: default
summary: "Mortal champions and initiates who dare enter the astral expanse to attune their souls to the stars."
---

# The Wayfarers

> *"We were not born of starlight, but we will make it our armor."*
> — Wayfarer Oath of Conduit

---

## Overview

A **Wayfarer** is any mortal whose soul possesses sufficient spiritual density to resist immediate dissolution upon entering the Astral Realm. Originating from various shattered remnants of the physical world, wayfarers gather at [The Nexus](../world/the_nexus.md) united by a single purpose: to traverse hostile sectors, conquer Astral Trials, and attune their spirits to the upper echelons of the [Stellar Constellations](../cosmology/constellations.md).

---

## The Path of the Initiate

### 1. Novices
Every journey begins as a **Novice**. Unattuned to any martial or magical specialty, novices rely on instinct, basic grit, and fundamental tactical maneuvers. Though fragile, a novice's spiritual template is entirely pliable, capable of branching toward Force, Finesse, or Focus as their experience dictates.

### 2. Attunement & The Combat Manifest
As a wayfarer survives encounters, their connection to celestial archetypes deepens:
- **Core Kit**: Upon attuning to a recognized class node (e.g. *Warrior*, *Thief*, *Wizard*), their primary tactical identity solidifies into a tailored suite of three abilities.
- **Resonant Wildcards**: Veterans who ascend through multiple classes learn to channel memories of their past disciplines, slotting **Resonant Abilities** and **Resonant Passives** alongside their active kit.

### 3. The Vanguard Bond
When three wayfarers are linked via Conduits into **The Vanguard**, their tactical consciousnesses partially harmonize. They communicate instantaneously across the hex grid, allowing complex tactical executions such as **Allied Pincers**, high-ground cover suppression, and synchronized status affliction exploitation.

---

## Tactical & Mechanical Echoes

- **Unit Data Model**: Represented in code via `Recruit` (`src/core/campaign/recruit.ts`) and `CombatUnit` (`src/core/combat/combatUnit.ts`).
- **Loadout Assembly**: Governed by the Combat Manifest (`src/core/classes/classCatalog.ts` and `src/ui/unit-info/UnitInfoDialog.tsx`).
- **Pincer & Flanking Synergy**: When adjacent allies engage an enemy, all allied attacks gain the Pincer flank advantage regardless of individual positioning angle.

---

## See Also
- [The Nexus](../world/the_nexus.md)
- [The Stellar Constellations](../cosmology/constellations.md)
- [`CLASS_PACKAGES.md`](../../architecture/CLASS_PACKAGES.md)
