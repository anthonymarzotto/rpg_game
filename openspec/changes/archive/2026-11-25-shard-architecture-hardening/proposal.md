# Proposal: Shard Architecture Hardening & Unified Effect Lifecycle

## Why

An architectural review of the `shard-compatibility-and-timing` implementation identified structural leaks where the declarative effect timing and shard compatibility models were only half adopted: the combat resolver still relies on hard-coded effect-type checks (`STEALTH`, `BASTION_STANCE`, `RETREAT_STEP`, `RUSH_CHARGE`, `AERIAL_VAULT`) and four separate hand-maintained exclusion lists, `battlefieldZones.ts` duplicates `applyCombatEvents` (dropping `onTakeDamage` reactions such as breaking Stealth), delayed bombardment knockbacks push from the launcher's live position (failing if the launcher moves or dies), shard compatibility is bypassed during combat resolution (`resolveUnitLoadout`) and pruned only inside a React component rather than the campaign transition, and `evaluateShardCompatibility` infers hostility from targeting shape with hard-coded effect exclusions (`TELEPORT`, `SHRAPNEL_RUBBLE`). Fixing these now consolidates the architecture before archiving `shard-compatibility-and-timing` and prevents latent bugs as new abilities, zones, and shards are added.

## What Changes

- **Declarative Effect Metadata & True 3-Phase Timing (`PRE_ACTION`, `ON_RESOLVE`, `POST_ACTION`)**:
  - Introduce a single source of truth for effect-type metadata (phase default, execution role, self-targeting semantics, and target-effect delivery capability) alongside shared `getEffectTiming`, `resolveApplyOn`, and `isSelfScopedEffect` helpers.
  - Fix the missing `targetScope: 'SELF'` data declaration on `Smoke Veil` and remove the hard-coded `STEALTH` and `BASTION_STANCE` branches from `resolver.ts` and `conditionHandler.ts`; model `RETREAT_STEP`'s actor-relative-to-primary-target behavior declaratively so it cannot trigger multiple times in multi-target loops.
  - Wire `PRE_ACTION` explicitly for `RUSH_CHARGE` and `AERIAL_VAULT`, replace the four hand-maintained effect-type exclusion lists with metadata-driven phase filters, and consolidate the five hand-written `POST_ACTION` / duplicated zone launch blocks into shared phase-execution helpers (ensuring zone launches run `ON_RESOLVE` before `POST_ACTION`).
  - Align the lifecycle specification with `onAfterAction`'s attack-action scope and extract a shared `pickBestHitOutcome` utility.
- **Shared Event Application & Multi-Target Ordering**:
  - Extract `applyCombatEvents` into its own core combat module (`src/core/combat/eventApplication.ts`) and reuse it from both `resolver.ts` and `battlefieldZones.ts`, eliminating the drifting `applyBombardmentSideEvents` copy so bombardment side-effect damage triggers `onTakeDamage` hooks (e.g. breaking `STEALTH`), handles `SWAP`, and logs defeats consistently.
  - Apply primary and splash events sequentially in multi-target `ON_RESOLVE` loops through `applyCombatEvents` rather than mutating arena coordinates early and re-applying them later, ensuring defeated splash targets are removed before subsequent knockbacks resolve.
- **Snapshotted Origin for Delayed Bombardment Knockbacks**:
  - Snapshot the launcher's launch-time coordinate (`snapshotOriginCoord`) on `PendingBombardment` and pass `originCoord` in `EffectContext` so `knockbackHandler` pushes targets away from the launch position on detonation (consistent with `Arcane Blast` and still working if the launcher moves or is defeated).
- **Declarative Ability Intent & Metadata-Driven Compatibility**:
  - Add an explicit optional `intent?: 'HOSTILE' | 'FRIENDLY' | 'SELF'` field on `Ability` (declared on non-damaging `HEX` abilities such as `Flash Powder`, `Shrapnel Canister`, `Shadow Step`, and `Rooftop Vault`) with a safe default helper so future friendly ground-targeted AoEs never accept hostile infusions.
  - Replace the hard-coded `TELEPORT` / `SHRAPNEL_RUBBLE` checks in `evaluateShardCompatibility` with the effect metadata registry's target-effect delivery capability.
