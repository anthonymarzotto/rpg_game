# Design

## Context

Phase 6.1 established the underlying 3D coordinate system, where each `HexTile` possesses an integer elevation $h \in [0, 3]$, and line-of-sight is determined through 3D slope raycasting.

However, combat targeting and resolution currently treat combat as two-dimensional:
- `canExecuteAbility` checks `hexDistance(actorCoord, targetCoord) <= ability.range` regardless of height.
- Melee attacks (`range: 1`) can currently target adjacent units across any vertical disparity (e.g. elevation 3 down to elevation 0).
- `resolveAttackRoll` evaluates attribute modifiers, flank/rear, stealth, and challenged conditions, but does not factor in elevation vantage.
- `Arena.calculateKnockback` uses a hardcoded `maxJumpElevation` (1) and does not calculate plunging ledge fall damage when foes are thrown off cliffs.

## Goals / Non-Goals

**Goals:**
- Implement ranged elevation vantage, dynamically extending effective range for attacks with base range $\ge 2$ when firing from higher ground: $\text{effectiveRange} = \text{baseRange} + \max(0, h_{\text{actor}} - h_{\text{target}})$.
- Implement vertical attack roll modifiers: $+2$ bonus ($\Delta h = 1$), Advantage ($\Delta h \ge 2$), $-2$ penalty ($\Delta h = -1$), Disadvantage ($\Delta h \le -2$).
- Enforce vertical melee reach limits: reject melee attacks (`range \le 1`) when $|\Delta h| \ge 2$.
- Implement plunging knockback fall damage: targets knocked over a cliff ($\Delta h \le -2$) suffer direct, unmitigated fall damage ($|\Delta h| \times 4$).
- Implement configurable cliff-slam collisions via `DISPLACEMENT_CONFIG.minCliffSlamElevationDelta` (default 2), allowing knockback to step up onto $\Delta h = 1$ terraces while colliding with $\Delta h \ge 2$ cliff faces.
- Provide clear combat log messages for vertical advantages, penalties, cliff slams, and plunging fall damage.

**Non-Goals:**
- Procedural 2.5D SVG prism rendering and UI CSS gradients (deferred to Phase 6.3).
- Radius 4 arena procedural generation (Phase 6.3).
- Cat-burglar class package and climbing ability kits (Phase 6b).
- Modifications to voluntary movement traversal costs or pathfinding (completed in Phase 6.1).

## Decisions

### 1. Ranged Vantage & Melee Reach in Ability Validation
- **Decision**: In `src/core/combat/validator.ts` (`canExecuteAbility`), inspect actor elevation $h_{\text{actor}}$ and target elevation $h_{\text{target}}$:
  - If ability has `range <= 1` (melee): validate $|\Delta h| \le 1$. If $|\Delta h| \ge 2$, return `{ valid: false, reason: 'Target is vertically out of reach (elevation difference exceeds 1).' }`.
  - If ability has `range > 1` (ranged): compute effective targeting range as `effectiveRange = ability.range + Math.max(0, h_{\text{actor}} - h_{\text{target}})`.
- **Rationale**: Minimal architectural complexity. All melee abilities in the game currently have `range: 1`, while ranged spells and projectiles have `range >= 2`. No changes to `Ability` interface contracts are required.
- **Alternatives Considered**: Adding an explicit `deliveryType: 'MELEE' | 'RANGED'` field to `Ability`. Rejected as unnecessary overhead since `range <= 1` unambiguously characterizes melee reach in the existing ruleset.

### 2. Vertical Modifiers in Attack Roll Resolution
- **Decision**: In `src/core/combat/attackRoll.ts` and `src/core/combat/resolver.ts`:
  - Calculate $\Delta h = h_{\text{actor}} - h_{\text{target}}$.
  - If $\Delta h = 1$: pass `rollBonus = 2` (or adjust net roll modifier).
  - If $\Delta h \ge 2$: pass `elevationAdvantage = true`.
  - If $\Delta h = -1$: pass `rollPenalty = 2`.
  - If $\Delta h \le -2$: pass `elevationDisadvantage = true`.
  - In `resolveAttackRoll`, unify `elevationAdvantage` and `elevationDisadvantage` with `STEALTH`, `CHALLENGED`, and passive advantage/disadvantage flags. Standard cancellation applies: if both Advantage and Disadvantage are present, resolve as `NORMAL`.
- **Rationale**: Cleanly encapsulates D&D 5e-style advantage/disadvantage mechanics and preserves existing condition interactions.
- **Alternatives Considered**: Applying flat numerical bonuses for all height differences (e.g. +2 and +4). Rejected because the milestone plan explicitly specifies Advantage/Disadvantage for dramatic height differentials ($\Delta h \ge 2$).

