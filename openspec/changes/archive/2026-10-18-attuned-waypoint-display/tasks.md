# Tasks: Attuned Waypoint Display & Milestone Inspector

## 1. Data Model & Milestone Provenance Ledger

- [x] 1.1 Define `MilestoneReward` and `MilestoneSelection` types in `src/core/types/class.ts`, add `milestoneSelections?: Readonly<Record<string, MilestoneSelection>>` to `UnitProgression`, and verify types compile with `cmd.exe /c npm run build`.
- [x] 1.2 Update `allocateArchetypePoint` in `src/core/progression/pyramid.ts` and `allocateCampArchetypePoint` in `src/core/campaign/transitions.ts` to record the complete `MilestoneSelection` entry upon confirming off-node modal choices, and verify progression tests pass with `cmd.exe /c npm test src/core/progression/classes.test.ts src/core/campaign/offNodeProgressionIntegration.test.ts`.

## 2. Minimal Floating Scanner HUD

- [x] 2.1 Update the floating Scanner HUD in `src/ui/camp/HeroProgressionDrawer.tsx` to streamline the waypoint card into 3 single lines: Title & Tier (`★ Waypoint (F,R,M) Tier T` / `◇ Waypoint (F,R,M) Tier T`), Harmonization, and Status, removing the wrapped `Attunements:` list and multi-line title wrapping.
- [x] 2.2 Add unit tests in `src/ui/camp/HeroProgressionDrawer.test.tsx` verifying that hovering an attuned or eligible waypoint produces the compact 3-line format without multi-line wrapping or option lists, and verify with `cmd.exe /c npm test src/ui/camp/HeroProgressionDrawer.test.tsx`.

## 3. Interactive Waypoint Pinning in ConstellationSvg

- [x] 3.1 Add `selectedWaypointKey?: string | null` and `onClickWaypoint?: (coordKey: string) => void` props to `ConstellationSvg.tsx`, attach click handlers, and render an active diamond selection halo when a waypoint is selected.
- [x] 3.2 Update `ConstellationSvg.css` with active waypoint selection halo styling, and verify SVG click triggers callback via unit test in `src/ui/camp/HeroProgressionDrawer.test.tsx`.

## 4. Persistent Waypoint Milestone Inspector Panel

- [x] 4.1 Update `HeroProgressionDrawer.tsx` selection state to support pinning waypoints (`selectedWaypointKey`) alongside classes (`selectedClassId`), mutually switching between Class and Waypoint inspection when nodes are clicked on the chart.
- [x] 4.2 Implement `WaypointInspectorCard` in `HeroProgressionDrawer.tsx` rendering:
  - For attuned waypoints: coordinate, level reached, harmonization, chosen defensive attunement with stat deltas, and chosen specialization reward (unlocked domain ability details or forged astral shard details).
  - For potential waypoints: coordinate, harmonization, status, and abbreviated overview of choices (attunement triad + domain ability draft vs shard forge).
- [x] 4.3 Add comprehensive unit tests in `src/ui/camp/HeroProgressionDrawer.test.tsx` covering clicking and inspecting both attuned and potential waypoints in the bottom panel, verifying switching between class and waypoint inspection, and verify all test suites pass with `cmd.exe /c npm test`.
