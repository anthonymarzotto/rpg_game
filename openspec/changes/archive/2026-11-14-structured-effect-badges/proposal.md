# Proposal

## Why

Secondary effect details in the Combat Log—such as applied conditions, displacements, wall/unit collisions, fall damage, AoE splash results, stat modifiers, and roll context notes—are currently emitted by `EffectHandler` implementations and `resolver.ts` as pre-formatted, bracketed emoji strings (`logDetail`, `secondaryDetail`, `effectDetail`). Because these strings flatten structured combat outcomes into raw text, the Astral Chronicle (`CombatLogPanel`) can only render them as a single unstyled text line, preventing color-coded visual pills, structured hover tooltips, and clean separation between combat logic and UI presentation.

## What Changes

- **Semantic Effect Outcome Model (`EffectOutcome`) — BREAKING**:
  - Replace `EffectExecutionResult.logDetail` with a structured `effects?: readonly EffectOutcome[]` semantic discriminated union covering conditions, forced facing, displacements (including immunity/resistance), collisions (obstacle/cliff/boundary/unit collateral), fall damage (including negated fall damage), stat/ability modifiers, initiative boosts/delays, collateral/splash hits, and roll/execution context notes (elevation, aura penalties, Graze negation).
  - Refactor all 14 `EffectHandler` implementations (`conditionHandler`, `knockbackHandler`, `retreatHandler`, `penetrateHandler`, `positionSwapHandler`, `teleportHandler`, `modifierHandler`, `cleaveHandler`, `linePierceHandler`, `ctbDelayHandler`, `initiativeBoostHandler`, `spellSculptHandler`, `bloodFrenzyHandler`, `damageHandler`) and `executeAbilityEffects` to emit `EffectOutcome` entries instead of concatenated strings, and unify `wildSurgeHandler` with the same structured result contract where appropriate.
  - Refactor `resolver.ts` splash resolution, elevation/aura context notes, and passive fall-negation logging to emit `EffectOutcome` entries through the same unified pipeline.
- **Unified Combat Log Metadata & Plain-Text Formatting — BREAKING**:
  - Replace `secondaryDetail` and `effectDetail` on `CombatLogMetadata` (`ATTACK`, `UTILITY`, `BUFF`, `PASSIVE`) with `effects?: readonly EffectOutcome[]` (and simplify `ENVIRONMENT` detail to a clean `detail?: string`).
  - Provide a pure formatter that derives plain-text `CombatLogEntry.message` summaries from `EffectOutcome[]` inside `combatLogger` so diagnostic Markdown exports (`reportGenerator.ts`) and text logs stay complete and accurate without duplicating string formatting inside handlers.
- **Compact Effect Pills & Hover Tooltips in Combat Log (`I.2`)**:
  - Render `effects` in `CombatLogPanel` as a row of compact, color-coded pills (e.g., condition, displacement, collision/fall, collateral/splash, buff/modifier, initiative, context) and remove the `formatPassiveDetail` bracket-stripping regex.
  - Introduce a shared portal-based `EffectBadgeTooltip` (mirroring `AttackRollTooltip` and `DamageRollTooltip` with scroll-safe positioning) so hovering any compact pill reveals full structured details (such as DoT damage per turn and duration, destination coordinates, collision/bystander HP, or splash roll vs. defense).

## Capabilities

### New Capabilities
<!-- None; this change refines existing effect execution and combat log capabilities. -->

### Modified Capabilities
- `composable-abilities`: Replace plain-text `logDetail` on `EffectExecutionResult` and `secondaryDetail` strings on combat log metadata with a unified semantic `EffectOutcome` payload produced by effect handlers and ability splash/context resolution.
- `arena-timeline-ux`: Render structured `EffectOutcome` metadata on Combat Log cards (`ATTACK`, `UTILITY`, `BUFF`, `PASSIVE`) as compact, color-coded pills with portal-based hover detail tooltips (`EffectBadgeTooltip`), replacing raw bracketed text strings and regex-parsed passive chips.

## Impact

- **Version Assessment (SemVer)**: Minor bump from `0.17.3` to `0.18.0`. While the game is in pre-1.0 active development, this change introduces a **BREAKING** replacement of `EffectExecutionResult.logDetail` and `CombatLogMetadata` text-detail fields (`secondaryDetail`, `effectDetail`) alongside a new player-facing UI feature (compact secondary effect pills and interactive hover breakdown tooltips across the Astral Chronicle).
- **Affected Code**:
  - `src/core/combat/effects/types.ts`, `src/core/combat/effects/registry.ts`, and `src/core/combat/effects/*Handler.ts`
  - `src/core/combat/types.ts`, `src/core/combat/combatLogger.ts`, and `src/core/combat/resolver.ts`
  - `src/ui/combat/CombatLogPanel.tsx`, new `src/ui/combat/EffectBadgeTooltip.tsx`, and `src/ui/combat/CombatArena.css`
  - Affected unit tests (`src/core/combat/effects/*.test.ts`, `src/core/combat/combatLogger.test.ts`, `src/core/combat/displacement.test.ts`, `src/core/combat/resolution.test.ts`, `src/core/combat/resolver.test.ts`, `src/ui/combat/CombatLogPanel.test.ts`)
- **Active Plan Tracking**: `I.2` in `docs/plans/ACTIVE.md`