### 3. Kinetic Plunging Knockback & Cliff-Slam in Arena & Effects
- **Decision**:
  - Add `minCliffSlamElevationDelta: 2` to `DISPLACEMENT_CONFIG` in `src/core/config/balance.ts`.
  - In `Arena.calculateKnockback`:
    - When evaluating step from `current` to `nextCoord`:
      - Step Up: if `nextTile.elevation - currentTile.elevation >= minCliffSlamElevationDelta`, halt displacement, mark `isCollided: true`, and set `collisionType: 'CLIFF'`. If difference is exactly $+1$, allow stepping up without collision.
      - Step Down: if `nextTile.elevation - currentTile.elevation <= -2`, record plunge information: `fallDamage = Math.abs(nextTile.elevation - currentTile.elevation) * DISPLACEMENT_CONFIG.fallDamagePerElevation`.
    - Return `fallDamage?: number` on `KnockbackResult`.
  - In `knockbackHandler.ts`:
    - If `knockbackResult.fallDamage > 0`:
      - Emit a `DAMAGE` event with `damageType: 'PHYSICAL'`, `reason: 'FALL'`, and `amount: knockbackResult.fallDamage`.
      - Append plunge fall damage detail to `logDetail`.
- **Rationale**: Keeps spatial physics inside `Arena.calculateKnockback` while effect handling and combat events remain cleanly inside `knockbackHandler.ts`.
- **Alternatives Considered**: Calculating fall damage outside `calculateKnockback` by checking positions in `knockbackHandler`. Rejected because `calculateKnockback` already traverses intermediate steps and knows exact per-step cliff drops.

### 4. Modular Extensibility & Trait Overrides (Phase 6b & Ability Customization)
To guarantee seamless extensibility for upcoming Phase 6b classes (e.g. Cat-Burglar's *Feline Grace* passive) and future skills/equipment:
- **Centralized Fall Damage Hook (`resolveFallDamage`)**:
  - Both voluntary movement ledge drops (`executeMove`) and involuntary knockback plunges (`knockbackHandler`) resolve through a centralized helper:
    `resolveFallDamage(cu: CombatUnit, rawFallDamage: number): number`.
  - Inspects passive traits and active modifiers for fall damage immunity (`cu.passives?.some(p => p.immuneToFallDamage)`). When immune, it yields 0 damage.
- **Extensible Elevation Attack Hook (`calculateElevationAttackModifier`)**:
  - Encapsulates vertical roll modifier logic in a clean helper:
    `calculateElevationAttackModifier(actorCu: CombatUnit, targetCu: CombatUnit, elevationDelta: number, ability: Ability): ElevationAttackModifierResult`.
  - Returns `{ rollBonus, rollPenalty, grantsAdvantage, grantsDisadvantage }`.
  - Checks if the actor or ability has flags/passives that suppress upward penalties (e.g. `actorCu.passives?.some(p => p.ignoresElevationPenalty)` or `ability.ignoresElevationPenalty`), immediately zeroing out low-ground $-2$ penalties and Disadvantage.
- **Configurable Vertical Melee Reach**:
  - In `canExecuteAbility`, vertical reach limit defaults to `1` for melee (`range <= 1`), but checks `ability.reachElevationDelta` or actor passives (`p.ignoresElevationReach`), making skills like *Rooftop Vault* (scaling $\Delta h = 2$ cliffs) or reach polearms trivially pluggable.

## Risks / Trade-offs

- **[Risk]**: Advantage from high ground might unintentionally mask or be masked by other conditions.
  → **Mitigation**: Unit tests covering combinations of High Ground + Challenged, High Ground + Stealth, and Low Ground + Stealth to verify standard D&D cancellation.
- **[Risk]**: Knockback plunge fall damage might be mitigated by Armor/Ward.
  → **Mitigation**: `applyCombatEvents` treats `reason: 'FALL'` as direct unmitigated HP reduction, which already exists for voluntary movement fall damage. Unit tests will explicitly assert target with Armor/Ward suffers exact unmitigated damage.
- **[Risk]**: Melee abilities with reach (future design) might be blocked.
  → **Mitigation**: Design checks `ability.range <= 1`. When reach weapons (e.g. polearms with range 2) are introduced in future expansions, they will naturally be handled by range > 1 or dedicated reach traits.

## Migration Plan

1. Update `src/core/config/balance.ts` with `minCliffSlamElevationDelta`.
2. Update `src/core/grid/arena.ts` to support configurable cliff-slam elevation delta and calculate plunging fall damage.
3. Update `src/core/combat/effects/knockbackHandler.ts` to emit unmitigated fall damage events on plunging knockbacks.
4. Update `src/core/combat/validator.ts` to enforce melee vertical reach and apply ranged elevation vantage.
5. Update `src/core/combat/attackRoll.ts` and `src/core/combat/resolver.ts` to compute vertical attack roll modifiers and log feedback.
6. Author comprehensive unit and integration tests covering all vertical combat scenarios.
