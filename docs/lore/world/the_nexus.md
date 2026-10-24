---
id: the-nexus
title: "The Nexus"
category: world
tags: [world, haven, nexus, vanguard, enclave, camp]
related_entries: [astral-realm, wayfarers, constellations]
unlock_condition: default
summary: "The tranquil eye of the astral storm where wayfarers rest, attune conduits, and contemplate the stars."
---

# The Nexus

> *"Here the void cannot touch us. Warm your hands at the celestial hearth, wayfarer, for the sectors ahead will demand everything you have."*
> — Scribe Matthew of The Enclave

---

## Overview

Floating at the intersection of stable astral ley lines, **The Nexus** is a sanctuary island suspended amidst the churning void. It serves as the primary base of operations for expeditions into uncharted sectors.

Protected by ancient stellar obelisks, The Nexus shields mortals from planar dissolution and void contamination. Within its tranquil borders, wayfarers rest between trials, bind wounds, and meditate upon the Constellation to achieve Ascension.

---

## Architecture of The Haven

### 1. The Three Conduits (The Vanguard)
At the center of The Nexus lies an elevated dais inlaid with three celestial anchors known as **Conduits I, II, and III**.
- These conduits project an attunement beam into the astral field, stabilizing up to three wayfarers simultaneously.
- Those attuned to the conduits form **The Vanguard**—the frontline expeditionary squad that actually enters Astral Trials.
- If a wayfarer falls in battle, the conduit snaps their spiritual tether back to the haven, preventing permanent death at the cost of trial defeat (an **Eclipse**).

### 2. The Enclave
Surrounding the central dais are quiet cloisters known as **The Enclave**. Here, reserve wayfarers study tactical scriptures, maintain equipment, and rest while waiting to be attuned to an active conduit. 

### 3. The Novice Font
Deep within The Enclave rests the Novice Font, a basin of liquid starlight used to summon unformed souls into mortal vessels—an act known as **Awakening a Novice**. Novices awaken without specialized class attunements, ready to be molded into any of the three archetype disciplines.

---

## Tactical & Mechanical Echoes

- **Camp Hub (`src/ui/camp/CampHub.tsx`)**: The UI screen where players organize the expedition between battles.
- **Vanguard Management**: Attuning wayfarers from The Enclave into Conduits I, II, or III, ensuring a minimum of one wayfarer is deployed.
- **Roster Growth**: Awakening new Novices to expand tactical squad options across different archetype compositions.

---

## See Also
- [The Astral Realm](../cosmology/astral_realm.md)
- [Wayfarers](../factions/wayfarers.md)
- [`GLOSSARY.md`](../../architecture/GLOSSARY.md)
