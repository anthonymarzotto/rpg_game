# Tasks: Signature Ability Exclusivity & Mobility Refactor

## 1. Signature Ability Exclusivity in Loadouts & UI

- [x] 1.1 Remove `allowedAbilityIds.add(pkg.signatureAbility.id)` from `src/core/units/loadout.ts` and add unit tests in `src/core/units/loadout.test.ts` verifying that equipping any class's signature ability into a wildcard slot fails validation.
- [x] 1.2 Update `src/ui/camp/HeroProgressionDrawer.tsx` to remove signature abilities from the wildcard ability dropdown list, and verify in `src/ui/camp/HeroProgressionDrawer.test.tsx` that only domain abilities and unlocked off-node abilities are presented.
- [x] 1.3 Audit and migrate simulation and sandbox configurations (`src/core/combat/squadSimulation.ts`, `src/data/encounters/noviceSandbox.ts`, and `src/core/campaign/tier2ProgressionIntegration.test.ts`), swapping illegal signature wildcards (such as `sneak_attack`) to valid domain skills (such as `skirmish`).

## 2. Mobility Refactor (Shadow Step & Rooftop Vault)

- [x] 2.1 Add `sameElevationOnly?: boolean` to `Ability` in `src/core/types/ability.ts`, set `sameElevationOnly: true` on `SHADOW_STEP` in `src/data/packages/thief.ts`, and enforce elevation matching in `src/core/combat/validator.ts`. Verify with unit tests in `src/core/combat/abilities12.test.ts` that both upward cliff ascents ($\Delta h > 0$) and downward ledge descents ($\Delta h < 0$) are rejected while same-elevation teleports ($\Delta h = 0$) succeed.
- [x] 2.2 Update `ROOFTOP_VAULT` in `src/data/packages/catBurglar.ts` to `range: 3`, and update `src/core/combat/catBurglarIntegration.test.ts` and `src/core/units/packages.test.ts` to verify 3-hex vaulting over obstacles and onto high ground cliffs.
- [x] 2.3 Update AI decision engine in `src/core/ai/decisionEngine.ts` to filter out differing-elevation candidates for abilities with `sameElevationOnly: true`, and verify in `src/core/ai/decisionEngine.test.ts` that AI Thieves do not attempt invalid cliff teleports while Cat-Burglars execute the 3-AP Solo Heist across 3 hexes.

## 3. Full Suite Verification & Documentation

- [x] 3.1 Run full project test suite (`npm test`) and verify zero regressions across progression, combat, camp, and AI tests.
- [x] 3.2 Update `docs/plans/ACTIVE.md` (resolving item 2.1) and ensure class architecture documentation notes signature ability exclusivity.
