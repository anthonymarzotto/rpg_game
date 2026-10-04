# Proposal

## Why

In the 100-class celestial lattice, units advance by spending XP across Fighter, Rogue, and Mage up to Level 9. While the geometric pyramid tessellation contains 100 catalog classes, the combination of valid coordinate partitions ($F+R+M = \text{Level}$) produces 139 integer coordinates. This leaves **39 off-node coordinates** across Tiers 2 through 7 where a hero gains a level, but no canonical class node exists in the catalog.

Currently, leveling into an off-node coordinate simply increments the level counter and base attributes, but awards zero class abilities, zero passives, zero identity, and no visual milestone on the Constellation. A hero pursuing a balanced hybrid build toward the centroid (such as the Level 9 Bard) encounters **6 off-node levels**, turning their career into an empty and discouraging experience.

This change establishes Phase 4.4: Off-Node Level Progression ("The Wayfarer's Path"). It ensures that intermediate hybrid steps feel just as rewarding and strategic as pure class unlocks by introducing **Harmonization Stat Surges**, an interactive **Dual-Choice Milestone (Domain Skill Draft vs. Ability Overclock)**, **Luminous Waypoints** on the Constellation Star Chart, and **Wayfarer Hero Titles**.

## What Changes

* **Harmonization Stat Surges (`src/core/progression/harmonization.ts`)**:
  * Off-node levels award an automatic baseline stat surge reflecting the synergy of the blended archetypes:
    * **Fighter + Rogue ($F+R$)**: $+6$ Max HP, $+1$ Speed.
    * **Fighter + Mage ($F+M$)**: $+1$ Armor, $+1$ Ward.
    * **Rogue + Mage ($R+M$)**: $+1$ Move, $+1$ Evasion.
    * **Tri-Hybrid ($F+R+M$ at Levels 3 & 6)**: $+5$ Max HP, $+1$ to all secondary defenses (Speed, Armor, Ward, Evasion, Resolve).
  * Automatically integrated into `computeDerivedVitals()` during camp level advancement.
* **Off-Node Choice Modal (`src/ui/camp/OffNodeChoiceModal.tsx`)**:
  * When leveling into an off-node in Camp, the player is presented with a choice between:
    * **Breadth — Domain Skill Draft**: Select 1 domain ability from the advancing archetype's available pool to permanently unlock into the hero's personal Wildcard pool.
    * **Depth — Ability Overclock**: Select 1 currently equipped ability to permanently attach an `AbilityModifier` (e.g. +1 damage die tier, +1 range, -10 CTB cost, or append an effect).
* **Constellation Star Chart Luminous Waypoints (`src/ui/pyramid/ConstellationSvg.tsx`, `geometry.ts`)**:
  * Compute exact barycentric coordinates for off-node waypoints along triangle facet boundaries.
  * Render illuminated **Starlight Waypoint** nodes on the star chart when unlocked or eligible.
  * Trace the constellation laser path through unlocked off-node waypoints: e.g. `Warrior (1,0,0)` $\rightarrow$ `Waypoint (1,1,0)` $\rightarrow$ `Cavalier (2,1,0)`.
  * Support hovering over waypoints to inspect their harmonization blend and bonuses in the Node Scanner HUD.
* **Hero Titles & Vanguard Identity**:
  * Heroes with off-node investments receive dynamic titles indicating their Wayfarer rank (e.g. `Warrior • Wayfarer I` through `Wayfarer VI`) on their Camp cards and combat status badges.
  * Camp progression drawer spend buttons preview upcoming off-node rewards (e.g. `🗡️ Ascend: Rogue (+1 Finesse) • ✦ Hybrid Surge: Skirmisher`).

## Capabilities

### New Capabilities
- `off-node-progression`: Archetype-pair harmonization stat surge calculation, off-node choice modal (Domain Skill Draft vs. Ability Overclock), Luminous Waypoint rendering on the Constellation, and Wayfarer rank titling.

### Modified Capabilities
- `hero-progression-drawer`: Update in-camp level advancement to handle off-node coordinates, render off-node previews on spend buttons, and display Starlight Waypoints on the drawer's constellation chart.

## Impact

* **Core Progression**: `src/core/progression/pyramid.ts` and `src/core/campaign/transitions.ts` track off-node waypoints and apply harmonization surges.
* **UI & Visuals**: `src/ui/pyramid/ConstellationSvg.tsx` renders starlight waypoints; `src/ui/camp/OffNodeChoiceModal.tsx` provides the draft/overclock selection interface.
* **Dependencies**: Builds upon the `AbilityModifier` and `effects` pipeline introduced in `ability-pipeline-refactor`.
