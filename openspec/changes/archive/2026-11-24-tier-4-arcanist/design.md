# Design: Tier 4 Arcanist (`#96`, `0F, 1R, 3M`)

## Context

See `proposal.md` for motivation and scope. The Arcanist (`#96`, `0 Fighter, 1 Rogue, 3 Mage`) completes the Tier 4 class roster and introduces four clean, reusable engine extensions:
1. **Declarative friendly-fire exclusion and ally-transparent magical LoS (`PassiveTrait.excludeFriendlyAoE` and `PassiveTrait.ignoresAllyLoS`)** powering `Exclusion Matrix`.
2. **Unified lower-defense targeting (`DefenseTarget: 'LOWER_DEFENSE'`)** powering `Adaptive Formula`.
3. **Ally-refracting AoE conservation (`AbilityEffectType: 'ALLY_REFRACTION'`)** powering `Refractive Array`.
4. **Isolated-vs-clustered adjacency branching (`AbilityEffectType: 'DISTRIBUTIVE_PROOF'`)** powering `Distributive Proof`.

Consistent with `tier-4-theurge`, all behaviors are expressed via **generic, declarative flags and effect types** rather than hardcoded class or ability ID checks inside combat resolution, validation, preview, or AI modules.

## Goals / Non-Goals

**Goals:**
- Provide shared pure helpers for friendly-fire exclusion (`hasFriendlyAoEExclusion`), ally-transparent magical LoS (`createLoSScreeningPredicate`), and dynamic defense resolution (`resolveTargetDefense`) so `validator.ts`, `attackRoll.ts`, `resolver.ts`, `battlefieldZones.ts`, `targetPreview.ts`, and `decisionEngine.ts` stay 100% consistent.
- Support centering `HEX`-targeted hostile AoEs directly on a friendly unit's hex when `hasFriendlyAoEExclusion(actorCu)` is true, treating the center ally as spared (omitting center direct damage and counting them as a spared ally for `ALLY_REFRACTION`).
- Ensure `Exclusion Matrix` works cleanly as a Passive Wildcard across *all* hostile AoEs (including `Arcane Blast`, `Spell Sculpt`-expanded blasts, `Siege Barrage` delayed bombardments, and `Distributive Proof` clustered splashes) without transferring `Refractive Array`'s class-exclusive refraction multiplier to other abilities.
- Ensure every new effect emits structured `EffectOutcome` metadata and readable floating combat text labels (`REFRACT!`, `DISTRIBUTE!`) plus clean `abilityFormatter.ts` stat pills and effect clauses.

**Non-Goals:**
- Changing Dragoon's `Dragon Dive` / `Wyrmflame Breath` friendly-fire exception (tracked separately as `B.20` in `docs/plans/ACTIVE.md`).
- Adding an offensive `DISPEL` effect (`Unravel`) or dice-floor/graze-ratio modifiers (`Calculated Margin`), intentionally deferred to future classes.
- Counting Self as a spared ally for `ALLY_REFRACTION` (Self remains excluded from AoE effects per standard engine rules).

## Decisions

### 1. Declarative `PassiveTrait` Flags (`excludeFriendlyAoE` & `ignoresAllyLoS`) and Shared LoS Helper
- **Choice**: Add two optional boolean flags to `PassiveTrait` (`src/core/types/passive.ts`):
  - `excludeFriendlyAoE?: boolean`
  - `ignoresAllyLoS?: boolean`
- **Shared Helpers** (exported from a small pure utility or `validator.ts` / `effectiveVitals.ts`):
  - `hasFriendlyAoEExclusion(cu?: CombatUnit): boolean`: returns `Boolean(cu?.passives?.some((p) => p.excludeFriendlyAoE))`.
  - `isMagicalAbility(ability: Ability): boolean`: returns `ability.damageType === 'MAGICAL' || ability.archetypeTag === 'MAGE'`.
  - `createLoSScreeningPredicate(state: CombatState, actorCu: CombatUnit, ability: Ability): (unitId: string) => boolean`:
    - Always returns `false` if the intermediate unit has `STEALTH` (existing rule).
    - If `actorCu.passives?.some((p) => p.ignoresAllyLoS)` and `isMagicalAbility(ability)`, returns `false` when the intermediate unit shares `actorCu`'s faction (`unit.faction === actorCu.faction`).
    - Otherwise returns `true`.