- **Domain-Boundary Loadout Pruning, Combat-Time Guard & UI Feedback**:
  - Move automatic incompatible-shard pruning into `updateCampUnitLoadout` (`src/core/campaign/transitions.ts`) across all loadout edits (idempotent) and pass `getAbility` explicitly into validation/pruning providers.
  - Deduplicate slot-to-base-ability resolution between `getSlotBaseAbilities` and `resolveUnitLoadout`, and add a defensive combat-time compatibility guard inside `resolveUnitLoadout` so any legacy save containing an incompatible socketed shard skips applying that shard in combat.
  - Surface visible inline error feedback in `HeroProgressionDrawer` if a loadout update is rejected instead of swallowing it behind `console.warn`.
- **Documentation & Hygiene**:
  - Document the unified `Wyrmflame Breath` Graze-negation alignment (and the user-facing hardening fixes) in `CHANGELOG.md`, clean up the draft note in `shard-compatibility-and-timing/design.md`, and revert the stray indentation diff in `executeMove`.

## Capabilities

### New Capabilities
*(None — this change hardens and refines existing combat, progression, and Camp UI capabilities.)*

### Modified Capabilities
- `composable-abilities`: Enforce declarative 3-phase effect timing (`PRE_ACTION`, `ON_RESOLVE`, `POST_ACTION`) via centralized effect metadata, share unified combat event application across direct resolution and delayed bombardments, resolve multi-target splash damage and displacements sequentially without double-application, snapshot launch-time `originCoord` for delayed bombardment knockbacks, and clarify `onAfterAction` scope for attack vs non-attack actions.
- `off-node-progression`: Drive shard compatibility from explicit ability `intent` and effect metadata capabilities, move automatic incompatible-shard pruning into the campaign loadout transition (`updateCampUnitLoadout`) on every edit, and enforce a combat-time compatibility guard in `resolveUnitLoadout` so legacy incompatible shards never apply in combat.
- `hero-progression-drawer`: Delegate loadout shard pruning to the campaign transition and render visible inline feedback when a loadout update is rejected.

## Version Assessment

- **Target Version**: `0.25.0` (Consolidated into the unreleased `0.25.0` minor bump from `0.24.0`)
- **Rationale**: Lands pre-release alongside `shard-compatibility-and-timing` (`0.25.0`), folding the player-visible hardening fixes (bombardment knockback direction/post-defeat reliability, bombardment infusion damage breaking Stealth, combat-time protection against legacy incompatible shards, visible loadout rejection feedback in Camp, and documenting the `Wyrmflame Breath` Graze rule alignment) into a single cohesive `0.25.0` release entry rather than splitting an unreleased version across `0.25.0` and `0.25.1`.

## Impact

- **Core Types & Data**: `src/core/types/ability.ts`, `src/data/packages/infiltrator.ts`, `src/data/packages/catBurglar.ts`, `src/data/packages/ballistician.ts`, `src/data/packages/thief.ts`
- **Combat Engine & Effects**: `src/core/combat/eventApplication.ts` (new), `src/core/combat/types.ts`, `src/core/combat/effects/types.ts`, `src/core/combat/effects/registry.ts`, `src/core/combat/effects/conditionHandler.ts`, `src/core/combat/effects/knockbackHandler.ts`, `src/core/combat/resolver.ts`, `src/core/combat/battlefieldZones.ts`
- **Progression, Loadouts & Campaign**: `src/core/progression/harmonization.ts`, `src/core/units/loadout.ts`, `src/core/campaign/transitions.ts`
- **Camp UI**: `src/ui/camp/HeroProgressionDrawer.tsx`
- **Tests & Docs**: Unit/integration tests across combat, progression, loadout, campaign transitions, and Camp UI; `openspec/changes/shard-compatibility-and-timing/design.md`, `CHANGELOG.md`, and `package.json`.
