# Design: Tier 4 Dragoon Class Kit & Token Integration

## Context

See `proposal.md` for motivation. The Dragoon (`#07`, `3 Fighter, 0 Rogue, 1 Mage`) is designed as a vertical aerial vanguard that bridges martial Force with draconic arcane flame. While existing martial classes rely on horizontal ground mobility (Cavalier charge, Rogue shadow step, or Shield-bearer phalanx plant), the Dragoon introduces aerial vaulting and Virtual Height mechanics.

## Goals / Non-Goals

**Goals:**
- Implement a complete, fully tested Tier 4 Dragoon class package (`DRAGOON_PACKAGE`) registered in global catalogs.
- Support aerial gap-closing via `Dragon Dive` that vaults over obstacles and lands in the target's rear arc without requiring two-click UI.
- Support straight-line multi-target penetration via `Piercing Thrust` scaling cleanly with Force alongside `Cleave`.
- Support 4-hex forward cone AoE magic via `Wyrmflame Breath`.
- Implement `Coiled Apex` with Virtual Height as an attack roll modifier to avoid melee reach lockouts.
- Whitelist `07_human_male` and configure visual badge styling.

**Non-Goals:**
- Building modal two-click target picking (all abilities remain single-click).
- Granting passive fall damage immunity from involuntary cliff knockbacks (retained as unique to Cat-burglar).
- Mutating physical grid tile elevation permanently (Virtual Height is an active combat modifier).

## Decisions

### 1. Single-Click Deterministic Landing Hex for Dragon Dive
- **Decision**: When `Dragon Dive` targets an enemy unit at range 2–3, the engine determines landing position by checking the hex directly behind the enemy along the trajectory (`line[line.length]`). If that hex is walkable and unoccupied, the Dragoon lands in the rear arc. If blocked or occupied, the engine falls back to the near hex directly in front of the enemy (`line[line.length - 2]`). If all adjacent hexes are blocked, the ability is invalid.
- **Why**: Zero UI overhead. Keeps combat fluid, deterministic, and fast-paced while giving the player a clear ghost landing preview on hover.
- **Alternatives Considered**: Two-click modal targeting (pick target, then pick landing hex)—rejected for UX friction and complexity.

### 2. Virtual Height as Combat Vantage Context vs. Grid Elevation Mutation
- **Decision**: When a unit conserves AP with `Coiled Apex`, they gain `virtualElevation: 1` (for 1 unspent AP) or `virtualElevation: 2` (for 2+ unspent AP). This value is factored into `calculateElevationAttackModifier` and damage resolution, but does NOT modify the arena tile's physical elevation coordinate.
- **Why**: In `validator.ts`, melee attacks across `|dh| >= 2` are rejected as vertically out of reach. Treating Virtual Height as an attack roll context modifier allows the Dragoon and adjacent foes to remain within legal melee reach while granting full high-ground offensive advantages (+2 to hit or Advantage, +2 flat damage) and low-ground defensive penalties (-2 or Disadvantage to attackers).
- **Alternatives Considered**: Modifying tile elevation—rejected because it breaks melee reach for adjacent combatants. Flat Armor stacking—rejected because it encroaches on Shield-bearer's identity.

### 3. Longitudinal Line Pierce with Full Force Scaling
- **Decision**: `Piercing Thrust` deals `1d6 + Force` to the primary target and `1d4 + Force` to the rear aligned unit.
- **Why**: Scales `+2 * Force` into late game, matching the scaling of `Cleave` (`2d4 + 2 * Force`) while requiring harder straight-line hex alignment.
- **Alternatives Considered**: Flat `1d4` without Force on the rear unit—rejected because it fell behind Cleave significantly in higher tiers.

### 4. 4-Hex Forward Cone Geometry for Wyrmflame Breath
- **Decision**: Computes the 4-hex cone relative to the actor's current facing: 1 apex hex at distance 1 (`facing`), plus 3 fan hexes at distance 2 (`(facing + 5) % 6`, `facing`, and `(facing + 1) % 6`).
- **Why**: Fits the pointy-topped hex geometry seamlessly and provides a clean, predictable template.

## Risks / Trade-offs

- **[Risk] Hover preview ambiguity for Dragon Dive landing hex** → *Mitigation*: Emits destination landing hex coordinates in `AbilityMetrics` and highlights the landing hex with a jump indicator marker in the UI target preview.
- **[Risk] Virtual Height persisting indefinitely if Dragoon only moves** → *Mitigation*: Virtual Height state is cleared upon resolving an attack roll or upon starting a new turn.
- **[Risk] Friendly fire in cone or shockwave** → *Mitigation*: Both `Dragon Dive` shockwave and `Wyrmflame Breath` cone strictly filter targets by faction to avoid friendly fire.
