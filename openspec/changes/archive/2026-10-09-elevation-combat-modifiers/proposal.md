# Proposal

## Why

Phase 6.1 introduced discrete terrain elevation, weighted climbing costs, voluntary ledge drops, and 3D line-of-sight raycasting. However, combat resolution currently treats targeting, attack rolls, and knockback as flat two-dimensional interactions regardless of elevation differences.

Phase 6.2 activates tactical verticality by giving units genuine high-ground superiority, constraining melee reach over sheer drops, and enabling kinetic plunging knockbacks where forced displacement can cast foes off cliffs or slam them against high rock faces.

## What Changes

- **Ranged Elevation Vantage**: Ranged attacks (base range $\ge 2$) launched from higher ground ($\Delta h \ge 1$) gain $+1$ Effective Range per elevation difference.
- **Vertical Attack Roll Modifiers**:
  - Downward targeting: Attacking a target at lower elevation grants $+2$ to the Attack Roll ($\Delta h = 1$) or first-class **Advantage** ($\Delta h \ge 2$).
  - Upward targeting: Attacking a target at higher elevation suffers $-2$ to the Attack Roll ($\Delta h = -1$) or **Disadvantage** ($\Delta h \le -2$).
  - Integrated into existing attack roll advantage/disadvantage cancellation logic.
- **Melee Elevation Reach Constraints**:
  - Melee attacks (base range $\le 1$) are permitted across adjacent hexes with $|\Delta h| \le 1$ (inheriting downward attack roll bonuses when striking downward).
  - Melee attacks are strictly prohibited across $|\Delta h| \ge 2$, rejecting execution with an "out of reach" validation error.
- **Kinetic Plunging Knockback & Cliff-Slam**:
  - Knocking a unit down a ledge ($\Delta h \le -2$) displaces the target to the lower tile and inflicts Fall Impact Damage ($|\Delta h| \times 4$, unmitigated by Armor or Ward) in addition to displacement.
  - Knocking a unit up a cliff face ($\Delta h \ge \text{minCliffSlamElevationDelta}$, default 2) halts displacement at the cliff base and inflicts Cliff-Slam collision damage.
  - Knocking a unit onto a single step ($\Delta h = 1$) allows displacement up onto the terrace.
- **Balance Configuration**:
  - Add `minCliffSlamElevationDelta: 2` to `DISPLACEMENT_CONFIG` in `src/core/config/balance.ts`.
- **Combat Log & Event Fidelity**:
  - Combat logs record high-ground vantage bonuses, low-ground penalties, and plunging fall damage from knockback impacts.

## Capabilities

### New Capabilities
- `elevation-combat-modifiers`: Defines vertical targeting rules, high-ground ranged bonus, upward/downward attack roll modifiers, melee reach limits across elevation, and kinetic plunging knockback with fall impact damage.

### Modified Capabilities
*(None - existing `grid-elevation-traversal` and `composable-abilities` requirements remain unchanged)*

## Impact

- **Affected Systems**:
  - `src/core/config/balance.ts`: Extended with `minCliffSlamElevationDelta`.
  - `src/core/combat/validator.ts`: Enhanced `canExecuteAbility` to validate melee vertical reach ($|\Delta h| \le 1$) and high-ground range expansion ($\text{range} + \max(0, \Delta h)$).
  - `src/core/combat/attackRoll.ts`: Updated `resolveAttackRoll` options to incorporate elevation roll bonuses/penalties and advantage/disadvantage.
  - `src/core/combat/resolver.ts`: Computes elevation delta in `executeAbility`, feeding vertical modifiers to attack rolls and logging feedback.
  - `src/core/grid/arena.ts`: Enhanced `calculateKnockback` to support plunging drops, ledge fall damage calculation, and cliff slam detection at configurable delta.
  - `src/core/combat/effects/knockbackHandler.ts`: Emits unmitigated `FALL` damage events when knockback plunges a target off a ledge ($\Delta h \le -2$).
