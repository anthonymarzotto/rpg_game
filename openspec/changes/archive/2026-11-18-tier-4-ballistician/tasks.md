# Tasks: Tier 4 Ballistician Class Kit & Token Integration

## 1. Combat Engine: Deadzones, `Zeroed In` Calibration & `TELEMETRY`

- [x] 1.1 Add `minRange?: number` to `Ability` in `src/core/types/ability.ts`, enforce `dist >= minRange` in `src/core/combat/validator.ts` and `src/core/combat/targetPreview.ts`, and format minimum range in `src/core/combat/abilityFormatter.ts` (e.g., `Range 2–4`), verifying with unit tests in `src/core/combat/abilityFormatter.test.ts` and `src/core/combat/targetPreview.test.ts`.
- [x] 1.2 Implement `Zeroed In` stationary stack tracking (`zeroedInStacks` `0..3` and `movedThisTurn`) on `CombatUnit`, hook turn-end stack accumulation in `src/core/combat/turnClock.ts`, clear stacks on voluntary movement/teleportation/forced displacement, and apply `+1 Range` (`range >= 2`), `+1 Attack Roll`, `-1 Evasion` per stack plus `+1 AoE Radius` (`aoeRadius >= 1`) at 3 stacks, verifying with unit tests in `src/core/combat/effects/ballisticianMechanics.test.ts`.
- [x] 1.3 Add `TELEMETRY` condition (`durationTurns: 2`) to `src/core/types/ability.ts` and `src/core/combat/conditions.ts`, and update `validator.ts`, `targetPreview.ts`, and `attackRoll.ts` so ranged/spell attacks (`range >= 2`) targeting an enemy with `TELEMETRY` gain `+2` maximum targeting distance and ignore low-ground elevation and Bastion ranged cover penalties, verifying with unit tests in `src/core/combat/effects/ballisticianMechanics.test.ts`.

## 2. Combat Engine: `Siege Barrage` Delayed Bombardment & `Shrapnel Rubble` Zones

- [x] 2.1 Add `roughTerrainHexKeys` (`+2 MP` entry cost per rubble hex) to `MovementOptions` and `getReachableHexInfo` in `src/core/grid/arena.ts`, and wire active `Shrapnel Rubble` hex hazards from `EncounterState` into movement validation, previews, and resolution, verifying with pathfinding unit tests in `src/core/grid/grid.test.ts`.
- [x] 2.2 Implement `Shrapnel Canister` effect resolution in `src/core/combat/resolver.ts` to immediately strip `STEALTH` from units inside the blast radius and spawn 2-turn `Shrapnel Rubble` hex hazards across the blast zone, verifying with unit tests in `src/core/combat/effects/ballisticianMechanics.test.ts`.
- [x] 2.3 Implement `Siege Barrage` delayed bombardment zone registration on `EncounterState` upon execution and turn-start detonation (`2d8 + Force` physical damage vs Evasion using launch-time Finesse/Force snapshot, persisting if the caster is displaced or defeated), verifying with unit tests in `src/core/combat/effects/ballisticianMechanics.test.ts`.

## 3. Ballistician Class Package & Progression Catalog

- [x] 3.1 Author `src/data/packages/ballistician.ts` defining `BALLISTICIAN_PACKAGE`, `SIEGE_BARRAGE`, `SHRAPNEL_CANISTER`, `SIGHTING_BOLT`, and `ZEROED_IN`, and register them in `src/data/packages/index.ts` (`CLASS_PACKAGES`, `ABILITIES_BY_ID`, `PASSIVES_BY_ID`).
- [x] 3.2 Add package and progression integration tests in `src/core/units/packages.test.ts` and `src/core/combat/ballisticianIntegration.test.ts` verifying class resolution, wildcard ability equipping, and end-to-end combat execution.

## 4. Token Whitelist, Badge Palette & Arena Zone Rendering

- [x] 4.1 Whitelist `65_human_male` in `AVAILABLE_PIXEL_TOKENS` and configure `CLASS_BADGE_PALETTES.ballistician` with Engineer Emerald (`#065f46`) and Safety Crimson (`#e11d48`) in `src/ui/combat/tokenAssets.ts`, verifying with unit tests in `src/ui/combat/tokenAssets.test.ts`.
- [x] 4.2 Render hex visual highlights/indicators and hover tooltip details for active `Siege Barrage` bombardment zones and `Shrapnel Rubble` rough terrain on the arena board in `src/ui/combat/`, verifying clean rendering in UI/component tests.

## 5. AI Heuristics & Release Verification

- [x] 5.1 Update `SNIPER` AI decision heuristics in `src/core/ai/decisionEngine.ts` and `src/core/ai/heuristics.ts` to respect `minRange`, preserve `Zeroed In` stacks when targets are already in range, avoid ending turns inside hostile `Siege Barrage` zones, and evaluate `Shrapnel Canister` / `Sighting Bolt` / `Siege Barrage` combos, verifying with AI unit tests in `src/core/ai/decisionEngine.test.ts`.
- [x] 5.2 Bump version to `0.20.0` in `package.json` and update `CHANGELOG.md` with strictly end-user facing release notes describing the new Ballistician class, its abilities, and battlefield zone mechanics.
- [x] 5.3 Run `npm test` and `npm run build` to verify all unit/integration tests pass and the production bundle compiles cleanly.
