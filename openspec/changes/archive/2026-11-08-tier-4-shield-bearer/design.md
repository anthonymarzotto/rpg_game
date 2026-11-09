# Design

## Context

The Tier 4 constellation progression node `#05` defines the **Shield-bearer** with coordinates `3 Fighter, 1 Rogue, 0 Mage`. The system currently has authored kits for Tier 1, Tier 2, and Tier 3 hybrid classes, but no Tier 4 packages. Pixel token graphics for the Shield-bearer already exist at `public/assets/tokens/pixel/05_human_male`.

See `proposal.md` for motivation and `specs/tier-4-shield-bearer/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Provide a dedicated frontline anchor class prioritizing positional control, ally bodyguarding, and physical damage soak.
- Reflect the `3F, 1R, 0M` hybrid identity: predominantly heavy armor and shield defense, with 1 Rogue point driving agile tactical repositioning (Intercept Step).
- Introduce a 2 AP commitment stance (`Bastion Plant`) with forward Zone of Control and rear-arc cover.
- Ensure natural synergy between `Bastion Plant` ZOC and `Concussive Slam`'s non-displacing `SLOW` debuff.
- Whitelist the `05_human_male` sprite token and register the Slate Iron / Emerald class badge palette.

**Non-Goals:**
- Magical or energy barriers (reserved for Mage-hybrid Tier 4 classes like Theurge `#79`).
- Permanent damage immunity or passive invulnerability.
- Automated reaction interrupts (Intercept Step is an active player ability on the Shield-bearer's turn, not an out-of-turn reaction trigger).

## Decisions

### 1. Bastion Plant Action Economy (2 AP) & Armor Soak (+3)
- **Decision**: Make `Bastion Plant` cost 2 AP and grant `+3 Armor` for 1 turn along with `move: -99` (cannot move).
- **Rationale**: Standard AP per turn is 3. A 2 AP cost requires deliberate commitment: the unit can move 1 hex and plant, rescue an ally with Intercept Step (1 AP) and plant, or plant and slam (1 AP).
- **Armor Math**: Base Armor at Tier 4 with Force 3 is 3. `+3 Armor` raises effective physical soak to 6. Standard physical attacks (`1d6+2`, `1d4+3`) hit the minimum 1 damage floor, while heavy blows (`2d6+3`) still deal 4-5 damage. Zero Ward means magic spells completely bypass this physical barrier.
- **Alternatives Considered**: `+4 Armor` was considered too extreme, effectively trivializing all non-boss physical hits; 1 AP cost was rejected to prevent stance spam without tactical commitment.

### 2. Forward Zone of Control (ZOC) & Rear Cover Architecture
- **Decision**: Represent Phalanx Front using `getCombatArc` relative to the Shield-bearer's facing. Entering the 3 forward hexes (`CombatArc === 'FRONT'`) consumes remaining move budget or halts movement. Allies standing in the `REAR` hex gain cover (50% damage reduction against incoming ranged attacks).
- **Rationale**: Leverages the existing hex directional mathematics (`getCombatArc`) in `src/core/grid/hex.ts` without introducing ad-hoc coordinate hacks.
- **Alternatives Considered**: Physical wall obstacles dynamically spawned on hex edges. Rejected due to collision bugs and pathfinding state desync.

### 3. Intercept Step: Positional Swapping Effect Handler
- **Decision**: Add a dedicated effect handler `POSITION_SWAP` in `src/core/combat/effects/` supporting range 1-3 targeting an allied unit.
- **Rationale**: Swapping coordinates cleanly exchanges `unitPositions` in `CombatArena` without path collision checks, granting the ally `+2 Armor` for 1 turn. Tagged with archetype `ROGUE` to reflect the 1 Rogue point in the constellation and provide a unique wildcard utility for other classes.
- **Alternatives Considered**: Teleporting to an adjacent hex without moving the ally. Rejected because it does not rescue cornered squishy allies.

### 4. Concussive Slam: Melee Pinning without Knockback
- **Decision**: Author `Concussive Slam` as `1d6 + Force` physical damage vs Evasion, applying `SLOW` (-2 Move for 1 turn) with zero knockback displacement.
- **Rationale**: If Concussive Slam had knockback, it would push the enemy away and break the Shield-bearer's engagement. By omitting knockback and applying `SLOW`, enemies trapped by `Bastion Plant`'s ZOC remain stuck in front of the shield.
- **Alternatives Considered**: Knockback 1 hex with conditional daze on wall collision. Rejected because enemies in open terrain would be pushed to safety.

### 5. Unyielding Stance: Displacement Immunity & Phalanx Aura
- **Decision**: Extend `PassiveTrait` with `immuneToDisplacement: true`, inspected by `knockbackHandler` and retreat mechanics. Use existing `PassiveAuraEffect` with `targetScope: 'ALLIES'`, `radius: 1`, and `attackRollPenalty: 2`.
- **Rationale**: Perfectly fits the immovable fortress fantasy. Enemies attempting to knock back or pull the Shield-bearer fail, and allies clustering behind the shield receive defensive cover evaluated natively in `evaluateTargetAuras`.

## Risks / Trade-offs

- **[Risk] High Armor Stall**: At 6 effective Armor, pure physical brawler enemies may struggle to deal meaningful damage.
  - *Mitigation*: The stance lasts only 1 turn, costs 2 AP, and provides zero magical ward soak. Enemy Mages and elevation Advantage counters provide direct counterplay.
- **[Risk] AI Stance Locking**: An AI Shield-bearer might repeatedly use Bastion Plant even when enemies are out of range.
  - *Mitigation*: Configure `AIPrimerHint` or condition checks in the decision engine ensuring `Bastion Plant` is prioritized when enemies are within frontline engagement distance (distance 1-2).
