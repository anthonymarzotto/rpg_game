# Proposal

## Why

In the 100-class celestial lattice, units advance by spending XP across Fighter, Rogue, and Mage up to Level 9. While the geometric pyramid tessellation contains 100 catalog classes, the combination of valid coordinate partitions ($F+R+M = \text{Level}$) produces 139 integer coordinates. This leaves **39 off-node coordinates** across Tiers 2 through 7 where a hero gains a level, but no canonical class node exists in the catalog.

Currently, leveling into an off-node coordinate simply increments the level counter and base attributes, but awards zero class abilities, zero passives, zero identity, and no visual milestone on the Constellation. A hero pursuing a balanced hybrid build toward the centroid (such as the Level 9 Bard) encounters **6 off-node levels**, turning their career into an empty and discouraging experience.

This change establishes Phase 4.4: Off-Node Level Progression ("The Wayfarer's Path"). It ensures that intermediate hybrid steps feel just as rewarding and strategic as pure class unlocks by introducing **Harmonization Stat Surges**, an interactive **Dual-Choice Milestone (Domain Skill Draft vs. Ability Overclock)**, **Luminous Waypoints** on the Constellation Star Chart, and **Wayfarer Hero Titles**.

## What Changes

* **Wayfarer Attunements & Choice Modal (`src/core/progression/harmonization.ts`, `src/ui/camp/OffNodeChoiceModal.tsx`)**:
  * Off-node levels award an interactive two-step progression milestone in Camp:
    * **Step 1: Wayfarer Attunement**: Select 1 balanced defensive surge tailored to the hero's combat role:
      * 🛡️ **Wayfarer's Bastion** (Force): `+6 Max HP` & `+1 Armor` (frontline damage soak and flat physical mitigation).
      * 🗡️ **Wayfarer's Stride** (Finesse): `+2 Evasion` & `+2 Speed` (10% attack avoidance, graze negation on debuffs, and 20% faster CTB recovery).
      * 🔮 **Wayfarer's Ward** (Focus): `+2 Resolve` & `+1 Ward` (10% spell/mental debuff avoidance and flat magical mitigation).
      * ✦ **Wayfarer's Zenith** (Tri-Centroid at Levels 3 & 6): `+4 Max HP`, `+1 Armor`, `+1 Ward`, `+1 Speed`, `+1 Evasion`, `+1 Resolve` (harmonic balance across all three apexes).
    * **Step 2: Milestone Specialization**:
      * **Breadth — Domain Skill Unlock**: Deterministically select 1 unlearned domain ability from the advancing archetype's pool (gated by $\text{Tier} \le \text{Unit Level}$) into the hero's permanent Wildcard pool.
      * **Depth — Astral Augment Shard**: Earn a socketable `AstralAugmentShard` for the hero's loadout. Shards socket into any combat ability slot (0..4, max 2 shards per slot) to augment whatever ability is equipped in that slot (`+1 Die Step`, `+1 Range`, `+1 AoE`, or atomic infusions like `Knockback`, `Poison DoT`, `CTB Delay`). Excludes AP cost reductions to protect the 3-AP action economy.
* **Constellation Star Chart Luminous Waypoints (`src/ui/pyramid/ConstellationSvg.tsx`, `geometry.ts`)**:
  * Compute exact barycentric coordinates for off-node waypoints along triangle facet boundaries.
  * Render illuminated **Starlight Waypoint** nodes on the star chart when unlocked or eligible.
  * Trace the constellation laser path through unlocked off-node waypoints: e.g. `Warrior (1,0,0)` $\rightarrow$ `Waypoint (1,1,0)` $\rightarrow$ `Cavalier (2,1,0)`.
  * Support hovering over waypoints to inspect their harmonization blend and bonuses in the Node Scanner HUD.
* **Hero Titles & Vanguard Identity**:
  * Heroes with off-node investments receive dynamic titles indicating their Wayfarer rank (e.g. `Warrior • Wayfarer I` through `Wayfarer VI`) on their Camp cards and combat status badges.
  * Camp progression drawer spend buttons preview upcoming off-node rewards (e.g. `🗡️ Ascend: Rogue (+1 Finesse) • ✦ Wayfarer Milestone`).

## Capabilities

### New Capabilities
- `off-node-progression`: Archetype-pair harmonization stat surge calculation, off-node choice modal (Domain Skill Draft vs. Ability Overclock), Luminous Waypoint rendering on the Constellation, and Wayfarer rank titling.

### Modified Capabilities
- `hero-progression-drawer`: Update in-camp level advancement to handle off-node coordinates, render off-node previews on spend buttons, and display Starlight Waypoints on the drawer's constellation chart.

## Impact

* **Core Progression**: `src/core/progression/pyramid.ts` and `src/core/campaign/transitions.ts` track off-node waypoints and apply harmonization surges.
* **UI & Visuals**: `src/ui/pyramid/ConstellationSvg.tsx` renders starlight waypoints; `src/ui/camp/OffNodeChoiceModal.tsx` provides the draft/overclock selection interface.
* **Dependencies**: Builds upon the `AbilityModifier` and `effects` pipeline introduced in `ability-pipeline-refactor`.
