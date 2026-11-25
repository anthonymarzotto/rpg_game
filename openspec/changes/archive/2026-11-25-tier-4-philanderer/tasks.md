# Tasks

## 1. Core Types, Effect Triggers (`HIT_ONLY`, `GRAZE_ONLY`), and `PULL` Effect Handler

- [x] 1.1 Extend `ConditionType` (`'CHARMED' | 'BLINDED'`), `AbilityEffectType` (`'PULL'`), `EffectApplyCondition` (`'HIT_ONLY' | 'GRAZE_ONLY'`), `EffectOutcome` (`DISPLACEMENT` kind `'PULL'`), and `PassiveAuraEffect` (`arc?: 'FRONT'`) in `src/core/types/ability.ts`, `src/core/types/passive.ts`, and `src/core/combat/types.ts`, and verify TypeScript compilation succeeds.
- [x] 1.2 Update `executeAbilityEffects` in `src/core/combat/effects/index.ts` and `src/core/combat/abilityFormatter.ts` to support `'HIT_ONLY'`, `'GRAZE_ONLY'`, and `'PULL'` effect formatting, and verify `src/core/combat/abilityFormatter.test.ts` passes.
- [x] 1.3 Implement `src/core/combat/effects/pullHandler.ts` (1-hex pull toward actor via `getHexLine`, displacement immunity check, `clearZeroedInStacks`, and plunge fall damage evaluation when `dh <= -2`) and register `'PULL'` in `src/core/combat/effects/index.ts`, verifying with unit tests in `src/core/combat/effects/philandererMechanics.test.ts`.

## 2. `CHARMED`, `BLINDED`, and `Captivating Presence` Directional Aura

- [x] 2.1 Implement `CHARMED` (`stackingPolicy: 'OVERRIDE_SOURCE'`, active faction switch `targetCu.faction = actorCu.faction`, persistence through damage, and base faction restoration on expiry/removal) and `BLINDED` (`stackingPolicy: 'REFRESH_DURATION'`, outgoing Disadvantage, and disabled front-arc Stealth detection) in `src/core/combat/conditions.ts`, `src/core/combat/effects/conditionHandler.ts`, and `src/core/combat/turnClock.ts`, verifying with unit tests in `src/core/combat/conditions.test.ts`.
- [x] 2.2 Enforce `BLINDED` range clamping (`Math.min(effectiveRange, 1)`) in `src/core/combat/validator.ts` (`canExecuteAbility` and `getAbilityRangeCoords`) and preserve base faction (`cu.unit.faction`) in `src/core/combat/objectives.ts` and `src/ui/combat/useCombatSimulation.ts` (`checkEncounterProgression`), verifying with unit tests in `src/core/combat/validator.test.ts` and `src/core/combat/objectives.test.ts`.
- [x] 2.3 Extend `evaluateTargetAuras` in `src/core/combat/auras.ts` to evaluate directional attacker-debuff auras (`targetScope: 'ENEMIES'`, `arc: 'FRONT'`, `radius: 3`, `attackRollPenalty: 2` for `Captivating Presence`) and verify with unit tests in `src/core/combat/auras.test.ts`.

## 3. Philanderer Class Package, AI Heuristics, Campaign & UI Integration

- [x] 3.1 Author `src/data/packages/philanderer.ts` (`BILLET_DOUX`, `BECKONING_GLANCE`, `LOOKING_GLASS_GLARE`, `CAPTIVATING_PRESENCE`, `PHILANDERER_PACKAGE` with `aiProfile: 'SUPPORT'`) and register it in `src/data/packages/index.ts`, verifying catalog tests in `src/data/packages/packages.test.ts` and `src/core/units/packages.test.ts`.
- [x] 3.2 Add `'philanderer'` to `TIER4_CLASSES` in `src/core/campaign/encounterGenerator.ts` and add AI scoring support for `Billet-Doux` (`CHARMED`), `Beckoning Glance` (`PULL` + `EXPOSED`), and `Looking-Glass Glare` (`BLINDED`) in `src/core/ai/decisionEngine.ts`, verifying with `src/core/campaign/encounterGenerator.test.ts` and `src/core/ai/decisionEngine.test.ts`.
- [x] 3.3 Whitelist `'84_human_male'` and add the `philanderer` Velvet Rose badge palette (`{ primary: '#9f1239', border: '#f43f5e' }`) in `src/ui/combat/tokenAssets.ts`, and register `CHARMED` and `BLINDED` condition badges/tooltips in `src/ui/combat/conditionBadges.ts` and `src/ui/combat/EffectBadgeTooltip.tsx`, verifying with `src/ui/combat/tokenAssets.test.ts` and `src/ui/combat/CombatLogPanel.test.ts`.

## 4. End-to-End Integration, Release Notes & Build Verification

- [x] 4.1 Create `src/core/combat/philandererIntegration.test.ts` covering `Billet-Doux` (Crit 2T Charm, Hit 1T Charm, Graze 1T Exposed, Miss, base-faction objective preservation), `Beckoning Glance` (`PULL 1` + `FORCE_FACING` + `EXPOSED` + ledge fall damage), `Looking-Glass Glare` (`1d4 + Focus` + `BLINDED` range-1 clamp & Disadvantage), and `Captivating Presence` (3-hex front-arc `-2` attack roll aura), and run `npm test`.
- [x] 4.2 Bump version to `0.22.0` in `package.json` and add an end-user facing `0.22.0` release notes entry in `CHANGELOG.md` describing the new Tier 4 Philanderer class and its abilities (strictly end-user facing with no technical implementation details, file/script names, or internal task IDs), verifying `src/ui/start/changelogParser.test.ts` passes.
- [x] 4.3 Run `npm run build` and verify the full TypeScript and production bundle build succeeds with zero errors.
