# Design

## Context

See `proposal.md` for motivation and scope.

In the current codebase:
- `src/core/combat/types.ts` defines `DisplacementKind = 'KNOCKBACK' | 'RETREAT' | 'PULL' | 'TELEPORT' | 'CHARGE' | 'SWAP'` and `CombatEvent`. `DAMAGE` events already carry `label?: string`, whereas `DISPLACEMENT` and `CTB_DELAY` events carry no presentation label.
- `src/ui/combat/useFloatingCombatText.ts` (`collectResolutionFloatingTexts`) uses a ternary over `event.kind` that only recognizes `'TELEPORT'` and `'RETREAT'` and defaults every other `DisplacementKind` (`'KNOCKBACK'`, `'CHARGE'`, `'SWAP'`, `'PULL'`) to `'KNOCKBACK!'`.
- `src/core/types/ability.ts` defines `AbilityEffect` and `Ability` (which has a single `splashLabel?: string` for AoE splash damage).
- `src/core/units/packages.test.ts` runs structural validation across all registered class packages and novice abilities.

## Goals / Non-Goals

**Goals:**
- Allow per-effect customization and explicit suppression (`null`) of floating shout labels directly on `AbilityEffect`, including distinct actor vs. target shouts for two-unit effects (`POSITION_SWAP`).
- Eliminate the `'KNOCKBACK!'` catch-all fallback in `useFloatingCombatText.ts` via an exhaustive `Record<DisplacementKind, ...>` lookup table.
- Fix B.17 (`Ride-Through` silent on actor) and B.18 (`Intercept Step` shouts `'INTERCEPT!'` on Shield-bearer only), plus silence `'CHARGE'` on `Lance Charge` and `Dragon Dive` while keeping `'KNOCKBACK!'` on `Lance Charge`'s target.
- Make shout configuration immediately discoverable to future ability authors via TypeScript exhaustiveness, JSDoc on `AbilityEffect`, and an automated catalog invariant test in `src/core/units/packages.test.ts`.

**Non-Goals:**
- Changing combat log message formatting or `CombatLogPanel` parsing (this change targets battlefield floating combat text; combat log `secondaryDetail` continues to come from handler `logDetail`).
- Replacing `Ability.splashLabel` on existing AoE splash abilities (`Arcane Blast`, `Dragon Dive`).
- Adding new gameplay effects or modifying damage/knockback/swap mechanics.

## Decisions

### Decision 1: Effect-Level `shout` Contract (`string | null | EffectShoutTargetConfig`)
- **Choice**: Add `readonly shout?: EffectShoutConfig` to `AbilityEffect` in `src/core/types/ability.ts`, where:
  ```ts
  export interface EffectShoutTargetConfig {
    readonly actor?: string | null;
    readonly target?: string | null;
  }
  export type EffectShoutConfig = string | null | EffectShoutTargetConfig;
  ```
- **Rationale**:
  - `Ability`-level fields (like `splashLabel`) collide when one ability contains multiple displacements (e.g., `LANCE_CHARGE` has both `RUSH_CHARGE` for the Cavalier and `KNOCKBACK` for the enemy) or moves two units (`INTERCEPT_STEP`).
  - `string | null` distinguishes "use default" (`undefined`), "custom shout" (`string`), and "explicitly silent" (`null`).
  - `{ actor?, target? }` cleanly handles `POSITION_SWAP` without inventing separate single-purpose flags like `suppressTargetShout`.
- **Alternatives Considered**:
  - *Ability-level `displacementLabel?: string`*: Rejected because `Lance Charge` would apply the rush label to the enemy's knockback (or vice versa), and `Intercept Step` would still affect both units identically.
  - *Separate `Effect` type for floating text*: Rejected because it forces authors to keep a second parallel effect synchronized with every mechanical effect.

### Decision 2: `label?: string | null` on `CombatEvent` (`DISPLACEMENT` and `CTB_DELAY`)
- **Choice**: Add `readonly label?: string | null` to `DISPLACEMENT` and `CTB_DELAY` variants of `CombatEvent` in `src/core/combat/types.ts`, matching the existing `label?: string` pattern on `DAMAGE`.
- **Rationale**:
  - Keeps `useFloatingCombatText.ts` purely event-driven (`collectResolutionFloatingTexts` inspects `event` without needing to cross-reference which `AbilityEffect` index emitted which `CombatEvent`).
  - Helper `resolveEffectShout(shout, role: 'actor' | 'target'): string | null | undefined` extracts the resolved `label` inside each effect handler (`penetrateHandler`, `positionSwapHandler`, `knockbackHandler`, `retreatHandler`, `teleportHandler`, `ctbDelayHandler`) and inside `resolver.ts` (`RUSH_CHARGE` and `AERIAL_VAULT`).
- **Behavior when `shout` is a string on `POSITION_SWAP`**:
  - If `effect.shout` is a plain `string`, apply it to the actor (`actor` event gets `label: effect.shout`, `target` event gets `label: null` unless `{ target: '...' }` is provided), preventing accidental double shouts by default.

