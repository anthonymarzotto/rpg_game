# Design: Shard Architecture Hardening & Unified Effect Lifecycle

## Context

See `proposal.md` for motivation and scope. Following the implementation of `shard-compatibility-and-timing`, an architectural review identified several structural gaps:
- `resolver.ts` hard-codes `STEALTH`, `BASTION_STANCE`, and `RETREAT_STEP` inside `isSelfScopedEffect`, duplicates `applyOn` defaulting, maintains four separate effect-type exclusion lists across dispatch sites, repeats `POST_ACTION` dispatch in five branches (merging `ON_RESOLVE` and `POST_ACTION` into one pass on zone launches), and mutates arena coordinates inside multi-target loops before re-applying them in `applyCombatEvents`.
- `EffectTiming` includes `'PRE_ACTION'`, yet `RUSH_CHARGE` and `AERIAL_VAULT` are still detected ad-hoc and `PRE_ACTION` effects are not filtered out of `ON_RESOLVE`.
- `battlefieldZones.ts` duplicates `applyCombatEvents` as `applyBombardmentSideEvents` (missing `onTakeDamage` condition reactions and `SWAP` handling), duplicates `HIT_RANK`, and dispatches knockbacks against `snapshotActor`'s live arena position rather than launch-time origin.
- `harmonization.ts` infers ability hostility from `targetType` + `aoeRadius` and hard-codes `TELEPORT` / `SHRAPNEL_RUBBLE` exclusions.
- `loadout.ts` duplicates slot-to-ability mapping between `getSlotBaseAbilities` and `resolveUnitLoadout`, skips compatibility enforcement at combat resolution time, and relies on a global `getAbilityById` fallback because `transitions.ts` omits `getAbility`.
- `HeroProgressionDrawer.tsx` owns the auto-unsocket pruning rule (only for class/wildcard edits) and swallows validation rejections with `console.warn`.

## Goals / Non-Goals

**Goals:**
- Establish a single declarative metadata registry for `AbilityEffectType` driving phase defaults (`PRE_ACTION` / `ON_RESOLVE` / `POST_ACTION`), execution roles, targeting semantics, and target-effect delivery eligibility.
- Eliminate every hard-coded ability/condition/effect special case introduced or duplicated in `resolver.ts`, `conditionHandler.ts`, `registry.ts`, `battlefieldZones.ts`, and `harmonization.ts`.
- Share one `applyCombatEvents` implementation across `resolver.ts` and `battlefieldZones.ts`, and apply multi-target events sequentially without early coordinate mutations or double application.
- Snapshot launch-time origin coordinates on `PendingBombardment` and thread `originCoord` through `EffectContext` for deterministic delayed bombardment knockbacks.
- Enforce shard compatibility cleanly at both boundaries: domain-level auto-pruning in `updateCampUnitLoadout` (with visible UI rejection feedback in `HeroProgressionDrawer`) and a defensive combat-time guard in `resolveUnitLoadout`.

**Non-Goals:**
- Changing the 33 shards' intended compatibility presets or reworking `Wyrmflame Breath`'s unified Graze-negation behavior (document the Graze fix in `CHANGELOG.md` rather than reverting it).
- Rewriting `RUSH_CHARGE` or `AERIAL_VAULT` trajectory calculations into full registry handlers (keep their specialized movement resolution in the `PRE_ACTION` stage of `executeAbility`, but gate them declaratively by phase/metadata so they cannot leak into `ON_RESOLVE`).
- Modifying existing campaign save schemas (legacy saves remain readable; incompatible shards are skipped at combat time and pruned on the next Camp loadout edit).

## Decisions

