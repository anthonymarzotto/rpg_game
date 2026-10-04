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

### 1. Archetype-Pair Flavored Surges
* **Decision**: Determine surge vitals based on the active archetype pair ($F+R$, $F+M$, $R+M$, or $F+R+M$ tri-hybrid).
* **Rationale**: Gives distinct tactical flavor to each hybrid path: Fighter+Rogue gains durability and initiative tempo (+HP/+Speed); Fighter+Mage gains dual damage mitigation (+Armor/+Ward); Rogue+Mage gains evasive battlefield mobility (+Move/+Evasion); Tri-hybrids gain broad all-around defense.
* **Alternatives Considered**: Flat uniform stats (+8 HP to all). Discarded because it erases the unique identity of different hybrid combinations.

### 2. Dual Choice (Domain Draft vs. Ability Overclock)
* **Decision**: Every off-node level allows the player to choose between:
  1. **Domain Skill Draft**: Unlocks 1 domain ability from the advancing archetype's existing packages into their permanent Wildcard pool.
  2. **Ability Overclock**: Permanently attaches an `AbilityModifier` to an equipped ability.
* **Rationale**: Solves the 6-level scaling trap. In early off-nodes, players can draft domain skills to fill their 2 wildcard slots. Once their slots are full, subsequent off-nodes allow them to overclock their favorite core skills, avoiding unwanted bench skills and preventing combat stagnation.
* **Alternatives Considered**: Domain Draft only. Discarded because having 6 domain skills with only 2 wildcard slots leads to severe diminishing returns.

### 3. On-Demand Rendering of Starlight Waypoints in SVG
* **Decision**: Calculate geometric coordinates for off-nodes along facet boundaries, but only render a Starlight Waypoint if it is **unlocked** by the inspected unit or **eligible** for their immediate next level.
* **Rationale**: Avoids visual clutter. If all 39 off-node waypoints were rendered simultaneously with the 100 class tiles, the star chart would look crowded. Rendering only the active path and next steps keeps the star chart elegant and readable.

### 4. Progression Data Tracking (`offNodeMilestones`)
* **Decision**: Add `offNodeMilestones: readonly string[]` (storing coordinate keys like `'1,1,0'`) and `abilityOverclocks: readonly AbilityModifier[]` to `UnitProgression` and `UnitLoadout`.
* **Rationale**: Keeps `constellation: readonly string[]` strictly dedicated to canonical class IDs, while allowing the UI and path router to render waypoints and compute Wayfarer titles deterministically.

### 5. Wayfarer Rank Titling
* **Decision**: When `hero.progression.offNodeMilestones.length > 0`, the hero's display title appends `Wayfarer <Roman Numeral>` (e.g. `Warrior • Wayfarer I`).
* **Rationale**: Prevents a Level 7 hybrid hero from feeling like an un-promoted Level 1 novice on character cards and combat banners.

## Risks / Trade-offs

* **[Risk] Domain skills diluting class identity**: Allowing units to draft domain skills might make pure classes feel less special.
  * **Mitigation**: Pure class unlocks still grant the exclusive **Signature Ability** (e.g. *Lead the Charge*, *Expose Weakness*, *Spell Sculpt*) and the **Innate Class Passive** (e.g. *Tactical Vanguard*, *Elusive Stride*, *Wild Surge*). Off-nodes only offer standard domain abilities.
* **[Risk] Overclock balance stacking**: Stacking 6 overclocks on a single skill could create an overpowered nuke.
  * **Mitigation**: Impose a maximum of 2 overclocks per individual ability.

## Migration Plan

1. Author `src/core/progression/harmonization.ts` to compute surge bonuses and detect off-node coordinates.
2. Update `src/core/campaign/transitions.ts` to award harmonization surges and record off-node milestones.
3. Update `src/ui/pyramid/geometry.ts` with barycentric coordinate calculations for off-node waypoints.
4. Update `src/ui/pyramid/ConstellationSvg.tsx` to render unlocked Starlight Waypoints and route the laser polyline through them.
5. Create `src/ui/camp/OffNodeChoiceModal.tsx` and integrate it into `HeroProgressionDrawer.tsx`.
6. Update hero card components to render Wayfarer titles.
7. Verify all Vitest suites pass with full test coverage.
