# Tasks

## 1. Semantic Effect Outcome & Log Metadata Contracts

- [x] 1.1 Define the `EffectOutcome` discriminated union in `src/core/combat/types.ts`, replace `secondaryDetail` and `effectDetail` on `CombatLogMetadata` (`ATTACK`, `UTILITY`, `BUFF`, `PASSIVE`) with `effects?: readonly EffectOutcome[]`, and replace `ENVIRONMENT.effectDetail` with `detail?: string`; verify TypeScript compiles types in `src/core/combat/types.ts` cleanly.
- [x] 1.2 Replace `EffectExecutionResult.logDetail` with `effects?: readonly EffectOutcome[]` in `src/core/combat/effects/types.ts` and update `executeAbilityEffects` in `src/core/combat/effects/registry.ts` to aggregate handler `effects` and emit a deduplicated `CONTEXT` (`GRAZE_NEGATED`) outcome when Graze negates secondary effects; update `src/core/combat/effects/damageHandler.test.ts` and verify `npx vitest run src/core/combat/effects/damageHandler.test.ts` passes.

## 2. Effect Handler Refactoring

- [x] 2.1 Refactor condition, displacement, and collateral effect handlers (`conditionHandler.ts`, `knockbackHandler.ts`, `retreatHandler.ts`, `penetrateHandler.ts`, `positionSwapHandler.ts`, `teleportHandler.ts`, `cleaveHandler.ts`, `linePierceHandler.ts`) to emit structured `EffectOutcome` entries instead of `logDetail`, and verify `npx vitest run src/core/combat/effects/conditionHandler.test.ts src/core/combat/displacement.test.ts` passes after updating affected `displacement.test.ts` assertions.
- [x] 2.2 Refactor modifier, tempo, and passive/surge handlers (`modifierHandler.ts`, `ctbDelayHandler.ts`, `initiativeBoostHandler.ts`, `spellSculptHandler.ts`, `bloodFrenzyHandler.ts`, `damageHandler.ts`, `wildSurgeHandler.ts`) to emit structured `EffectOutcome` metadata (and attach `effects` on `wildSurgeHandler` log entries), and verify `npx vitest run src/core/combat/effects/` passes across all effect handler tests.

## 3. Unified Combat Logger & Resolver Pipeline

- [x] 3.1 Implement `formatEffectOutcomes` in `src/core/combat/combatLogger.ts` and replace `secondaryDetail` / `effectDetail` logger parameters with `effects?: readonly EffectOutcome[]` (and `detail?: string` on `logEnvironment`) so `CombatLogEntry.message` stays readable for Markdown exports; update `src/core/combat/combatLogger.test.ts` and verify `npx vitest run src/core/combat/combatLogger.test.ts` passes.
- [x] 3.2 Refactor `src/core/combat/resolver.ts` to convert elevation modifiers, aura penalties, AoE/cone splash hits and misses (including cone conditions), passive hook results, and Feline Grace fall immunity into `EffectOutcome[]` passed to `combatLogger`, removing string-concatenated `secondaryDetail`/`effectDetail` assembly; update `src/core/combat/resolution.test.ts` and `src/core/combat/resolver.test.ts` and verify `npx vitest run src/core/combat/resolution.test.ts src/core/combat/resolver.test.ts` passes.

## 4. Combat Log Compact Pills & Portal Hover Tooltips

- [x] 4.1 Create `src/ui/combat/EffectBadgeTooltip.tsx` mirroring the scroll-safe `createPortal` + `parentElement` positioning pattern of `AttackRollTooltip.tsx` and `DamageRollTooltip.tsx`, and add pill/tooltip CSS styles in `src/ui/combat/CombatArena.css` (`.log-effect-pills`, semantic tone pill classes, and tooltip popover styling).
- [x] 4.2 Refactor `src/ui/combat/CombatLogPanel.tsx` to replace `secondaryDetail`, `effectDetail`, and `formatPassiveDetail` with `effects?: readonly EffectOutcome[]` mapped via a pure `presentEffectOutcome` helper rendering compact color-coded pills and `EffectBadgeTooltip` hover breakdowns on `ATTACK`, `UTILITY`, `BUFF`, and `PASSIVE` cards (and `detail` on `ENVIRONMENT`); update `src/ui/combat/CombatLogPanel.test.ts` and verify `npx vitest run src/ui/combat/CombatLogPanel.test.ts` passes.

## 5. Release Versioning, Build & Regression Verification

- [x] 5.1 Bump `package.json` version from `0.17.3` to `0.18.0` and add an end-user facing `CHANGELOG.md` entry under `[0.18.0]` describing the new compact color-coded secondary effect pills and hover tooltips in the Astral Chronicle (without technical implementation details, file/CSS names, or internal task IDs).
- [x] 5.2 Run the full test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`) and verify all tests and TypeScript/Vite compilation succeed with zero errors.
