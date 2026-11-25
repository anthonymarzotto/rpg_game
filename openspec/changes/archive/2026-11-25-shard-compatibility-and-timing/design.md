# Design: Shard Compatibility & Effect Timing

## Context

See `proposal.md` for motivation and scope. Currently:
- `AbilityEffect` in `src/core/types/ability.ts` has `applyOn` and `targetScope`, but no execution phase (`timing`). In `src/core/combat/resolver.ts`, `executeAbility` runs all non-damage effects in a single `executeAbilityEffects` call before `applyCombatEvents`, hit-reaction facing, and `onAfterAction` condition hooks — causing `Shadow Shard`'s `STEALTH` to be immediately stripped by `STEALTH.onAfterAction` on attacks.
- AoE/Cone loops in `resolver.ts` only dispatch primary splash damage (plus an unscoped `CONDITION` loop for Cones that leaks `SELF` conditions onto enemies), while `DELAYED_BOMBARDMENT` and `SHRAPNEL_RUBBLE` return early before running appended shard effects.
- `ASTRAL_AUGMENT_SHARDS` in `src/core/progression/harmonization.ts` declares no compatibility metadata; `validateUnitLoadout` in `src/core/units/loadout.ts` validates only ownership/uniqueness/capacity; and `HeroProgressionDrawer.tsx` offers every unassigned shard on every slot.
- `retreatHandler.ts` and `penetrateHandler.ts` compute raw `hexSubtract` deltas without normalizing to 1 hex.

## Goals / Non-Goals

**Goals:**
- Introduce a clean, declarative 3-phase execution timing model (`PRE_ACTION`, `ON_RESOLVE`, `POST_ACTION`) on `AbilityEffect` and surface `POST_ACTION` clearly in ability formatting.
- Provide a single source of truth (`evaluateShardCompatibility`) for all 33 shards, enforced strictly in `validateUnitLoadout` and reflected in Camp UI (disabled-with-reason dropdown + automatic unsocketing on ability swaps).
- Unify multi-target `ON_RESOLVE` effect delivery across AoE blasts, Cones, and `DELAYED_BOMBARDMENT` detonations while keeping `SELF`-scoped effects strictly once-per-action.
- Normalize 1-hex displacement vectors in `retreatHandler` and `penetrateHandler`.

**Non-Goals:**
- Backward-compatible migrations or silent pruning for legacy local campaign saves (strict validation is preferred).
- Reworking or deleting `Confrontation Shard` / `FORCE_FACING` (keep as-is, classified as a Hostile Infusion).
- Changing melee hit-reaction facing or front-arc Stealth detection rules.

## Decisions

### 1. Explicit `timing` Property on `AbilityEffect`
- **Choice**: Add `readonly timing?: 'PRE_ACTION' | 'ON_RESOLVE' | 'POST_ACTION'` to `AbilityEffect` (defaulting to `'ON_RESOLVE'`).
- **Why**: Putting timing on `AbilityEffect` (rather than a shard-only wrapper) keeps the composable pipeline unified across base abilities, shards, and in-trial primers, and lets `abilityFormatter.ts` format `POST_ACTION` consistently (`After Action: ...`) with zero special-casing for `Shadow Shard`.
- **Execution order in `executeAbility`**:
  1. `PRE_ACTION` (pre-roll `RUSH_CHARGE` / `AERIAL_VAULT`)
  2. Roll & damage (primary + AoE/Cone splash)
  3. `ON_RESOLVE` (target-scoped per hit target; self-scoped once per action)
  4. `applyCombatEvents` + hit-reaction facing
  5. `onAfterAction` condition hooks (breaks pre-existing `STEALTH`, checks `CHALLENGED`)
  6. `POST_ACTION` (`executeAbilityEffects` filtered to `timing === 'POST_ACTION'`, committed via `applyCombatEvents`, and included in combat log outcomes)