- **Where Enforced**:
  - **LoS**: `validator.ts` (`HEX` and `SINGLE_TARGET`/`ALLY` checks), `targetPreview.ts`, and `decisionEngine.ts` (all 3 replace their inline `isUnitScreening` closures with `createLoSScreeningPredicate`).
  - **Friendly-Fire Exclusion**:
    - `resolver.ts` (center-hex `HEX` target check, secondary `aoeRadius`/`coneTemplate` splash loop, and `DISTRIBUTIVE_PROOF` clustered splash loop).
    - `battlefieldZones.ts` (`resolveDelayedBombardments` skips friendly targets when `snapshotActor` has `excludeFriendlyAoE`, so `Exclusion Matrix` works seamlessly as a Passive Wildcard on Ballistician!).
    - `targetPreview.ts` (skips spared friendly units from damaging AoE preview lists—and treats an ally-centered `HEX` AoE as a ground/splash preview targeting enemies in the blast).
    - `decisionEngine.ts` (sets friendly-fire penalty to `0` on damaging AoEs and delayed bombardments when `hasFriendlyAoEExclusion(cu)` is true).
- **Rationale**: One shared predicate guarantees the player UI preview, action validator, combat resolver, and AI never disagree on whether a shot is blocked by an ally or whether an ally will be harmed.
- **Alternative Considered**: Putting redirection directly on the Passive. Rejected because Passive Wildcards can be equipped on spammable 1-AP `Arcane Blast` or heavy `2d8` `Siege Barrage`, creating severe cross-class balance spikes.

### 2. Center-Hex Ally Handling & Deterministic `ALLY_REFRACTION` Resolution (`Refractive Array`)
- **Choice**: Model `Refractive Array`'s refraction as an atomic `AbilityEffect` (`{ type: 'ALLY_REFRACTION', damageProfile: { count: 1, sides: 4, modifierAttribute: 'focus' }, applyOn: 'ALWAYS' }`) on an `aoeRadius: 1`, `targetType: 'HEX'`, `splashLabel: 'ARRAY'` ability whose primary `DAMAGE` effect is `1d4 + Focus` (with `splashDamageProfile: { count: 1, sides: 4, modifierAttribute: 'focus' }` so every enemy in the radius takes `1d4 + Focus`, whether on the center hex or surrounding ring!).
- **How `HEX` Center-Ally Sparing Works in `resolver.ts`**:
  - Currently, if `targetType === 'HEX'` and a unit occupies `targetCoord`, `targetCu` is resolved as the primary target.
  - When `effectiveAbility.targetType === 'HEX'`, `effectiveAbility.damageType !== 'NONE'`, `targetCu` shares `actorCu.faction`, and `hasFriendlyAoEExclusion(actorCu)` (or the ability carries `ALLY_REFRACTION`) is true:
    - Treat `effectiveTargetCu` as `undefined` for primary attack roll & primary damage (rolling `resolveGroundAttackRoll` so the spell still produces a unified `d20 + Focus` spellcast roll without hitting the ally or logging `0 (Ground)`).
    - The center ally is still counted in `aoeHexes` as a spared ally for `ALLY_REFRACTION`.
