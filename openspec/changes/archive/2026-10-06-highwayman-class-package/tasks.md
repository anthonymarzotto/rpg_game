# Tasks

## 1. Core Passive Trait Extension

- [x] 1.1 Add optional `targetArmorBonus?: { minArmor: number; flatDamageBonus: number }` to `PassiveTrait` in `src/core/types/passive.ts` and verify typechecking passes
- [x] 1.2 Implement target effective armor evaluation in `resolveDamage()` in `src/core/combat/damageEngine.ts` and add unit tests verifying bonus damage when target effective armor >= minArmor

## 2. Highwayman Class Package Authoring

- [x] 2.1 Author `POINT_BLANK_BUCKSHOT`, `STAND_AND_DELIVER`, `GALLANT_FLOURISH`, `HIGHWAY_TOLL`, and `HIGHWAYMAN_PACKAGE` in `src/data/packages/highwayman.ts` conforming to the spec
- [x] 2.2 Register `HIGHWAYMAN_PACKAGE` in `src/data/packages/index.ts` and include domain abilities in `src/core/progression/harmonization.ts` wildcard progression

## 3. Combat Integration & Verification

- [x] 3.1 Author `src/core/combat/highwaymanIntegration.test.ts` verifying package loadout resolution, buckshot knockback/collision, stand and deliver CTB delay + armor debuff, gallant flourish self-evasion buff, and highway toll anti-armor scaling
- [x] 3.2 Execute full test suite (`npm test`) and production build check (`npm run build`) to ensure zero regressions across all packages