- **Zone & non-damaging branches**: `DELAYED_BOMBARDMENT` and `SHRAPNEL_RUBBLE` execute `SELF`-scoped `ALWAYS` and `POST_ACTION` effects on launch before returning, and non-damaging Branch 1 executes `ON_RESOLVE` followed by `POST_ACTION`.
- **Alternative considered**: Snapshotting `activeConditions` before `executeAbilityEffects` and only passing pre-existing conditions to `onAfterAction`. Rejected as fragile because it only solves `STEALTH` and leaves timing implicit for tooltips and future post-action effects.

### 2. Declarative `ShardCompatibilityRule` on `AstralAugmentShard`
- **Choice**: Add a declarative `compatibility: ShardCompatibilityRule` field on `AstralAugmentShard` (evaluated by `evaluateShardCompatibility(shard, baseAbility)` in `src/core/progression/harmonization.ts`):
  ```ts
  export type ShardCompatibilityPreset =
    | 'ANY'
    | 'DAMAGING_ATTACK'
    | 'PHYSICAL_ATTACK'
    | 'RANGED_OR_MELEE_NON_CONE' // range >= 1 && !coneTemplate
    | 'HOSTILE_AOE'              // aoeRadius >= 1 && !coneTemplate && hostile (damageType !== 'NONE' || targetType === 'HEX')
    | 'HOSTILE_TARGETING'        // hostile attacks, hostile SINGLE_TARGET utilities, hostile HEX AoE (excluding TELEPORT & SHRAPNEL_RUBBLE)
    | 'MELEE_SINGLE_TARGET'      // damageType !== 'NONE' && SINGLE_TARGET && range === 1 && !aoeRadius && !coneTemplate
    | 'SINGLE_TARGET_ATTACK'     // damageType !== 'NONE' && SINGLE_TARGET && !aoeRadius && !coneTemplate
    | 'SINGLE_UNIT';             // (SINGLE_TARGET || ALLY) && !aoeRadius && !coneTemplate
  ```
- **Why**: A compact enum of structural presets directly mirrors the 10 shard groups, guarantees every shard has an explicit rule (enforced by TypeScript & unit tests across all 33 shards), and produces clean, consistent user-facing incompatibility reasons (e.g. `"Requires damaging attack"`, `"Requires physical attack"`, `"Requires hostile AoE"`, `"Requires melee attack"`, `"Requires single-target attack"`, `"Requires single-unit ability"`, `"Requires hostile ability"`, `"Requires range 1+ (non-cone)"`).
- **Base ability evaluation**: Compatibility is evaluated against the slot's **base** `Ability` (before applying another shard in the same 2-shard slot), so socketing order never causes circular eligibility shifts (e.g. `Astral Reach` + `Trample` on `Strike`, or `Aether` + `Starlight Lens`).
- **Alternative considered**: Free-form predicate functions per shard or extending `ModifierApplicabilityFilter` with 8+ boolean flags. Presets are easier to test exhaustively, inspect, and give human-readable UI reasons.

### 3. Strict Validation + Proactive Auto-Unsocketing Helper
- **Choice**:
  - Extend `validateUnitLoadout(unit, newLoadout, providers)` to accept `getAbility` (defaulting to `getAbilityById` or provided via `LoadoutLookupProviders`) so it resolves the base ability for every slot (`0..2` core, `3..4` wildcard) and rejects any incompatible shard or shard in an empty slot.
  - Export a pure helper `pruneIncompatibleSlotAugments(unit, loadout, providers)` used by `HeroProgressionDrawer` (and optionally by `updateCampUnitLoadout` callers) whenever `activeClassId` or `wildcardAbilityIds` changes, removing only incompatible shards from `slotAugments` so they immediately return to `availableToSocket`.
- **Why**: Keeps `validateUnitLoadout` strictly pure and uncompromising (per user preference: no legacy save migrations), while making class/wildcard switching in Camp seamless and error-free.