### Decision 3: Exhaustive `DISPLACEMENT_DEFAULT_SHOUT` Map (No Catch-All Fallback)
- **Choice**: In `src/ui/combat/useFloatingCombatText.ts`, replace the ternary fallback with:
  ```ts
  const DISPLACEMENT_DEFAULT_SHOUT: Record<
    DisplacementKind,
    string | { readonly actor: string | null; readonly target?: string | null } | null
  > = {
    KNOCKBACK: 'KNOCKBACK!',
    RETREAT: 'RETREAT!',
    TELEPORT: 'TELEPORT!',
    PULL: 'PULL!',
    CHARGE: null,
    SWAP: { actor: 'SWAP!', target: null }
  };
  ```
  Wait: since `positionSwapHandler` emits two `DISPLACEMENT` events (`unitId: actorCu` first, `unitId: targetCu` second) and `event.label` is already resolved by the handler, `useFloatingCombatText.ts` can simply use `Record<DisplacementKind, string | null>` where `SWAP: 'SWAP!'` serves only as the fallback if `event.label === undefined` (while `positionSwapHandler` explicitly passes `label: actorLabel` on the actor event and `label: targetLabel ?? null` on the target event).
  - If `event.label === null`, skip emitting any floater.
  - If `typeof event.label === 'string'`, emit `event.label` (if non-empty).
  - Otherwise (`event.label === undefined`), look up `DISPLACEMENT_DEFAULT_SHOUT[event.kind]` and skip if `null`.
- **Tiering**:
  - `event.kind === 'KNOCKBACK'` retains `'impact'` tier (`26px–28px`).
  - All other `DISPLACEMENT` events (`'TELEPORT'`, `'RETREAT'`, `'PULL'`, `'SWAP'`, `'CHARGE'`) use `'standard'` tier (`20px–22px`).
  - `CTB_DELAY` emits a `'utility'` tier floater (`16px–18px`) only when `event.label` is a non-empty string (silent by default so existing abilities don't sprout unexpected text unless opted in).
- **Rationale**: TypeScript enforces at compile time that any newly added `DisplacementKind` has an explicit entry in `DISPLACEMENT_DEFAULT_SHOUT`.

### Decision 4: Agent Discoverability & Automated Guardrail in `packages.test.ts`
- **Choice**:
  1. Document `shout` clearly in JSDoc on `AbilityEffect` in `src/core/types/ability.ts`.
  2. Add an invariant test in `src/core/units/packages.test.ts` iterating over all abilities in `ALL_CLASS_PACKAGES` and `ALL_NOVICE_ABILITIES`: any effect whose `type` is in `EXPLICIT_SHOUT_EFFECT_TYPES` (`'POSITION_SWAP'`, `'PENETRATE_STEP'`, `'AERIAL_VAULT'`, `'RUSH_CHARGE'`, `'TELEPORT'`, `'CTB_DELAY'`) MUST define `effect.shout !== undefined` (either a string, `{ actor, target }`, or `null` for intentionally silent).
  3. Update existing abilities with those effect types accordingly:
     - `RIDE_THROUGH` (`PENETRATE_STEP`): `shout: null`
     - `LANCE_CHARGE` (`RUSH_CHARGE`): `shout: null` (keeps `KNOCKBACK` defaulting to `'KNOCKBACK!'`)
     - `DRAGON_DIVE` (`AERIAL_VAULT`): `shout: null`
     - `INTERCEPT_STEP` (`POSITION_SWAP`): `shout: { actor: 'INTERCEPT!', target: null }`
     - `SHADOW_STEP` (`TELEPORT`): `shout: 'TELEPORT!'`
     - `ROOFTOP_VAULT` (`TELEPORT`): `shout: 'VAULT!'`
     - Existing `CTB_DELAY` abilities (`PILFER`, etc. in `catBurglar.ts`, `highwayman.ts`, `knight.ts`, `witch.ts`): `shout: null` (preserving current silent behavior while making silent intent explicit, or allowing easy future opt-in).
- **Rationale**: An agent implementing a new class (e.g., Tier 4 classes) who reuses any non-obvious movement or tempo effect gets an immediate, self-explanatory unit test failure if they forget to decide whether it should shout or stay silent.
- **Alternative Considered**: *Require `shout` on every `AbilityEffect` including `DAMAGE` and `STAT_MODIFIER`*: Rejected as noisy boilerplate for standard attacks and buffs that already have clear visual numbers/badges.

## Risks / Trade-offs

- **Risk**: Existing unit tests constructed inline with mock `Ability` objects (not registered in `ALL_CLASS_PACKAGES`) might emit `DISPLACEMENT` events without `label`. -> **Mitigation**: `DISPLACEMENT_DEFAULT_SHOUT` preserves `'KNOCKBACK!'`, `'RETREAT!'`, and `'TELEPORT!'` when `event.label` is `undefined`, keeping mock tests backwards-compatible while fixing `'CHARGE'` to `null`.
- **Risk**: Updating `CTB_DELAY` and `TELEPORT` abilities in existing packages touches 6–7 data files for explicit `shout` annotations. -> **Mitigation**: Annotations are 1-line declarative properties (`shout: null` or `shout: 'VAULT!'`) with zero mechanical impact, verified immediately by existing package and integration tests.

