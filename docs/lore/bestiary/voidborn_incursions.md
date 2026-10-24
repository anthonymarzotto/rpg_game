---
id: voidborn-incursions
title: "Voidborn Incursions"
category: bestiary
tags: [bestiary, voidborn, enemies, incursions, eclipse, trials]
related_entries: [astral-realm, constellations, wayfarers]
unlock_condition: default
summary: "Anomalous hostile manifestations born from entropic void breaches that threaten astral expeditions."
---

# Voidborn Incursions

> *"They do not breathe, nor do they bleed. They are simply hunger given form by the dying embers of forgotten stars."*
> — Ranger Joshua, Scout of Sector 3

---

## Overview

Beyond the protective perimeter of [The Nexus](../world/the_nexus.md), the astral field is contested by entities known collectively as **Voidborn Incursions**. These hostile presences materialize at unstable astral rifts, drawn toward the radiant vitality of mortal souls and stellar conduits.

In an **Astral Trial**, the vanguard's primary imperative is to banish the incursion, re-stabilize the local hex field, and harvest starlight to fund further expedition depth.

---

## Threat Classification & Behaviors

Incursions take on mirror forms of the mortal archetypes, shaped by the local sector's psychic resonance:

### 1. Frontline Brutes & Enforcers (Force Resonance)
Drawn from martial echoes, these incursions manifest heavy spectral plate or chitinous carapaces. They seek to lock wayfarers into brutal melee engagements, utilizing knockback, guard stances, and high armor values to shelter fragile backline entities.

### 2. Lurkers & Shadow Stalkers (Finesse Resonance)
Fluid, shadowy stalkers that slink along the perimeter of the astral field. They exploit blind spots in wayfarer vision, seeking the **Rear Arc** (180°) for catastrophic precision strikes. They frequently utilize `STEALTH` and high Initiative to strike before defensive barriers can be established.

### 3. Void Weavers & Cultists (Focus Resonance)
Entities steeped in volatile void currents. They maintain distance, utilizing elevated terrain vantage to cast debilitating hexes (`POISON`, `BURN`, `SLOW`), disruption curses, and devastating area-of-effect spells like *Arcane Blast*.

---

## The Eclipse Phenomenon

When an incursion overwhelms all three active conduits of the Vanguard, the trial collapses into an **Eclipse**. During an Eclipse:
- The local hex grid disintegrates into void space.
- The conduits forcibly sever, catapulting wayfarers' astral forms back to The Nexus.
- The expedition suffers a setback, requiring the team to regroup and re-evaluate their tactical manifests before braving the sector anew.

---

## Tactical & Mechanical Echoes

- **Encounter Generation**: Encounters are procedurally generated via `src/core/campaign/campaignManager.ts` and enemy generator routines.
- **Threat Budget**: The procedural engine allocates units according to sector depth and archetype distribution rules.
- **Combat Behaviors**: Governed by the heuristic tactical AI engine (`src/core/ai/decisionEngine.ts` and `src/core/ai/heuristics.ts`).

---

## See Also
- [The Astral Realm](../cosmology/astral_realm.md)
- [The Wayfarers](../factions/wayfarers.md)
- [The Nexus](../world/the_nexus.md)
- [`GAMEPLAY.md`](../../architecture/GAMEPLAY.md)
