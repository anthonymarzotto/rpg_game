# Tasks

## 1. Harmonization Domain Engine & Calculations

- [x] 1.1 Implement `isOffNodeCoordinate(points)`, `WAYFARER_ATTUNEMENTS` definitions, and `applyWayfarerAttunement(vitals, attunementId)` in `src/core/progression/harmonization.ts`, verifying Bastion, Stride, Ward, and Zenith formulas with unit tests
- [x] 1.2 Extend `UnitProgression` with `offNodeMilestones: readonly string[]` and `UnitLoadout` with `earnedShards: readonly string[]` and `slotAugments?: Readonly<Record<number, readonly string[]>>`, updating factory and mock initializers
- [x] 1.3 Update `advanceArchetypeLevel()` in `src/core/progression/pyramid.ts` and `transitions.ts` to support applying chosen Wayfarer Attunements to derived vitals and record off-node milestone keys, verifying with tests

## 2. Two-Step Off-Node Choice Modal & Slot-Level Socketing

- [x] 2.1 Implement `getEligibleDomainUnlocks(hero, archetype)` to query available uncollected domain skills filtered by `tier <= hero.progression.currentLevel`, verifying tier-gated extraction tests
- [x] 2.2 Author `ASTRAL_AUGMENT_SHARDS` catalog in `src/core/progression/harmonization.ts` (Starlight Lens, Astral Reach, Supernova Flare, Impact Shard, Venom Shard, Static Shard) mapping to `AbilityModifier` definitions
- [x] 2.3 Create `src/ui/camp/OffNodeChoiceModal.tsx` featuring Step 1 (Wayfarer Attunement) and Step 2 (Domain Skill Unlock vs. Astral Augment Shard Selection) with responsive celestial styling
- [x] 2.4 Update `HeroProgressionDrawer.tsx` to render 2 socket pips per ability slot, supporting socketing/unsocketing earned shards and feeding slot modifiers into `resolveUnitLoadout()`

## 3. Constellation Star Chart Luminous Waypoints

- [x] 3.1 Implement off-node waypoint geometry calculation in `src/ui/pyramid/geometry.ts` mapping $(F, R, M)$ coordinates to star chart $(x, y)$ positions along facet boundaries
- [x] 3.2 Update `src/ui/pyramid/ConstellationSvg.tsx` to render illuminated Starlight Waypoints for unlocked and eligible off-nodes with celestial glow
- [x] 3.3 Update `constellationPathD` polyline calculation in `HeroProgressionDrawer.tsx` to route through unlocked Starlight Waypoints seamlessly

## 4. UI Preview & Wayfarer Titles

- [x] 4.1 Update level-up advancement buttons in `HeroProgressionDrawer.tsx` to preview off-node milestones (e.g. `✦ Wayfarer Milestone`)
- [x] 4.2 Implement `getHeroDisplayTitle(unit)` in `heroUtils.ts` appending Wayfarer ranks (`Warrior • Wayfarer I` through `VI`) and update hero cards and inspector header
- [x] 4.3 Update `ConstellationSvg` Node Scanner HUD to display Starlight Waypoint coordinates and available Wayfarer Attunements on hover

## 5. End-to-End Verification

- [x] 5.1 Run full Vitest test suite (`npm test`) across all combat, progression, and campaign suites to verify 100% test pass rate with zero regressions
- [x] 5.2 Author integration test verifying a recruit advancing along the Bard centroid path (L1 Warrior -> L2 Off-Node -> L3 Off-Node) selects Wayfarer Attunements, unlocks a tier-gated domain skill, sockets an augment shard to an ability slot, and verifies effective ability modifiers in combat
