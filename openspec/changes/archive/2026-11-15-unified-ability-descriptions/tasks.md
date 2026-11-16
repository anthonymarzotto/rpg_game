# Tasks

## 1. Modifier Provenance & Attribution Preservation (`B.10`)

- [x] 1.1 Extend `src/core/types/modifier.ts` and `src/core/types/ability.ts` with `ModifierProvenanceTier` (`'NORMAL' | 'SHARD' | 'TRIAL'`), `tier` on `AbilityModifier` and `PropertyAttribution`, and optional `sourceTier` / `sourceName` on `AbilityEffect`; verify `tsc --noEmit` passes.
- [x] 1.2 Update `getEffectiveAbility` in `src/core/combat/modifiers.ts` to preserve incoming `attributions`, `appliedModifierIds`, and `attackRollBonus` across chained calls (including when `applicable.length === 0`), stamp provenance `tier` on attributions and patched/appended `AbilityEffect` entries, and export a `resolvePropertyTier` precedence helper (`Normal -> Shard -> In-Trial`); add unit tests in `src/core/combat/modifiers.test.ts` verifying chained shard + in-trial resolution and `B.10` preservation.

## 2. Deterministic Ability Formatter & Pure Flavor Catalog

- [x] 2.1 Implement `src/core/combat/abilityFormatter.ts` (`formatAbilityDescription`, `formatAbilityEffectClause`) generating Stat Strip pills, human-readable Effect Clauses for all 24 `AbilityEffectType` variants, and the Compact Mechanical 1-Liner with per-segment provenance tiers; verify with comprehensive unit tests in `src/core/combat/abilityFormatter.test.ts`.
- [x] 2.2 Update `Ability.description` strings across `src/data/packages/*.ts` to pure 1-sentence thematic flavor without hardcoded dice formulas or stat numbers, and add a catalog guardrail test in `src/data/packages/packages.test.ts` verifying that every registered ability formats cleanly and has no hardcoded dice notation in `description`; run `vitest run src/data/packages` to verify.

## 3. Shared Hybrid Ability UI Components & Surface Integration

- [x] 3.1 Create `src/ui/common/AbilityDescriptionBlock.tsx` and `src/ui/common/AbilityDescriptionBlock.css` providing `<AbilityHybridBody />`, `<AbilityCompactSummary />`, and `<AbilityHoverTooltip />` with `Normal -> Shard -> In-Trial` color styling; verify component rendering in unit tests.
- [x] 3.2 Update `ActionBar.tsx` and `UnitStatusCard.tsx` to use the shared Hybrid Ability Tooltip and Compact Mechanical 1-Liner (evaluating `getEffectiveAbility` for pinned unit skills and rendering the hover tooltip on pinned ability rows); update and run `src/ui/combat/ActionBar.test.tsx` and `src/ui/combat/UnitStatusCard.test.tsx`.
- [x] 3.3 Update `HeroProgressionDrawer.tsx` (Combat Manifest, Class Inspector, and Waypoint Inspector) and `OffNodeChoiceModal.tsx` (Domain Skill Draft tab) to render the Hybrid Ability view with dynamic Shard provenance highlights; update and run `src/ui/camp/HeroProgressionDrawer.test.tsx` and `src/ui/camp/OffNodeChoiceModal.test.tsx`.

## 4. Release Notes, Version Bump, & Build Verification

- [x] 4.1 Bump version to `0.19.0` in `package.json` and add an end-user facing `0.19.0` entry to `CHANGELOG.md` describing the unified ability cards, dynamic shard/combat boost highlighting, and pinned unit skill hover tooltips (no technical file/script/task names), and mark the item complete in `docs/plans/ACTIVE.md`.
- [x] 4.2 Run the full test suite (`npm test`) and production build (`npm run build`) and verify both exit with code 0.
