# Design

## Context

Phase 6 established 3D hex elevation tiers ($h \in [0, 3]$), weighted climb costs ($1 + \max(0, \Delta h)$ MP), unmitigated fall impact damage ($|\Delta h| \times 4$), continuous 3D line-of-sight raycasting, and plunging knockback. During Phase 6 development, extensibility hooks were built into the combat core anticipating the Cat-burglar class:
- `immuneToFallDamage` in `PassiveTrait` and `resolveFallDamage`
- `immuneToCollisionDamage` in `PassiveTrait`
- `reachElevationDelta` and `ignoresElevationPenalty` in `validator.ts`
- `targetType: 'HEX'` resolution for displacement

The Cat-burglar `(0, 2, 1)` (Rogue/Mage) package completes the Tier 3 hybrid class catalog as the 6th dual-archetype class, emphasizing acrobatic terrain traversal, tempo siphoning, facing disruption, and immunity/subversion of kinetic collision damage.

## Goals / Non-Goals

**Goals:**
- Provide a complete, battle-tested `CAT_BURGLAR_PACKAGE` in `src/data/packages/catBurglar.ts` adhering to the `ClassPackage` contract.
- Implement `Rooftop Vault`: 1 AP, range 2 leap bypassing climb costs and obstacles, granting +2 Evasion for 1 turn upon landing.
- Implement `Pilfer`: 1 AP, range 1 attack dealing 1d4 + Finesse physical damage while siphoning 20 CTB ticks directly into the user (net 40 CTB swing).
- Implement `Flash Powder`: 1 AP, range 2 thrown hex AoE (radius 1) forcing affected enemies to face 180° away from the blast center (`FORCE_FACING_AWAY`) and inflicting -2 Attack Roll for 1 turn.
- Implement `Feline Grace`: Fall impact damage immunity, cat-like knockback rebound (vaulting up cliffs or over obstacles), and +2 flat Evasion.
- Configure AI profile `SKIRMISHER` with heuristics that evaluate the solo heist combo (`Flash -> Vault -> Pilfer`).
- Integrate Cat-burglar into Stage 5+ enemy encounter threat budgeting and UI token assets with dedicated palette styling.

**Non-Goals:**
- Inventory or item theft systems (theft in Astral Tactics is modeled strictly as turn-gauge tempo siphoning and defense disruption).
- Wall-climbing persistent states or infinite-height flight (vaulting operates within 2-hex range and discrete arena elevation $h \in [0, 3]$).
- Introducing new status condition primitives (Flash Powder uses existing `STAT_MODIFIER` with `attackRoll: -2` and `FORCE_FACING_AWAY`).

## Decisions

### 1. Hex Leap via `targetType: 'HEX'` for Rooftop Vault
- **Decision**: Define `Rooftop Vault` with `targetType: 'HEX'`, `range: 2`, and effect type `TELEPORT` (with log display distinguishing vaulting/leaping), followed by self `STAT_MODIFIER` for +2 Evasion.
- **Rationale**: `targetType: 'HEX'` already validates target tile walkability and occupancy without imposing ground movement pathing costs, allowing natural leaps over intervening chasms, cliffs, or units.
- **Alternatives Considered**: Creating a dedicated pathfinding movement mode. Rejected because standard movement consumes MP and respects terrain adjacency, whereas vaulting is an instantaneous 1 AP kinetic reposition.

### 2. Tempo Siphon Architecture in `Pilfer`
- **Decision**: Compose `Pilfer` effects as:
  ```ts
  effects: [
    { type: 'DAMAGE', damageProfile: { count: 1, sides: 4, modifierAttribute: 'finesse' } },
    { type: 'CTB_DELAY', magnitude: 20 },
    { type: 'INITIATIVE_BOOST', targetScope: 'SELF', magnitude: 20, applyOn: 'HIT_OR_CRIT' }
  ]
  ```
- **Rationale**: `registry.ts` already redirects `targetScope === 'SELF'` to `ctx.actorCu`. This enables seamless target delay and user acceleration within an atomic ability without custom pipeline handlers.
- **Alternatives Considered**: A custom `CTB_STEAL` effect handler. Rejected to avoid redundant effect types when composition of existing primitives is already supported.

### 3. Thrown Flash Powder at Range 2 with AoE 1
- **Decision**: Set `Flash Powder` to Range 2, `aoeRadius: 1`, `targetType: 'HEX'`.
- **Rationale**: Range 2 keeps the Burglar in the tactical skirmisher pocket, scaling to Range 4 on high-ground peaks ($h=2$). It enables the self-sufficient 3-AP Solo Heist turn: 1 AP Flash Powder to spin target away -> 1 AP Rooftop Vault into the exposed REAR hex -> 1 AP Pilfer striking the rear with Flank Advantage.
- **Alternatives Considered**: Range 3 (rejected to avoid turning the burglar into an orbital artillery mortar) and Range 1 melee burst (rejected because it prevents the Burglar from preparing an infiltration before vaulting in).

### 4. Feline Grace Knockback Rebound Mechanics
- **Decision**: Extend `Arena.calculateKnockback` or provide a knockback option for units with `immuneToCollisionDamage` / `canVaultOnKnockback`:
  - When pushed into $\Delta h \ge \text{minCliffSlamElevationDelta}$, if the elevated tile is walkable and unoccupied, the unit steps up onto the cliff top (`current = nextCoord`) rather than halting with a collision.
  - When pushed toward an unwalkable 1-hex obstacle, if the hex immediately behind it in the knockback vector is walkable and unoccupied, the unit vaults over the obstacle.
  - When pushed into an impassable boundary wall, collision damage resolves to 0 via `immuneToCollisionDamage`.
- **Rationale**: Directly realizes the fantasy that "cats always land on their feet" and cannot be trapped against terrain.

## Risks / Trade-offs

- **[Risk]**: Flash Powder forcing facing 180° away from blast center might produce ambiguous facing if the blast center is on the exact same hex as the target.
  → **Mitigation**: When blast center equals target hex, rotate 180° opposite the caster (`actorPos`), ensuring deterministic facing away from the threat.
- **[Risk]**: Knockback vaulting over obstacles might leap across multiple contiguous obstacles.
  → **Mitigation**: Limit obstacle vaulting to single-hex obstacles; if the far-side hex is also unwalkable or off-map, halt safely at the obstacle with 0 collision damage.
- **[Risk]**: AI Skirmisher profile might get caught in endless flash loops.
  → **Mitigation**: `scoreDebuffAndUtility` gives 0 score to Flash Powder if the target already has the `-2 Attack Roll` modifier.
