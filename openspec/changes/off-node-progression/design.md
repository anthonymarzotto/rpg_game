# Design

## Context

In the 100-class triangular lattice ([CLASS_PYRAMID.md](file:///c:/Repos/rpg_game/docs/architecture/CLASS_PYRAMID.md)), units allocate archetype points $(F, R, M)$ up to Level 9. Because the 100 catalog classes do not cover all 139 valid integer coordinate partitions, 39 coordinates across Tiers 2–7 are "off-node". Balanced centroid progressions (such as the Level 9 Bard path) encounter 6 off-node levels between Level 2 and Level 7.

This design builds directly upon the composable ability and modifier architecture introduced in `ability-pipeline-refactor`, leveraging its declarative `AbilityModifier` engine to power Ability Overclocks alongside Domain Skill Drafts.

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/off-node-progression/proposal.md) for full motivation and scope.

## Goals / Non-Goals

**Goals:**
* Implement deterministic Harmonization Stat Surges derived from archetype coordinate blends.
* Build an intuitive in-Camp Off-Node Choice Modal offering a strategic decision between Breadth (Domain Skill Draft) and Depth (Ability Overclock).
* Extend the Constellation Star Chart ([ConstellationSvg.tsx](file:///c:/Repos/rpg_game/src/ui/pyramid/ConstellationSvg.tsx)) with Luminous Starlight Waypoints along facet boundaries, connecting laser paths smoothly through off-nodes.
* Provide clear character identity via dynamic Wayfarer Hero Titles (`Warrior • Wayfarer I` through `VI`).
* Ensure zero bespoke class package authoring by sourcing domain skills and overclocks systemically.

**Non-Goals:**
* Authoring new standalone class packages for the 39 off-node coordinates (off-nodes are waypoints, not classes).
* Expanding wildcard slot capacities (active wildcard limit remains at 2, passive limit at 1).

## Decisions

### 1. Player-Chosen Wayfarer Attunements
* **Decision**: Rather than applying automatic fixed pair formulas, off-node levels present the player with a choice of balanced Wayfarer Attunements in Step 1 of the choice modal:
  * 🛡️ **Wayfarer's Bastion** (Force): `+6 Max HP` & `+1 Armor` (frontline damage soak and flat physical mitigation).
  * 🗡️ **Wayfarer's Stride** (Finesse): `+2 Evasion` & `+2 Speed` (10% attack avoidance, graze negation on debuffs, and 20% faster CTB recovery).
  * 🔮 **Wayfarer's Ward** (Focus): `+2 Resolve` & `+1 Ward` (10% spell/mental debuff avoidance and flat magical mitigation).
  * ✦ **Wayfarer's Zenith** (Tri-Centroid at Levels 3 & 6): `+4 Max HP`, `+1 Armor`, `+1 Ward`, `+1 Speed`, `+1 Evasion`, `+1 Resolve` (harmonic balance across all three apexes).
* **Rationale**: Mathematical combat analysis proved that on a d20 roll, `+1 Armor` (flat mitigation on all hits/crits) prevents ~2.6× more damage than `+1 Evasion` (a 5% marginal d20 shift). In the core balance engine, Finesse is balanced as an aggregate bundle (Evasion + Speed + Move). Budgeting `1 Armor` against `2 Evasion + 2 Speed` (and `1 Ward` against `2 Resolve`) restores defense parity. Offering this as a player choice lets players specialize their hybrid hero's survivability.
* **Alternatives Considered**: Hardcoded archetype-pair formulas ($F+R$, $F+M$, $R+M$). Discarded due to severe stat asymmetry ($R+M$ lacked Focus representation) and Armor heavily outperforming Evasion.

### 2. Two-Step Milestone Modal (Attunement + Specialization)
* **Decision**: Every off-node level presents an interactive two-step modal in Camp:
  * **Step 1: Wayfarer Attunement**: Select 1 defensive stat package (Bastion, Stride, Ward, or Zenith).
  * **Step 2: Milestone Specialization**: Choose between:
    1. **Domain Skill Unlock (Breadth)**:
       * Deterministically select 1 unlearned domain ability from the advancing archetype's pool to permanently add to the hero's personal Wildcard pool.
       * **Level/Tier Gating**: Abilities are gated by $\text{Tier} \le \text{Current Unit Level}$ (e.g. a Level 2 hero can unlock Tier 1 Thief or Tier 2 Infiltrator domain skills, but not Tier 3+ skills). Prevents early-game access to endgame abilities while rewarding higher-tier off-nodes with advanced skills.
       * **Deterministic Choice**: Displays all eligible unlearned domain skills (no random 3-card RNG), aligning with the deterministic Constellation progression.
    2. **Astral Augment Shard (Depth)**:
       * Earn a socketable `AstralAugmentShard` module added to the hero's loadout inventory.
       * **Slot-Level Socketing**: Shards are assigned to an **Ability Slot** (0..4: Core 1, Core 2, Core 3, Wildcard 1, Wildcard 2) rather than bound to a specific ability ID. Whatever ability is equipped in that slot inherits the slot's augments. Eliminates orphan shard tracking when swapping skills or switching classes.
       * **Socket Capacity**: Maximum of **2 shards per ability slot** to allow potent dual synergies (e.g. Die Step + Knockback, or Range + Poison) while preventing single-skill game-breaking exploits.
       * **Supported Shard Catalog**:
         * 💥 **Starlight Lens**: `diceStep: +1` (damage die tier upgrades, e.g. 1d6 $\rightarrow$ 1d8).
         * 🎯 **Astral Reach**: `range: +1` hex.
         * 🌀 **Supernova Flare**: `aoeRadius: +1` hex (or adds 1-hex splash).
         * 🔨 **Impact Shard**: Appends `KNOCKBACK 1 hex` (on Hit/Crit).
         * 🧪 **Venom Shard**: Appends `CONDITION: POISON` (2 turns).
         * ⏳ **Static Shard**: Appends `CTB_DELAY 15 ticks` (on Hit/Crit).
       * **AP Cost Reductions Excluded**: No augment reduces AP costs, protecting the 3-AP action economy from balance-breaking 50% discounts on 2-AP skills.

### 3. On-Demand Rendering of Starlight Waypoints in SVG
* **Decision**: Calculate geometric coordinates for off-nodes along facet boundaries, but only render a Starlight Waypoint if it is **unlocked** by the inspected unit or **eligible** for their immediate next level.
* **Rationale**: Avoids visual clutter. If all 39 off-node waypoints were rendered simultaneously with the 100 class tiles, the star chart would look crowded. Rendering only the active path and next steps keeps the star chart elegant and readable.

### 4. Progression Data Tracking (`offNodeMilestones`, `slotAugments`)
* **Decision**: 
  * Add `offNodeMilestones: readonly string[]` (storing coordinate keys like `'1,1,0'`) to `UnitProgression`.
  * Add `earnedShards: readonly string[]` and `slotAugments?: Readonly<Record<number, readonly string[]>>` to `UnitLoadout`.
* **Rationale**: Keeps `constellation: readonly string[]` dedicated strictly to canonical class IDs, while allowing loadout resolution to dynamically attach shard modifiers to whichever abilities are placed in slots 0..4.

### 5. Wayfarer Rank Titling
* **Decision**: When `hero.progression.offNodeMilestones.length > 0`, the hero's display title appends `Wayfarer <Roman Numeral>` (e.g. `Warrior • Wayfarer I`).
* **Rationale**: Prevents a Level 7 hybrid hero from feeling like an un-promoted Level 1 novice on character cards and combat banners.

## Risks / Trade-offs

* **[Risk] Domain skills diluting class identity**: Allowing units to draft domain skills might make pure classes feel less special.
  * **Mitigation**: Pure class unlocks still grant the exclusive **Signature Ability** (e.g. *Lead the Charge*, *Expose Weakness*, *Spell Sculpt*) and the **Innate Class Passive** (e.g. *Tactical Vanguard*, *Elusive Stride*, *Wild Surge*). Off-nodes only offer standard domain abilities.
* **[Risk] Augment stacking creating overpowered nukes**: Stacking 3+ shards on a single skill could break encounters.
  * **Mitigation**: Strictly capped at a maximum of 2 shards per slot, and AP reductions are excluded.

## Migration Plan

1. Author `src/core/progression/harmonization.ts` with `WAYFARER_ATTUNEMENTS` catalog, attunement application logic, and off-node coordinate detection.
2. Update `src/core/campaign/transitions.ts` to apply selected Wayfarer Attunements to derived vitals and record off-node milestones.
3. Update `src/ui/pyramid/geometry.ts` with barycentric coordinate calculations for off-node waypoints.
4. Update `src/ui/pyramid/ConstellationSvg.tsx` to render unlocked Starlight Waypoints and route the laser polyline through them.
5. Create `src/ui/camp/OffNodeChoiceModal.tsx` and integrate it into `HeroProgressionDrawer.tsx`.
6. Update hero card components to render Wayfarer titles.
7. Verify all Vitest suites pass with full test coverage.