### 1. Centralized `EFFECT_METADATA` & Shared Lifecycle Helpers (`src/core/combat/effects/registry.ts`)
- **Choice**: Define a complete `Record<AbilityEffectType, EffectTypeMetadata>` table in `src/core/combat/effects/registry.ts`:
  ```ts
  export type EffectExecutionRole =
    | 'PRIMARY_DAMAGE'   // DAMAGE
    | 'ROLL_MODIFIER'    // CRIT_BOOST
    | 'PRE_ROLL_MOVE'    // RUSH_CHARGE, AERIAL_VAULT
    | 'GEOMETRIC_SPECIAL'// ALLY_REFRACTION, DISTRIBUTIVE_PROOF
    | 'ZONE_DEPLOY'      // DELAYED_BOMBARDMENT, SHRAPNEL_RUBBLE
    | 'RESOLUTION';      // all standard handler-dispatched effects

  export interface EffectTypeMetadata {
    readonly defaultTiming: EffectTiming;
    readonly role: EffectExecutionRole;
    /** True for effects that displace the actor relative to the primary target (e.g. RETREAT_STEP) */
    readonly primaryTargetRelativeSelf?: boolean;
    /** False when an ability composed of this effect cannot deliver target-scoped ON_RESOLVE infusions */
    readonly deliversTargetEffects?: boolean; // false for TELEPORT, SHRAPNEL_RUBBLE
  }
  ```
  Export four pure shared helpers consumed by `resolver.ts`, `battlefieldZones.ts`, `registry.ts`, and `harmonization.ts`:
  - `getEffectTiming(effect: AbilityEffect): EffectTiming` -> `effect.timing ?? EFFECT_METADATA[effect.type].defaultTiming`
  - `resolveApplyOn(effect: AbilityEffect): EffectApplyCondition` -> single source of truth matching `registry.ts` (`DAMAGE` -> `'HIT_OR_CRIT'`, `isSelfScopedEffect(effect)` -> `'ALWAYS'`, else `'HIT_OR_CRIT'`)
  - `isSelfScopedEffect(effect: AbilityEffect): boolean` -> `effect.targetScope === 'SELF' && !EFFECT_METADATA[effect.type].primaryTargetRelativeSelf`
  - `isResolutionEffect(effect: AbilityEffect): boolean` -> `EFFECT_METADATA[effect.type].role === 'RESOLUTION'`
- **Data fix**: Add `targetScope: 'SELF'` to `SMOKE_VEIL`'s `STEALTH` effect in `src/data/packages/infiltrator.ts`. Remove the `effect.conditionType === 'STEALTH'` redirect from `conditionHandler.ts` (relying on `ability.targetType === 'SELF' || effect.targetScope === 'SELF'` — already passed as `actorCu` by `registry.ts`), remove the redundant `BASTION_STANCE` and `STEALTH` branches from `resolver.ts`, and replace the hard-coded `effect.type !== 'RETREAT_STEP'` checks in `registry.ts` and `resolver.ts` with `!EFFECT_METADATA[effect.type].primaryTargetRelativeSelf` (running `primaryTargetRelativeSelf` effects only once against the primary target, never per splash hit).
- **Why**: TypeScript enforces that every `AbilityEffectType` has explicit metadata. Adding a new effect type automatically opts into the right phase, role, and compatibility rules without touching four switch/filter lists across three files.
- **Alternative considered**: Adding metadata properties directly onto each `EffectHandler` object. Rejected because several effect types (`CRIT_BOOST`, `RUSH_CHARGE`, `AERIAL_VAULT`, `DELAYED_BOMBARDMENT`, `SHRAPNEL_RUBBLE`, `ALLY_REFRACTION`, `DISTRIBUTIVE_PROOF`) have no registry handler, so a typed `Record<AbilityEffectType, EffectTypeMetadata>` is strictly exhaustive.

### 2. Extract `applyCombatEvents` & `pickBestHitOutcome` into Shared Combat Modules
- **Choice**:
  - Move `applyCombatEvents` (and `ApplyCombatEventsOptions`) out of `src/core/combat/resolver.ts` into `src/core/combat/eventApplication.ts` (re-exporting `applyCombatEvents` from `resolver.ts` so all existing imports keep working).
  - Add an option `logDefeats?: boolean` (or let callers pass `claimed` / `logDefeats`) so `battlefieldZones.ts` gets full `onTakeDamage` condition reactions (breaking `STEALTH`), `SWAP` handling, `clearZeroedInStacks`, defeat logging, and `purgeConditionsFromDefeatedSource` through the exact same function, completely deleting `applyBombardmentSideEvents`.
  - Move `HIT_OUTCOME_RANK` and `pickBestHitOutcome` into `src/core/combat/types.ts` (or `eventApplication.ts`) and import from both `resolver.ts` and `battlefieldZones.ts`.
- **Why**: Breaks the circular dependency (`resolver.ts` -> `battlefieldZones.ts`) cleanly and guarantees zero future drift between direct attacks and delayed bombardments.
- **Alternative considered**: Passing `applyCombatEvents` as a callback parameter into `resolvePendingBombardmentsOnTurnStart`. Rejected as awkward for external callers (`turnManager.ts`, tests).

