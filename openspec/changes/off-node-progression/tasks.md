# Tasks

## 1. Harmonization Domain Engine & Calculations

- [ ] 1.1 Implement `isOffNodeCoordinate(points)` and `getHarmonizationSurge(points)` in `src/core/progression/harmonization.ts`, verifying F+R, F+M, R+M, and Tri-hybrid formulas with unit tests
- [ ] 1.2 Extend `UnitProgression` in `src/core/types/class.ts` with `offNodeMilestones: readonly string[]` and update factory and mock initializers
- [ ] 1.3 Update `advanceArchetypeLevel()` in `src/core/progression/pyramid.ts` and `transitions.ts` to award harmonization surges to derived vitals and record off-node milestone keys, verifying with tests

## 2. Off-Node Choice Modal (Domain Draft vs. Ability Overclock)

- [ ] 2.1 Implement `getEligibleDomainDrafts(hero, archetype)` to query available uncollected domain skills from existing class packages, verifying pool extraction tests
- [ ] 2.2 Create `src/ui/camp/OffNodeChoiceModal.tsx` presenting Breadth (Domain Skill Draft) and Depth (Ability Overclock) selection options with responsive styling
- [ ] 2.3 Integrate `OffNodeChoiceModal` into `HeroProgressionDrawer.tsx`, triggering upon off-node level up and updating the hero's wildcard pool or applied overclocks in the campaign state

## 3. Constellation Star Chart Luminous Waypoints

- [ ] 3.1 Implement off-node waypoint geometry calculation in `src/ui/pyramid/geometry.ts` mapping $(F, R, M)$ coordinates to star chart $(x, y)$ positions along facet boundaries
- [ ] 3.2 Update `src/ui/pyramid/ConstellationSvg.tsx` to render illuminated Starlight Waypoints for unlocked and eligible off-nodes with celestial glow
- [ ] 3.3 Update `constellationPathD` polyline calculation in `HeroProgressionDrawer.tsx` to route through unlocked Starlight Waypoints seamlessly

## 4. UI Preview & Wayfarer Titles

- [ ] 4.1 Update level-up advancement buttons in `HeroProgressionDrawer.tsx` to preview off-node surge milestones (e.g. `✦ Hybrid Surge: Skirmisher`)
- [ ] 4.2 Implement `getHeroDisplayTitle(unit)` in `heroUtils.ts` appending Wayfarer ranks (`Warrior • Wayfarer I` through `VI`) and update hero cards and inspector header
- [ ] 4.3 Update `ConstellationSvg` Node Scanner HUD to display Starlight Waypoint coordinates and harmonization surge summaries on hover

## 5. End-to-End Verification

- [ ] 5.1 Run full Vitest test suite (`npm test`) across all combat, progression, and campaign suites to verify 100% test pass rate with zero regressions
- [ ] 5.2 Author integration test verifying a recruit advancing along the Bard centroid path (L1 Warrior -> L2 Off-Node -> L3 Off-Node) earns harmonization surges, drafts a domain skill, overclocks an ability, and updates Wayfarer titles
