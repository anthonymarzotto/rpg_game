# Proposal

## Why

In 1v1 and edge-case combat scenarios, the Infiltrator AI can become trapped in an infinite loop where it repeatedly casts `Smoke Veil` on itself without taking offensive actions, because self-buff heuristics lacked a non-redundancy check for active conditions. Furthermore, stealthed units currently suffer from ambiguous spatial and targeting rules: units cannot be unmasked without ground-targeted AoE, taking damage does not break stealth, and turning or moving directly in front of an invisible enemy does not trigger detection.

Resolving these issues ensures that stealth is an active tactical advantage rather than an impenetrable stall mechanism, restores full player agency without artificial `oncePerTurn` restrictions, and introduces unified front-arc detection that unmasks hidden enemies both at turn start and dynamically during movement.

## What Changes

- **AI Stealth Loop Resolution**: In `scoreBuffAbility`, assign zero utility score to abilities granting `STEALTH` if the actor already has active `STEALTH`. Do NOT apply artificial `oncePerTurn` restrictions to `Smoke Veil`, preserving multi-action combos (e.g. Smoke Veil -> Toxic Shiv -> Smoke Veil).
- **Extensible `onTakeDamage` Condition Lifecycle**: Add an extensible `onTakeDamage` hook to `ConditionDefinition` in `conditions.ts`. When a unit suffers damage in `resolver.ts`, delegate to active conditions. For `STEALTH`, direct attack damage and `BURN` damage purge stealth immediately; ongoing `POISON` DoT ticks do not break stealth.
- **Unified Front-Arc Detection (Turn-Start & Movement Step)**:
  - When an active unit begins their combat turn, if an opposing stealthed unit is within range 1 in the active unit's `FRONT` combat arc (the 3 frontal hexes), the active unit spots them (`"[Active Unit] spotted [Enemy] in their direct field of view! Stealth broken!"`) and `STEALTH` is removed.
  - When an active unit executes movement along a planned path, the unit evaluates its 3-hex `FRONT` arc after each individual step. If an opposing stealthed unit is in those frontal hexes, movement halts immediately at the current tile, `STEALTH` is removed, and the move action concludes (1 AP spent).
  - The revealed unit preserves its current facing upon being detected (no auto-rotation), maintaining existing flank and rear vulnerabilities.
  - Ending a turn in an enemy's `REAR` or `FLANK` arc preserves stealth.

## Capabilities

### Modified Capabilities
- `combat-conditions`: Add `onTakeDamage` lifecycle hook to condition registry and define facing-aware proximity reveal behavior for `STEALTH`.
- `hybrid-ai-heuristics`: Prohibit the AI decision engine from scoring or executing stealth-granting abilities when the actor is already stealthed.
- `grid-elevation-traversal`: Implement dynamic front-arc detection during multi-step movement that interrupts movement and unmasks stealthed foes upon entering visual range.

## Impact

- **Core Combat (`src/core/combat`)**:
  - `conditions.ts`: Extensible `onTakeDamage` hook and `STEALTH` condition update.
  - `resolver.ts`: Trigger `onTakeDamage` during damage application; evaluate front-arc detection during step-by-step movement in `executeMove`.
  - `turnClock.ts`: Trigger front-arc detection on turn start in `advanceTurn`.
- **AI Engine (`src/core/ai`)**:
  - `heuristics.ts`: Guard `scoreBuffAbility` against redundant condition re-applications.
- **Tests**: Comprehensive unit tests for stealth AI scoring, damage-break triggers (Poison vs Burn vs direct attack), facing-aware turn-start detection, and dynamic step detection interrupting movement.
