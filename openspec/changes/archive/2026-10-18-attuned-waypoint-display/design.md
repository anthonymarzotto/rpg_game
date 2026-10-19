# Design: Attuned Waypoint Display & Milestone Inspector

## Context
See `proposal.md` for motivation. Currently, off-node milestone rewards are dispersed into flat arrays on `UnitProgression` (`earnedAttunements`, `unlockedAbilityIds`) and `UnitLoadout` (`earnedShards`), losing the connection between a specific lattice coordinate and the rewards chosen at that level. In the UI, the floating Scanner HUD in `HeroProgressionDrawer` attempts to display available attunements, resulting in vertical bloat and line-wrapping, while the bottom Inspector panel exclusively handles class nodes.

Per user confirmation, backwards compatibility is not required for save/data models, enabling a clean, first-class architectural solution.

## Goals / Non-Goals

**Goals:**
- Provide first-class milestone provenance on `UnitProgression` via `milestoneSelections`.
- Streamline the floating Scanner HUD to 3 compact lines (Title & Tier, Harmonization, Status) with no line-wrapping or option lists.
- Enable interactive click selection on constellation waypoints in `ConstellationSvg`.
- Implement a dedicated `WaypointInspectorCard` in the bottom inspector slot of `HeroProgressionDrawer` that displays:
  - For attuned waypoints: The exact chosen attunement with stat deltas and the exact specialization reward (unlocked domain ability or augment shard).
  - For potential waypoints: An abbreviated overview of choices (attunement triad + draft ability vs forge shard).

**Non-Goals:**
- In-place milestone respec / re-attunement (future expansion).
- Equipping waypoints into active combat class slots (waypoints are passive milestones, not combat classes).

## Decisions

### 1. Milestone Selection Provenance Model
We define a typed ledger on `UnitProgression`:
```ts
export type MilestoneReward =
  | { readonly type: 'ABILITY'; readonly abilityId: string }
  | { readonly type: 'SHARD'; readonly shardId: string };

export interface MilestoneSelection {
  readonly coordKey: string;
  readonly attunementId: WayfarerAttunementId;
  readonly reward: MilestoneReward;
  readonly levelAwarded?: number;
}
```
And add `readonly milestoneSelections?: Readonly<Record<string, MilestoneSelection>>` to `UnitProgression`.

- **Rationale**: Provides $O(1)$ deterministic lookup when inspecting any coordinate key `(F,R,M)`. Preserves full fidelity of both Step 1 and Step 2 modal choices.
- **Alternatives Considered**: Correlating indices across `offNodeMilestones` and `earnedAttunements`. Rejected because abilities and shards in Step 2 are not 1:1 with attunements, creating loose, fragile heuristics.

### 2. Inspector Card Dual-Mode Presentation
The bottom inspector container in `HeroProgressionDrawer` will conditionally render either `ClassInspectorCard` or `WaypointInspectorCard` based on user selection:
- Selecting a class node sets `selectedClassId` and clears `selectedWaypointKey`.
- Selecting a waypoint sets `selectedWaypointKey` and clears `selectedClassId`.

- **Rationale**: Reuses the prominent, full-width panel beneath the star chart. Avoids adding a third floating panel and maintains high visual clarity.
- **Alternatives Considered**: Expanding the floating top-right Scanner HUD card. Rejected because the floating card is constrained to ~240px and obscures star chart geometry when enlarged.

### 3. Streamlined 3-Line Scanner HUD
The floating top-right HUD is trimmed to strictly:
- Line 1: `★ Waypoint (F,R,M)` (or `◇ Waypoint (F,R,M)`) + `Tier T`
- Line 2: `Harmonization: XF / YR / ZM`
- Line 3: `★ Milestone Attuned` or `✦ Next Waypoint • +1 <Archetype>`

- **Rationale**: Resolves header wrapping ("Potential Waypoint" / "Starlight Waypoint" spanning multiple lines) and eliminates vertical height overflow.

## Risks / Trade-offs

- **[Risk] Test Mock Breakage**: Existing unit test mocks that supply raw `UnitProgression` objects without `milestoneSelections`.
  - **Mitigation**: Keep `milestoneSelections` optional on `UnitProgression` so existing mocks remain valid. Add targeted mocks with `milestoneSelections` for drawer and progression tests.
- **[Risk] Selection State Ambiguity**: The player might be confused about whether a class or a waypoint is currently pinned.
  - **Mitigation**: `ConstellationSvg` renders an unmistakable diamond selection halo around the active waypoint, and the bottom Inspector card includes distinct header badging (`✦ WAYFARER MILESTONE` vs `✦ CLASS DETAILS`).