- **How `ALLY_REFRACTION` Resolves**:
  1. After base center and surrounding blast hits finish (and any enemy reduced to `<= 0` HP is tracked as defeated), scan `aoeHexes` for living allies of `actorCu` (`unitId !== actorCu.unit.id`, same faction, `!isDefeated && currentHp > 0`). Let `sparedAlliesCount` be the number of such allies.
  2. Track `refractHitsReceived = new Map<string, number>()` for living enemies in `aoeHexes` whose simulated remaining HP after prior events in this resolution is `> 0`.
  3. For each spared ally (`0 .. sparedAlliesCount - 1`):
     - Filter enemies in `aoeHexes` with remaining HP `> 0`. If none remain, stop.
     - Sort remaining enemies deterministically by:
       1. `(refractHitsReceived.get(id) ?? 0)` ascending (ensures round-robin spread across enemies)
       2. `projectedCurrentHp` ascending (prioritizes lowest current HP)
       3. `unit.id` lexicographical ascending (deterministic tie-breaker)
     - Select the first enemy `recipientCu`. Increment `refractHitsReceived` for `recipientCu`.
     - Contest `rollResult.totalScore` against `resolveTargetDefense(recipientCu, effectiveAbility.defenseTarget)` (`SOLID_HIT` / `GRAZE` / `MISS` — matching standard AoE blast rules).
     - On Hit or Graze, roll `1d4 + Focus` via `resolveDamage`, deduct `projectedCurrentHp`, push a `DAMAGE` event (`reason: 'SPLASH'`, `label: 'REFRACT'`, `damageType: 'MAGICAL'`), and record a structured `COLLATERAL_HIT` outcome (`sourceLabel: 'Refract'`). On Miss, record a `COLLATERAL_HIT` miss outcome (`sourceLabel: 'Refract'`, `damage: 0`).
- **Rationale**: Tracking `projectedCurrentHp` during resolution prevents wasting refracted hits on an enemy already killed by the base blast or an earlier bounce, while the `(refractHitsReceived, currentHp, unitId)` sort key implements "spread round-robin across lowest-HP targets first, cycling if needed" in 5 lines of pure deterministic code.

### 3. Centralized `LOWER_DEFENSE` Resolution (`Adaptive Formula`)
- **Choice**: Add `'LOWER_DEFENSE'` to `DefenseTarget` in `src/core/types/ability.ts`, and export `resolveTargetDefense(targetCu: CombatUnit, defenseTarget: DefenseTarget): { value: number; label: 'Evasion' | 'Resolve' }` from `src/core/combat/attackRoll.ts`.
- **Rule**:
  - `'EVASION'` -> `{ value: getEffectiveEvasion(targetCu), label: 'Evasion' }`
  - `'RESOLVE'` -> `{ value: getEffectiveResolve(targetCu), label: 'Resolve' }`
  - `'LOWER_DEFENSE'` -> `const eva = getEffectiveEvasion(targetCu); const res = getEffectiveResolve(targetCu); return eva < res ? { value: eva, label: 'Evasion' } : { value: res, label: 'Resolve' };`
- **Call Sites**: `evaluateAttackRollContext` (`attackRoll.ts`), `resolveAttackRoll` (`attackRoll.ts`), secondary AoE defense contests (`resolver.ts`), `abilityFormatter.ts` (`DEFENSE_LABELS['LOWER_DEFENSE'] = 'Lower (EVA/RES)'`). Because `targetPreview.ts` and `decisionEngine.ts` already read `targetDefense` and `defenseType` from `evaluateAttackRollContext`, both UI target previews and AI scoring automatically display and score the exact lower defense!

