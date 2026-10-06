# Technical Design: Cavalier Class Package

## Context

Phase 5 introduces Tier 3 dual-archetype hybrid classes into Astral Tactics. The Cavalier `(2 Fighter, 1 Rogue, 0 Mage)` is the first hybrid class. The game engine features a decoupled simulation layer with axial hex coordinates (`HexCoord`), directional facings, composable ability pipelines (`AbilityEffect`), discrete status conditions, and kinetic displacement / wall-slam collision physics.

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/cavalier-class-package/proposal.md) for background and motivation, and [specs/tier-3-cavalier/spec.md](file:///c:/Repos/rpg_game/openspec/changes/cavalier-class-package/specs/tier-3-cavalier/spec.md) for requirements.

## Goals / Non-Goals

**Goals:**
* Implement the complete `cavalier.ts` class package defining `LANCE_CHARGE`, `RIDE_THROUGH`, `FLAMBOYANT_FLOURISH`, and `IMPACT_VELOCITY`.
* Implement straight-line rush mechanics for `Lance Charge` that advance the actor along the ray before resolving the strike and knockback.
* Implement penetration mechanics for `Ride-Through` that displace the actor to the hex directly behind the struck target when clear.
* Compose `Flamboyant Flourish` using existing atomic `CONDITION` and `STAT_MODIFIER` handlers without introducing custom status conditions.
* Wire `Impact Velocity` into kinetic collision damage resolution.
* Whitelist Cavalier pixel sprites (`01_human_male`) in presentation asset resolution.

**Non-Goals:**
* Implementing other Tier 3 hybrid classes (Berserker, Highwayman, etc. will be authored in subsequent dedicated changes).
* Modifying existing Tier 1 or Tier 2 class packages.
* Altering basic movement or CTB clock core rules.

## Decisions

### Decision 1: `Lance Charge` Spatial Rush & Collision Execution
* **Approach**:
  * Targeting: `targetType: 'SINGLE_TARGET'`, `range: 3`.
  * Validator (`validator.ts`):
    * Checks `hexDistance(actorCoord, targetCoord)` is between 2 and 3 inclusive (cannot charge at distance 1).
    * Computes ray using `getHexLine(actorCoord, targetCoord)`. Validates that the ray forms a strict straight line along standard hex directions.
    * Checks that all intermediate tiles and the penultimate destination tile (`line[line.length - 2]`) are walkable and unoccupied.
  * Resolver (`resolver.ts` / effect handler):
    * Displaces the actor to `line[line.length - 2]`.
    * Resolves attack roll against target Evasion (`1d8 + Force` physical damage).
    * Dispatches `KNOCKBACK: 1` against the target away from the actor, testing for wall-slam or unit collisions.
* **Alternatives considered**:
  * *Ranged spear poke without actor displacement*: Simpler, but lacks the mounted kinetic feel of a shock cavalry charge.
  * *Two separate actions (Move + Attack)*: Clunky for the player; packaging into a single 2 AP signature action provides clean tactile punch.

### Decision 2: `Ride-Through` Exit Hex Resolution
* **Approach**:
  * Actor must be adjacent (`hexDistance === 1`) to the target.
  * Exit hex is computed as `hexAdd(targetCoord, hexSubtract(targetCoord, actorCoord))` (the direct continuation vector 1 hex beyond the target).
  * If the exit hex exists in the arena, is walkable, and is unoccupied:
    * The actor is displaced to the exit hex after the strike.
  * If the exit hex is blocked or out of bounds:
    * The strike still resolves normally, but the actor remains in their origin hex.
* **Alternatives considered**:
  * *Knocking back the target instead*: Overlaps directly with `Shield Bash`. Moving the actor through the target creates a unique positioning tool for line penetration and flank exposure.

### Decision 3: `Flamboyant Flourish` Atomic Composition
* **Approach**:
  * Composed of two existing atomic effects on a single 1 AP ability:
    1. `{ type: 'CONDITION', conditionType: 'CHALLENGED', durationTurns: 2, targetScope: 'TARGET' }`
    2. `{ type: 'STAT_MODIFIER', magnitude: 2, durationTurns: 1, targetScope: 'SELF', statModifiers: { evasion: 2 } }`
  * No new effect types or conditions are required; fits cleanly into `executeAbilityEffects`.
* **Alternatives considered**:
  * *Granting temporary Stealth*: Thematically inappropriate for a haughty cavalier who wants all eyes on them.

### Decision 4: Decoupled Collision Damage Resolution & `Impact Velocity`
* **Approach**:
  * Instead of inspecting passive IDs or hardcoding class checks inside `knockbackHandler.ts`, generalize collision calculation in `src/core/combat/damageEngine.ts` via `resolveCollisionDamage(actorCu, targetCu, ability)`:
    * Mirrors primary `resolveDamage` by centralizing physical kinetic damage math: base wall slam damage + attribute bonus + passive collision bonus - target effective armor.
    * In `src/core/types/passive.ts`, add an optional declarative numeric modifier `readonly collisionDamageBonus?: number` to `PassiveTrait`.
    * `resolveCollisionDamage` aggregates all `p.collisionDamageBonus ?? 0` across the actor's passives generically without checking trait IDs.
  * In `knockbackHandler.ts`, delegate directly to `resolveCollisionDamage(actorCu, targetCu, ctx.ability)` upon collision.
  * `IMPACT_VELOCITY` in `cavalier.ts` simply declares `collisionDamageBonus: 2`.
* **Alternatives considered**:
  * *Inspecting `actorCu.passives` for string ID `'impact_velocity'`*: Brittle, non-scalable, and tightly couples effect handlers to specific classes.
  * *Reactive `ON_COLLISION` passive hook*: Overkill for a synchronous numeric modifier, adding unnecessary event round-trips.

## Risks / Trade-offs

* **[Risk: Obstructed straight line in compact radial arenas]** → *Mitigation*: The validator provides explicit feedback reasons (`"Lance Charge requires an unobstructed straight hex ray of 2-3 hexes"`), preventing invalid AP expenditure.
* **[Risk: Actor displacement colliding with unexpected arena boundaries]** → *Mitigation*: Strictly verify destination hex walkability and occupancy before updating unit coordinates in both `Lance Charge` and `Ride-Through`.
