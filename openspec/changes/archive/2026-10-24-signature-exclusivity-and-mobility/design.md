# Design: Signature Ability Exclusivity & Mobility Refactor

## Context

See `proposal.md` for background and motivation.

In the current codebase:
- `validateUnitLoadout` in `src/core/units/loadout.ts` loops over `constellation` classes and adds `pkg.signatureAbility.id` to `allowedAbilityIds`.
- `HeroProgressionDrawer.tsx` populates the Resonant Ability dropdown using both `pkg.signatureAbility` and `pkg.domainAbilities`.
- `canExecuteAbility` in `src/core/combat/validator.ts` skips elevation reach checks for all abilities with `range >= 2`, which allows `Shadow Step` (Range 2, Teleport) to teleport up onto high cliffs and plunge down ledges with zero pathing or elevation restrictions.
- `Rooftop Vault` in `src/data/packages/catBurglar.ts` has `range: 2`, matching `Shadow Step` and leaving it mechanically redundant.

## Goals / Non-Goals

**Goals:**
- Enforce that Signature Abilities can never be equipped into wildcard/resonant slots by other classes.
- Restrict `Shadow Step` strictly to same-elevation hexes ($\Delta h = 0$), preventing upward cliff scaling and preventing downward fall damage circumvention.
- Elevate `Rooftop Vault` to Range 3 with unconstrained 3D verticality, establishing it as the premier acrobatic traversal ability.
- Align AI candidate filtering in `decisionEngine.ts` with both abilities.
- Update test simulations and mock encounter loadouts to adhere to legal domain abilities.

**Non-Goals:**
- Modifying general melee reach rules (`range <= 1`) or changing `getLineOfSightObstruction` for standard ranged damaging spells.
- Reworking `Feline Grace` passive or altering other Cat-Burglar abilities (`Pilfer`, `Flash Powder`).
- Changing off-node progression logic (off-node already exclusively grants domain abilities).

## Decisions

### 1. Enforcing Signature Exclusivity via Package Structure
- **Choice**: Filter allowed wildcard abilities strictly using `pkg.domainAbilities` in both `src/core/units/loadout.ts` and `src/ui/camp/HeroProgressionDrawer.tsx`.
- **Rationale**: `ClassPackage` already has explicit, strongly-typed fields `signatureAbility: Ability` and `domainAbilities: readonly Ability[]`. Omitting `pkg.signatureAbility` directly at the aggregation points requires no extra flags or migration of ability definitions.
- **Alternatives Considered**:
  - *Adding an `isSignature: boolean` flag on `Ability`*: Rejected as redundant metadata that could become out of sync with package definitions.

### 2. Declarative `sameElevationOnly` Trait on Ability
- **Choice**: Add an optional property `sameElevationOnly?: boolean` to the `Ability` interface in `src/core/types/ability.ts`, set to `true` on `SHADOW_STEP`.
- **Validation**: In `validator.ts`, evaluate:
  ```typescript
  if (effectiveAbility.sameElevationOnly) {
    const destElevation = state.arena.getElevation(destCoord);
    if (destElevation !== actorElevation) {
      return {
        valid: false,
        reason: `Target is at a different elevation (${destElevation} vs ${actorElevation}); Shadow Step requires same elevation.`
      };
    }
  }
  ```
- **Rationale**: Clean, declarative, and easily reusable for future ground-hugging or subterranean abilities.
- **Alternatives Considered**:
  - *`maxElevationClimb: 0` (allowing downward descent)*: Rejected because downward teleportation bypasses plunging ledge fall damage, which undermines `Feline Grace`'s unique fall immunity.

### 3. Rooftop Vault Range Expansion & AI Integration
- **Choice**: Update `ROOFTOP_VAULT` in `catBurglar.ts` to `range: 3`.
- **AI Decision Engine**: In `src/core/ai/decisionEngine.ts`:
  - `candHex` generation already uses `getAbilityRangeCoords`, which naturally extends to Range 3 (and Range 4–5 from vantage peaks).
  - Add an elevation equality check when evaluating candidate hexes for abilities declaring `sameElevationOnly: true`, preventing AI Thieves from picking cliff destinations for `Shadow Step`.

### 4. Simulation & Test Migration
- **Choice**: In `squadSimulation.ts`, update `DEFAULT_CLASS_RESONANT_LOADOUTS`:
  - Infiltrator: swap `sneak_attack` $\rightarrow$ `skirmish`.
  - Cat-Burglar: swap `sneak_attack` $\rightarrow$ `skirmish`.
  - Novice Sandbox (`noviceSandbox.ts`): swap `sneak_attack` $\rightarrow$ `skirmish`.
- **Rationale**: `skirmish` is Thief's primary Tier 1 domain ability, preserving the thematic Rogue mobility kit while strictly complying with the domain-only rule.

## Risks / Trade-offs

- **[Risk] Existing Saves / Test Loadouts With Signature Wildcards**: Legacy test fixtures or existing saved loadouts that equipped `sneak_attack` will fail validation.
  - *Mitigation*: Update all known mock loadouts across `loadout.test.ts`, `tier2ProgressionIntegration.test.ts`, and `squadSimulation.ts`. The campaign loader already reconciles and clamps invalid loadouts back to valid states.
- **[Risk] AI Turn Freezes on Elevation Teleport**: If the AI attempts to select an elevated hex for `Shadow Step`, execution could throw a validation error.
  - *Mitigation*: Filter out candidates with `destElevation !== currentElevation` directly inside `decisionEngine.ts` candidate selection.