### 4. `DISTRIBUTIVE_PROOF` Adjacency Branching (`Distributive Proof`)
- **Choice**: Add `'DISTRIBUTIVE_PROOF'` to `AbilityEffectType` (`src/core/types/ability.ts`), configured on `Distributive Proof` with `damageProfile: { count: 1, sides: 4 }` (clustered splash), `conditionType: 'EXPOSED'`, `durationTurns: 1` (with optional `bonusDamage` support for future variants).
- **Execution Flow in `resolver.ts`**:
  - Before primary damage rolls, check if `effectiveAbility` has a `DISTRIBUTIVE_PROOF` effect and `targetCu` + `targetCoord` exist.
  - Count living same-faction allies of `targetCu` occupying hexes at `hexDistance(targetCoord, pos) === 1` (`adjacentTargetAllies`).
  - **If `adjacentTargetAllies === 0` (Isolated)**:
    - Optionally passes `bonusDamageProfile` if declared on the effect, and during secondary effect dispatch on `HIT_OR_CRIT` (after `EXPOSED` consumption on lines 1192–1202), applies `EXPOSED` for `1` turn to `targetCu` and records the structured `CONDITION` outcome—creating a clean 1-2 combo into `Adaptive Formula`.
  - **If `adjacentTargetAllies >= 1` (Clustered)**:
    - After primary damage resolves, iterate over `getHexNeighbors(targetCoord)`. For every living occupant `adjCu` (`adjCu.unit.id !== actorCu.unit.id`):
      - If `hasFriendlyAoEExclusion(actorCu)` and `adjCu` shares `actorCu.faction`, skip `adjCu`.
      - Contest `rollResult.totalScore` against `getEffectiveResolve(adjCu)` (`SOLID_HIT` / `GRAZE` / `MISS`).
      - On Hit or Graze, roll `1d4` magical damage via `resolveDamage` (unmodified `1d4` splash profile), emit a `DAMAGE` event (`reason: 'SPLASH'`, `label: 'DISTRIBUTE'`), and record a structured `COLLATERAL_HIT` outcome (`sourceLabel: 'Distribute'`).
- **Rationale**: Keeping both branches inside a single declarative `DISTRIBUTIVE_PROOF` effect avoids adding ad-hoc `ISOLATED` / `CLUSTERED` flags onto unrelated effect types while preserving full composability with shard augments (`Force Shard`, `Impact Shard`, `Pyre Shard`, etc.).

### 5. AI Heuristics (`decisionEngine.ts`) & Visual Polish
- **AI (`decisionEngine.ts`)**:
  - Replace inline `isUnitScreening` with `createLoSScreeningPredicate` so Arcanist AI recognizes shots through frontline allies.
  - For damaging `HEX` AoEs and `DELAYED_BOMBARDMENT`, zero out the friendly-fire penalty when `hasFriendlyAoEExclusion(cu)` is true.
  - For `ALLY_REFRACTION`, when `caughtHostiles >= 1`, add expected damage bonus for each `caughtAllies` (excluding self), naturally teaching the Arcanist AI to target ally-occupied hexes surrounded by enemies!
  - For `DISTRIBUTIVE_PROOF`, evaluate `adjacentTargetAllies`: add `+2.5` expected bonus damage + `EXPOSED` setup bonus when isolated, or `+2.5 * adjacentEnemies` (minus ally splash penalty unless `hasFriendlyAoEExclusion`) when clustered.
- **Badge Palette & Token (`tokenAssets.ts`)**:
  - Whitelist `'96_human_male'` (exact-case `public/assets/tokens/pixel/96_human_male/Idle/rotations/*.png` already present on disk).
  - Add `arcanist: { primary: '#5b21b6', border: '#10b981' }` (Deep Arcane Violet / Geometric Emerald), matching the violet-and-emerald token palette and staying visually distinct from Wizard, Sorcerer, Witch, Warlock, and Theurge.

## Risks / Trade-offs

- **[Risk] Center-hex ally targeting in UI/Preview** -> Because `validator.ts` already allows `targetType: 'HEX'` on any walkable hex when `isAoE` is true, `targetPreview.ts` must also treat a friendly unit on `targetCoord` as spared (not as a hostile primary target!) when `hasFriendlyAoEExclusion(actorCu)` is true, so hovering over an ally's hex displays the enemy targets inside the blast radius rather than a friendly-fire preview against the ally.
- **[Risk] `Refractive Array` base damage vs `Arcane Blast` (`splashDamageProfile`)** -> Ensure `Refractive Array` explicitly sets `splashDamageProfile: { count: 1, sides: 4, modifierAttribute: 'focus' }` so enemies on the surrounding ring also receive `1d4 + Focus` (matching the center hex) rather than falling back to unmodified `1d4`.
- **[Risk] `Exclusion Matrix` paired with `Spell Sculpt` (Radius 2)** -> When `Spell Sculpt` expands `Refractive Array` to Radius 2, both teammates may sit inside the blast simultaneously; round-robin spread ensures refractions distribute across living enemies first rather than unexpectedly stacking both on a single target when multiple enemies are present.
