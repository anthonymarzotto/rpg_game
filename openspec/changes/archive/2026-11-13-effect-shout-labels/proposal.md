# Proposal

## Why

Currently, [`collectResolutionFloatingTexts`](file:///c:/Repos/rpg_game/src/ui/combat/useFloatingCombatText.ts#L176-L185) maps every `DISPLACEMENT` event whose `kind` is not `'TELEPORT'` or `'RETREAT'` to a hardcoded `'KNOCKBACK!'` fallback. As a result, Cavalier's `Ride-Through` (B.17), `Lance Charge` (actor dash), and Dragoon's `Dragon Dive` (`kind: 'CHARGE'`) all shout `"KNOCKBACK!"`, and Shield-bearer's `Intercept Step` (B.18, `kind: 'SWAP'`) shouts `"KNOCKBACK!"` over both the Shield-bearer and the rescued ally.

We need a clean, declarative effect-level shout system where visually obvious movement stays quiet unless opted in, non-obvious or secondary effects can specify custom shouts (including per-unit control for swaps), and automated catalog guardrails prevent future abilities from shipping with accidental or forgotten shouts.

## What Changes

- **Declarative Effect Shout Contract**: Add an optional `shout` configuration on `AbilityEffect` (`string | null | { actor?: string | null; target?: string | null }`) so any effect can specify a custom floating combat text label, explicitly suppress its floater (`null`), or inherit the effect/displacement kind's default (`undefined`).
- **Unified Event Label Plumbing**: Add optional `label?: string | null` to `DISPLACEMENT` (and secondary utility events such as `CTB_DELAY` on `CombatEvent`, mirroring `DAMAGE.label`), allowing effect handlers and `resolver.ts` to pass per-unit shout overrides or suppressions cleanly.
- **Exhaustive Displacement Floater Defaults (No Catch-All Fallback)**: Replace the `'KNOCKBACK!'` catch-all in `useFloatingCombatText.ts` with an exhaustive `Record<DisplacementKind, ...>` mapping where `'CHARGE'` defaults to `null` (silent), `'KNOCKBACK'` defaults to `'KNOCKBACK!'`, `'RETREAT'` defaults to `'RETREAT!'`, `'TELEPORT'` defaults to `'TELEPORT!'`, `'PULL'` defaults to `'PULL!'`, and `'SWAP'` defaults to `'SWAP!'` on the actor and `null` on the target.
- **Fix B.17 & B.18 Ability Definitions**:
  - `Ride-Through` (`PENETRATE_STEP`, `kind: 'CHARGE'`): explicitly `shout: null` (silent, since the Cavalier visibly rides through to the rear hex).
  - `Intercept Step` (`POSITION_SWAP`, `kind: 'SWAP'`): `shout: { actor: 'INTERCEPT!', target: null }` so only the Shield-bearer shouts `"INTERCEPT!"` while the rescued ally shows only `+2 ARMOR`.
  - `Lance Charge` (`RUSH_CHARGE`) and `Dragon Dive` (`AERIAL_VAULT`): explicitly `shout: null` on the actor movement effect while preserving `"KNOCKBACK!"` on `Lance Charge`'s target knockback effect; `Rooftop Vault` (`TELEPORT`) can specify `'VAULT!'` (or explicit `shout`).
- **Agent Discoverability & Catalog Guardrails**: Add clear JSDoc guidance on `AbilityEffect.shout`, and add a catalog invariant test in `src/core/units/packages.test.ts` verifying that all registered abilities using customizable/non-obvious displacement or tempo effects (`POSITION_SWAP`, `PENETRATE_STEP`, `AERIAL_VAULT`, `RUSH_CHARGE`, `TELEPORT`, `CTB_DELAY`) explicitly declare `shout` (a label string/config or `null`).
- **Version Assessment (Semantic Versioning)**: **Patch bump (`0.17.1` -> `0.17.2`)**. This resolves two UI floating-text bugs (B.17, B.18) and introduces backwards-compatible optional authoring metadata and test guardrails without breaking existing gameplay or public contracts.

## Capabilities

### New Capabilities
<!-- None; this extends existing composable ability and battlefield floating text capabilities. -->

### Modified Capabilities
- `composable-abilities`: Extend `AbilityEffect` and `CombatEvent` with declarative `shout` / `label` customization (including `null` suppression and actor/target split for two-unit effects like `POSITION_SWAP`), require exhaustive `DisplacementKind` defaults with no `'KNOCKBACK!'` catch-all, and enforce catalog test coverage for explicit shout declarations on customizable displacement/utility effects.
- `arena-timeline-ux`: Update Battlefield Floating Combat Text rules so `DISPLACEMENT` and effect floaters honor custom `event.label` strings, skip rendering when `label === null`, and size custom impact vs. standard utility shouts consistently.

## Impact

- **Core Types & Combat Engine**: `src/core/types/ability.ts`, `src/core/combat/types.ts`, `src/core/combat/resolver.ts`, `src/core/combat/effects/positionSwapHandler.ts`, `src/core/combat/effects/penetrateHandler.ts`, `src/core/combat/effects/knockbackHandler.ts`, `src/core/combat/effects/retreatHandler.ts`, `src/core/combat/effects/teleportHandler.ts`, `src/core/combat/effects/ctbDelayHandler.ts`
- **Ability Data Packages**: `src/data/packages/cavalier.ts`, `src/data/packages/shieldBearer.ts`, `src/data/packages/dragoon.ts`, `src/data/packages/catBurglar.ts`, `src/data/packages/thief.ts`, and any other registered ability with guarded effect types
- **UI Presentation**: `src/ui/combat/useFloatingCombatText.ts`
- **Tests**: `src/ui/combat/useFloatingCombatText.test.tsx`, `src/core/units/packages.test.ts`, `src/core/combat/effects/shieldBearerMechanics.test.ts`, `src/core/combat/cavalierIntegration.test.ts`
- **Release & Board Tracking**: `package.json`, `CHANGELOG.md`, and moving B.17 / B.18 to In Progress / Done in `docs/plans/ACTIVE.md` during implementation.