### 3. Sequential Multi-Target Event Application & Shared Phase Runner in `resolver.ts`
- **Choice**:
  - In damaging `executeAbility`, apply primary damage + primary target `ON_RESOLVE` events through `applyCombatEvents` before iterating splash targets; for each splash entry, apply that target's splash damage event first (so lethal splash damage defeats and removes the unit from the arena immediately), and only run target-scoped `ON_RESOLVE` infusions if `!entry.cu.isDefeated`, immediately applying that target's infusion events through `applyCombatEvents`. Record all emitted events in `events` for the return value without re-applying them a second time.
  - Extract concise internal helpers inside `resolver.ts`:
    - `runLaunchSelfPhases(state, actorCu, effectiveAbility, targetCoord, diceRoller)` used by both `DELAYED_BOMBARDMENT` and `SHRAPNEL_RUBBLE` branches: runs unconditional `ON_RESOLVE` self effects (`getEffectTiming(e) === 'ON_RESOLVE' && isSelfScopedEffect(e) && resolveApplyOn(e) === 'ALWAYS'`), commits via `applyCombatEvents`, then runs `POST_ACTION` effects (`getEffectTiming(e) === 'POST_ACTION'`) and commits via `applyCombatEvents`.
    - `runPostActionPhase(state, ctx)` used across damaging, single-target utility, and AoE utility branches.
  - Keep `onAfterAction` scoped to contested attack actions (step 5 of damaging `executeAbility`), matching `ConditionDefinition.onAfterAction`'s `action.type === 'ATTACK'` contract and preventing self-buffs/teleports from accidentally stripping `STEALTH`, and document that boundary explicitly in the spec.
- **Why**: Eliminates double-application of displacements, ensures dead splash units cannot block knockbacks, prevents `SWAP` corruption, removes ~130 lines of repeated boilerplate, and fixes zone launch phase ordering (`ON_RESOLVE` before `POST_ACTION`).
- **Alternative considered**: Maintaining a temporary shadow occupancy set during the splash loop. Rejected because sequential application via `applyCombatEvents` also keeps HP, defeat state, and condition reactions accurate across multi-target hits with less code.

### 4. Snapshotted Origin Coordinate for Delayed Bombardment Displacements
- **Choice**:
  - Add `readonly snapshotOriginCoord?: HexCoord` to `PendingBombardment` in `src/core/combat/types.ts` (captured from `actorCoord` at launch time in `resolver.ts`).
  - Add `readonly originCoord?: HexCoord` to `EffectContext` in `src/core/combat/effects/types.ts`.
  - In `knockbackHandler.ts` (and `pullHandler.ts` if applicable), resolve the push origin as `ctx.originCoord ?? state.arena.getUnitPosition(actorCu.unit.id)`.
  - In `battlefieldZones.ts`, pass `originCoord: b.snapshotOriginCoord ?? state.arena.getUnitPosition(b.sourceUnitId)` into `executeAbilityEffects` during detonation.
- **Why**: Keeps bombardment knockback direction identical to `Arcane Blast`, avoids zero-vector ambiguity on the center hex, and remains functional if the Ballistician relocates or dies before detonation.
- **Alternative considered**: Pushing radially outward from `b.centerCoord`. Rejected per user preference because a target on the exact center hex has a zero vector and requires a fallback anyway.

### 5. Declarative `Ability.intent` & Metadata-Driven Shard Compatibility
- **Choice**:
  - Add `export type AbilityIntent = 'HOSTILE' | 'FRIENDLY' | 'SELF'` and optional `readonly intent?: AbilityIntent` to `Ability` in `src/core/types/ability.ts`.
  - Export `resolveAbilityIntent(ability: Ability): AbilityIntent`:
    1. If `ability.intent` is declared, return it.
    2. If `ability.damageType !== 'NONE'` or `ability.targetType === 'SINGLE_TARGET'`, return `'HOSTILE'`.
    3. If `ability.targetType === 'ALLY'`, return `'FRIENDLY'`.
    4. Otherwise (`'SELF'` or unannotated non-damaging `'HEX'`), return `'SELF'`.
  - Annotate the 4 existing non-damaging `HEX` abilities explicitly: `intent: 'HOSTILE'` on `FLASH_POWDER` and `SHRAPNEL_CANISTER`; `intent: 'SELF'` on `SHADOW_STEP` and `ROOFTOP_VAULT`.
  - In `evaluateShardCompatibility` (`src/core/progression/harmonization.ts`):
    - Replace the ad-hoc `isHostile` expression with `resolveAbilityIntent(ability) === 'HOSTILE'`.
    - Replace the hard-coded `TELEPORT` / `SHRAPNEL_RUBBLE` checks with `const deliversTargetEffects = !(ability.effects ?? []).some((e) => EFFECT_METADATA[e.type].deliversTargetEffects === false)`.
