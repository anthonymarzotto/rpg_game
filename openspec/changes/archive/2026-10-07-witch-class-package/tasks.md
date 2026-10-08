# Tasks

## 1. Engine Infrastructure: Auras & Reverse Facing

- [x] 1.1 Extend `PassiveTrait` with `PassiveAuraEffect` (`radius`, `targetScope`, `attackRollPenalty`) in `src/core/types/passive.ts` and verify typechecking passes
- [x] 1.2 Implement target-centric defensive aura evaluation in `src/core/combat/attackRoll.ts` / `src/core/combat/resolver.ts` so attacks targeting allies within 2 hexes of `Misfortune Ward` suffer -2 to their attack roll, and verify with unit tests
- [x] 1.3 Add `FORCE_FACING_AWAY` to `AbilityEffectType` in `src/core/types/ability.ts` and handle facing reversal in `src/core/combat/resolver.ts` to rotate target 180° away from the attacker upon hit, and verify with unit tests

## 2. Witch Class Package Authoring

- [x] 2.1 Author `BALEFUL_HEX`, `POPPET_NEEDLE`, `WITCHS_TALISMAN`, `MISFORTUNE_WARD`, and `WITCH_PACKAGE` in `src/data/packages/witch.ts` conforming to the spec
- [x] 2.2 Register `WITCH_PACKAGE` in `src/data/packages/index.ts`, register abilities in `src/data/abilities.ts`, map `witch` to `SUPPORT` AI profile in `src/core/ai/heuristics.ts`, and update wildcard progression in `src/core/progression/harmonization.ts`

## 3. Combat Integration & Verification

- [x] 3.1 Author `src/core/combat/witchIntegration.test.ts` verifying package loadout resolution, Baleful Hex (poison + CTB delay), Poppet Needle (facing reversal + resolve shred), Witch's Talisman (+25 CTB ticks + 2 Speed on ally), Misfortune Ward aura penalties, and AI profile resolution
- [x] 3.2 Execute full test suite (`cmd.exe /c npm test`) and production build check (`cmd.exe /c npm run build`) to ensure zero regressions across all packages
