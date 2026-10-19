# Proposal: Attuned Waypoint Selection Display & Milestone Inspector

## Why
Currently, hovering an attuned Starlight Waypoint in the Constellation displays a generic list of offered attunements rather than the specific rewards the hero actually selected (the defensive attunement and the domain skill or astral shard). Furthermore, the floating top-right Scanner HUD card suffers from line-wrapping and height bloat (e.g. titles spanning two lines, attunement lists wrapping when Zenith is included). Waypoints currently cannot be clicked or pinned into the persistent inspector panel below the star chart.

By recording first-class milestone selection provenance and decoupling the deep reward breakdown into the bottom Inspector panel upon click, we make the floating Scanner HUD minimal, fast, and un-bloated, while giving players a clear, rich view of past milestone choices and upcoming potential options.

## What Changes
- **Provenance Record on Unit Progression**: Store explicit milestone choices (`milestoneSelections: Record<string, MilestoneSelection>`) recording the exact defensive attunement and specialization reward (domain ability or augment shard) selected at each off-node coordinate. (**BREAKING**)
- **Minimal Floating Scanner HUD**: Streamline the floating hover HUD to 3 concise lines (Title & Tier, Harmonization, and Status) without multi-line wrapping or the verbose/wrapped attunement options list.
- **Interactive Waypoint Pinning**: Enable click selection on constellation waypoints (`selectedWaypointKey`), updating the bottom persistent Inspector panel to display the selected waypoint.
- **Waypoint Milestone Inspector Card**:
  - **For Attuned Waypoints**: Display the chosen defensive attunement with its active stat bonuses and the chosen specialization (the specific Astral Augment Shard or Domain Ability unlocked).
  - **For Potential Waypoints**: Display an abbreviated overview of upcoming choices (the defensive attunement triad and the domain skill draft vs shard forge choice) without cluttering the floating HUD.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `off-node-progression`: Updates requirement for recording milestone choices to capture explicit provenance on unit progression and specifies the reward details displayed for attuned waypoints.
- `hero-progression-drawer`: Updates requirements for the Constellation Star Chart and Inspector panels to support waypoint clicking/pinning, minimal floating scanner display, and rich bottom milestone inspection.

## Impact
- **Types**: `UnitProgression` in `src/core/types/class.ts` gains `milestoneSelections`.
- **Transitions**: `allocateCampArchetypePoint` and `allocateArchetypePoint` persist the `MilestoneSelection` record.
- **UI Components**:
  - `HeroProgressionDrawer.tsx`: Adds waypoint selection state, renders `WaypointInspectorCard`, and tightens the scanner HUD.
  - `ConstellationSvg.tsx`: Adds `onClickWaypoint` and active selection diamond styling.
  - Test suites & mocks: Update mock units and add assertions for waypoint inspection.