### 4. Unified Multi-Target `ON_RESOLVE` Delivery (AoE, Cone, Delayed Bombardment)
- **Choice**:
  - Partition `ON_RESOLVE` effects into **target-scoped** (`targetScope !== 'SELF'`) and **self-scoped** (`targetScope === 'SELF'`).
  - In damaging `executeAbility`, collect all hit targets along with their individual `HitOutcome` (center `targetCu` if present, plus every hit/grazed AoE/Cone secondary unit — excluding spared allies). Run target-scoped `ON_RESOLVE` effects once per hit target (passing that target's `hitOutcome` so `GRAZE` negates `HIT_OR_CRIT` infusions cleanly).
  - Run self-scoped `ON_RESOLVE` effects **once per action**, passing `bestHitOutcome` (`CRITICAL_HIT` > `SOLID_HIT` > `GRAZE` > `MISS`) across all contested targets so `HIT_OR_CRIT` self-buffs (`Aegis`, `Warding`, `Flourish`, `Carapace`, `Fury`, `Hold-Up`'s self CTB) trigger once if at least one target was hit.
  - Remove the ad-hoc `if (isCone)` condition loop in `resolver.ts` so Cones go through the same unified per-target `ON_RESOLVE` dispatcher (fixing `Shadow Shard` stealthing cone enemies automatically).
  - In `modifiers.ts`, allow `effectPatches` (`diceStep`, `diceCount`, `flatDamage`) to patch `DELAYED_BOMBARDMENT` effects as well as `DAMAGE` effects.
  - Extend `PendingBombardment` in `src/core/combat/types.ts` to snapshot `flatDamage`, `damageType`, `defenseTarget`, `attackRollBonus`, `critThreshold` / `CRIT_BOOST`, and `onHitEffects` (hostile target-scoped `ON_RESOLVE` effects + any `HIT_OR_CRIT` self-scoped effects). On detonation in `resolvePendingBombardmentsOnTurnStart`, construct `syntheticAbility` with those snapshotted stats and execute target-scoped `onHitEffects` per hit target (and `applyCombatEvents` / commit resulting statuses and displacements) plus any self-scoped `HIT_OR_CRIT` effects once on the living caster if >= 1 target was hit.
- **Note on AoE Knockback**: `knockbackHandler` uses `actorCoord` -> `targetCoord`, which works cleanly for every unit hit in an AoE without zero-vector issues on the center hex.

### 5. Normalized 1-Hex Direction Vectors in `retreatHandler` and `penetrateHandler`
- **Choice**: Compute a normalized 1-hex direction using `getDirectionBetween(targetCoord, actorCoord)` + `POINTY_HEX_DIRECTIONS` neighbor offset (from `src/core/grid/hex.ts`) in `retreatHandler`, and `getDirectionBetween(actorCoord, targetCoord)` neighbor offset in `penetrateHandler`, stepping exactly 1 hex past `targetCoord` along the normalized direction so even an `Astral Reach` + `Trample` melee strike at distance 2 lands cleanly 1 hex behind the target rather than jumping 4 hexes.
- **Why**: Eliminates multi-hex catapults on ranged `Recoil`/`Buckshot` and range-boosted `Trample` with minimal code.

## Risks / Trade-offs

- **Existing tests passing partial `validateUnitLoadout` providers** -> `validateUnitLoadout` currently takes `Pick<LoadoutLookupProviders, 'getPackage'>`. Make `getAbility?: (id: string) => Ability | undefined` optional with a fallback to `getAbilityById` from `src/data/packages` (or check if `slotAugments` is present) so existing unit tests without `getAbility` keep compiling while strictly validating all real slots.
- **AoE `ON_RESOLVE` displacement ordering (`Impact Shard` on `Arcane Blast`)** -> Running target-scoped `ON_RESOLVE` effects before `applyCombatEvents` could cause two knocked-back enemies to claim the same destination tile if their events aren't resolved sequentially against arena occupancy. Mitigation: either check `occupiedByUnitId` against pending displacements or apply displacement effects per target in deterministic order when multiple targets are knocked back in an AoE.
- **Existing tests that socket shards arbitrarily** -> Any existing unit/integration test that sockets an incompatible shard (e.g., `Starlight Lens` on a non-damaging skill) will now fail strict validation and must be updated to use a valid ability or compatible shard.
