# Design: Tier 4 Ballistician Class Kit & Token Integration

## Context

See `proposal.md` for motivation and `specs/tier-4-ballistician/spec.md` for behavioral requirements. The Ballistician (`#65`, `1 Fighter, 3 Rogue, 0 Mage`) introduces the first physical `SNIPER` class package in the constellation, centered on stationary calibration (`Zeroed In`), minimum-range blind spots (`minRange: 2`), delayed area bombardment (`Siege Barrage`), persistent hex rough terrain (`Shrapnel Canister`), and squad-wide target spotting (`Sighting Bolt`).

## Goals / Non-Goals

**Goals:**
- Implement a complete, tested Tier 4 Ballistician class package (`BALLISTICIAN_PACKAGE`) registered in global catalogs.
- Support minimum-range deadzones (`minRange`) across validation, targeting previews, UI stat strips, and AI scoring.
- Implement `Zeroed In` stationary stack tracking (`0..3` stacks) granting `+1 Range`, `+1 Attack Roll`, and `-1 Evasion` per stack, plus `+1 AoE Radius` at 3 stacks, clearing on voluntary movement, teleportation, or forced displacement.
- Implement arena-level active hex zones for **Delayed Bombardment (`Siege Barrage`)** and **Shrapnel Rubble (`Shrapnel Canister`)** with clean visual rendering and tooltips.
- Implement **Quadrant Telemetry (`TELEMETRY`)** target condition granting `+2 Range` and elevation/cover bypass to any ranged/spell attacker targeting the marked unit.

**Non-Goals:**
- Permanent elevation or impassable obstacle creation from mortar impacts (rubble is a 2-turn movement cost hazard).
- Applying `Sighting Bolt` secondary conditions (`EXPOSED`, `TELEMETRY`) on Graze outcomes (strictly follows `HIT_OR_CRIT`).

## Decisions

### 1. `Zeroed In` Calibration State on `CombatUnit` and `getEffectiveAbility`
- **Decision**: Track `zeroedInStacks?: number` (`0..3`) and a per-turn boolean `movedThisTurn?: boolean` on `CombatUnit`. Whenever a unit moves (`resolveMove`), teleports (`TELEPORT`, `AERIAL_VAULT`, `RUSH_CHARGE`, `PENETRATE_STEP`, `RETREAT_STEP`), or is displaced (`applyDisplacement`, `POSITION_SWAP`), set `movedThisTurn = true` and reset `zeroedInStacks = 0`. On turn end in `turnClock.ts`, if the unit has the `Zeroed In` passive and `!movedThisTurn`, increment `zeroedInStacks = Math.min(3, (cu.zeroedInStacks ?? 0) + 1)`.
- **Why**: Mirrors the proven `virtualHeight` lifecycle used by Dragoon's `Coiled Apex`. To integrate seamlessly with UI previews and targeting, `Zeroed In` stacks inject dynamic `IN_TRIAL` ability modifiers (`range: +stacks` for `range >= 2`, and `aoeRadius: +1` when `stacks === 3` and `aoeRadius >= 1`) and subtract `stacks` in `getEffectiveEvasion` while adding `+stacks` to `attackRoll.ts`.
- **Alternatives Considered**: Mutating base ability definitions—rejected because `getEffectiveAbility` already powers range validation, target previews, and `In-Trial` stat pill attribution.

### 2. Arena Zone State for `Siege Barrage` and `Shrapnel Rubble`
- **Decision**: Add two structured zone collections to `EncounterState`:
  1. `pendingBombardments: PendingBombardment[]` storing `{ id, sourceUnitId, sourceFaction, abilityId, centerCoord, hexCoords, remainingTurns: 1, snapshotActor }` so that even if the Ballistician is displaced or defeated while the shells are airborne, the volley still resolves at the start of the Ballistician's next turn (or at round wrap if defeated) using the actor's launch-time Finesse/Force/stacks snapshot.
  2. `hexHazards: HexHazard[]` storing `{ id, type: 'SHRAPNEL_RUBBLE', sourceUnitId, hexCoords, durationTurns: 2, extraMoveCost: 2 }`, ticked down at the start of `sourceUnitId`'s turn.
- **Why**: Keeping delayed bombardments and rubble hazards on `EncounterState` makes serialization, UI hex rendering, and pathfinding lookup (`roughTerrainHexKeys` in `MovementOptions`) deterministic and decoupled from individual unit buffs.
- **Alternatives Considered**: Storing rubble on `HexTile` inside `Arena`—rejected because `Arena` is largely structural geometry, whereas temporary turn-ticked combat zones belong on `EncounterState` alongside units and combat logs (or synced via helper). Actually, passing `roughTerrainHexKeys: ReadonlySet<string>` (or `extraStepCostByHexKey`) into `arena.getReachableHexes` / `arena.findPath` via `MovementOptions` (just like `terminalHexKeys` for Bastion Zone of Control!) keeps `Arena` pure and requires only a 2-line addition in `getReachableHexInfo`.

### 3. `TELEMETRY` Condition and Target-Aware Range Validation
- **Decision**: Register `TELEMETRY` in `CONDITION_REGISTRY` (`durationTurns: 2`). When validating or previewing a `SINGLE_TARGET` ranged/spell ability (`effectiveAbility.range >= 2`) against a target unit that has `TELEMETRY` (and is hostile to the actor), increase the allowed targeting distance against that specific unit by `+2` hexes and bypass low-ground elevation penalties and `hasBastionRangedCover`.
- **Why**: `TELEMETRY` is a property of the *target* rather than the *attacker*—any ranged or spell ally on the squad only gets the `+2 Range` and unobstructed accuracy when aiming at the painted target. Checking `targetCu` for `TELEMETRY` in `validator.ts`, `targetPreview.ts`, `attackRoll.ts`, and AI target reach evaluation models this cleanly without inflating the attacker's range against unpainted targets.

### 4. AI Heuristics for `SNIPER` Ballistician and Bombardment Hazard Avoidance
- **Decision**:
  - Update AI movement/positioning scoring so units with `Zeroed In` receive a positional retention bonus when they already have valid offensive targets in range and are not in an enemy's melee reach (`dist === 1`), preventing pointless 1-hex shuffles that would dump stacks.
  - Penalize ending a turn on a hex marked by a hostile `pendingBombardment` so AI units actively try to move out of incoming `Siege Barrage` zones (and feel the pain when `Shrapnel Rubble` traps them!).
  - Score `Shrapnel Canister` highly when it catches stealthed enemies or overlaps with a planned/active `Siege Barrage` cluster.

## Risks / Trade-offs

- **[Risk] Friendly fire on `Siege Barrage`** → *Mitigation*: Like `Arcane Blast`, `Siege Barrage` is an indiscriminate explosive bombardment across the marked hexes; AI target scoring already suppresses `HEX` AoE blasts when allies occupy the blast zone, and visual warning markers on the arena clearly show the player which hexes are marked before detonation.
- **[Risk] Defeated Ballistician turn-start hook skipped in `turnClock.ts`** → *Mitigation*: `turnClock.ts` checks `pendingBombardments` when advancing turns and resolves any airborne bombardment whose `sourceUnitId` is defeated once all living units have acted in the round (or ticks on CTB cycle).