- **Why**: Future friendly ground-targeted AoEs (e.g. healing zones) default safely to non-hostile or declare `intent: 'FRIENDLY'`, and any future zone-hazard effect declares `deliversTargetEffects: false` once in `EFFECT_METADATA` rather than editing `harmonization.ts`.
- **Alternative considered**: Making `intent` required on all 57 existing abilities. Rejected to keep the diff surgical (only 4 non-damaging `HEX` abilities are ambiguous from `targetType` + `damageType`).

### 6. Domain-Boundary Pruning, Shared Slot Resolver, Combat-Time Guard & UI Error Banner
- **Choice**:
  - In `src/core/units/loadout.ts`:
    - Extract a single internal helper `resolveCoreAndWildcardBaseAbilities(unit, loadout, providers)` used by both `getSlotBaseAbilities` and `resolveUnitLoadout` so slot indices (`0..2` core, `3..4` wildcard) are defined once.
    - Inside `resolveUnitLoadout`, filter each slot's `shardIds` through `evaluateShardCompatibility(shard, baseAbility).compatible` before calling `getEffectiveAbility` so legacy saves with incompatible shards never apply broken modifiers in combat.
  - In `src/core/campaign/transitions.ts`:
    - Accept `abilityProvider: (id: string) => Ability | undefined = getAbilityById` alongside `packageProvider` in `updateCampUnitLoadout`.
    - Always run `pruneIncompatibleSlotAugments(unit, loadout, { getPackage: packageProvider, getAbility: abilityProvider })` (idempotent when all shards are already valid) before calling `validateUnitLoadout(unit, normalizedLoadout, { getPackage: packageProvider, getAbility: abilityProvider })`.
  - In `src/ui/camp/HeroProgressionDrawer.tsx`:
    - Remove the conditional `shouldPrune` / `pruneIncompatibleSlotAugments` block from `handleUpdateLoadout` (delegating to `updateCampUnitLoadout`).
    - Add local `loadoutError: string | null` state rendered as a concise inline error banner inside the Combat Manifest section whenever `updateCampUnitLoadout` throws, cleared automatically on the next successful edit or close/dismiss.
- **Why**: Guarantees the domain invariant holds for every caller, prevents UI deadlocks on legacy saves regardless of which field is edited, and ensures rejected edits are never silently swallowed.
- **Alternative considered**: Keeping pruning in the UI and only adding an error banner. Rejected because non-UI callers of `updateCampUnitLoadout` would still violate the off-node progression spec.

## Risks / Trade-offs

- **[Risk] Circular import between `harmonization.ts` and `effects/registry.ts`** → `effects/registry.ts` imports effect handlers, which import `combat/` utilities (`damageEngine`, `conditions`, etc.), whereas `harmonization.ts` is in `progression/`. Mitigation: place the pure `EFFECT_METADATA` table and `getEffectTiming` / `isSelfScopedEffect` / `resolveApplyOn` helpers in a lightweight, zero-handler-dependency module `src/core/combat/effects/metadata.ts` (importing only `../../types/ability`), then re-export from `effects/registry.ts` and import directly in `harmonization.ts` and `resolver.ts` with zero circular imports.
- **[Risk] Existing tests expecting `updateCampUnitLoadout` to throw on incompatible shards** → `validateUnitLoadout` remains strictly rejecting (so direct `validateUnitLoadout` tests stay unchanged), while `updateCampUnitLoadout` auto-prunes incompatible shards per the off-node progression spec; check `offNodeProgressionIntegration.test.ts` and add explicit tests for both strict `validateUnitLoadout` rejection and `updateCampUnitLoadout` pruning.
- **[Risk] Sequential `applyCombatEvents` inside `executeAbility` interacting with `targetHp` logged on `COLLATERAL_HIT` outcomes** → Previously `COLLATERAL_HIT` computed `Math.max(0, splashCu.currentHp - splashDmg.damageDealt)` before `applyCombatEvents`. When applying each splash target's damage immediately, read `entry.cu.currentHp` after applying damage (or capture `remainingHp`) so Combat Log HP snapshots stay exact and never subtract damage twice.
- **[Risk] `onTakeDamage` hooks running twice if an event array were accidentally applied twice** → Keep `events` (the returned log/animation list) strictly separate from newly-produced batch slices passed to `applyCombatEvents`, so every `CombatEvent` is applied exactly once.
