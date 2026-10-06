# Tasks: Cavalier Class Package

## 1. Cavalier Package & Ability Mechanics

- [x] 1.1 Create `src/data/packages/cavalier.ts` defining `LANCE_CHARGE`, `RIDE_THROUGH`, `FLAMBOYANT_FLOURISH`, and `IMPACT_VELOCITY` with AI profile `BRAWLER`, and verify file compilation with TypeScript.
- [x] 1.2 Implement straight-line rush validation and execution for `Lance Charge` in `src/core/combat/validator.ts` and `src/core/combat/resolver.ts`, and verify via unit tests that only unobstructed straight lines of 2–3 hexes execute.
- [x] 1.3 Implement penetration displacement for `Ride-Through` in `src/core/combat/`, and verify via unit tests that actor displaces through the target to the rear hex when clear and remains stationary when blocked.
- [x] 1.4 Add `collisionDamageBonus?: number` to `src/core/types/passive.ts`, implement `resolveCollisionDamage` in `src/core/combat/damageEngine.ts`, delegate collision math from `src/core/combat/effects/knockbackHandler.ts`, and verify via unit tests that wall-slam and unit collision damage resolves with +2 bonus damage.

## 2. Global Registration & Presentation Integration

- [x] 2.1 Register `CAVALIER_PACKAGE` in `src/data/packages/index.ts` (`CLASS_PACKAGES`, `ABILITIES_BY_ID`, `PASSIVES_BY_ID`), and verify unit loadout resolution can equip Cavalier active class and wildcard abilities.
- [x] 2.2 Whitelist `01_human_male` in `src/ui/combat/tokenAssets.ts`, and verify `resolveTokenAssetPath` resolves valid sprite URLs for Cavalier units across all 6 hex directions.
- [x] 2.3 Author headless combat simulation test suite in `src/core/combat/cavalierIntegration.test.ts` covering full round execution of all Cavalier abilities and passive traits, verifying all tests pass.
