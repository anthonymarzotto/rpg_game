# Design: Stealth Mechanics and AI Loop

## Context

In our tactical combat engine, `STEALTH` is a core condition granted by abilities such as `Smoke Veil`. Previously:
1. `scoreBuffAbility` in `src/core/ai/heuristics.ts` checked active modifiers (`armor`, `ward`, `move`, etc.) to prevent redundant buffing, but completely lacked a check for active `CONDITION` effects. When an Infiltrator was out of melee reach, it repeatedly chose `Smoke Veil` on itself.
2. `ConditionDefinition` in `src/core/combat/conditions.ts` supported `onTurnStart`, `onOutgoingAttackRoll`, and `onAfterAction`, but had no lifecycle hook for handling incoming damage (`onTakeDamage`). Taking damage therefore never removed stealth.
3. Stealthed units had ambiguous detection rules during movement and turn progression, creating infinite stall loops when an isolated unit repeatedly stealthed and passed turn.

## Goals / Non-Goals

**Goals:**
- Prohibit AI from re-casting `Smoke Veil` or stealth abilities when already stealthed, while preserving player agency and high-AP combos (no artificial `oncePerTurn`).
- Provide an extensible `onTakeDamage` hook in `ConditionDefinition` so conditions react declaratively to damage.
- Purge `STEALTH` when suffering direct attack damage, AoE splash, or `BURN` fire damage, while preserving it through internal `POISON` DoT ticks.
- Implement unified **Front-Arc Detection** (`FRONT` combat arc at range 1):
  - At turn start (`advanceTurn`): An active unit spots any opposing stealthed unit in their 3 frontal hexes.
  - On each movement step (`executeMove`): An active unit evaluating their 3 frontal hexes spots an opposing stealthed unit, breaking stealth and halting movement immediately at the current tile.
- Preserve the stealthed unit's facing upon being revealed (no auto-turning toward the detector, preserving backstab/flank vulnerabilities).

**Non-Goals:**
- Adding a global cooldown or `oncePerTurn` restriction to `Smoke Veil`.
- Full tile-based fog-of-war for terrain (hiding tiles or non-stealthed units).
- Breaking stealth when moving during the Infiltrator's own turn.

## Decisions

### Decision 1: AI Heuristic Guard vs. `oncePerTurn` Restriction
- **Approach:** In `scoreBuffAbility`, evaluate whether the ability applies `CONDITION` of type `STEALTH`. If `targetCu.activeConditions.some(c => c.type === 'STEALTH')`, return `{ score: 0 }`.
- **Rationale:** Preserves valid player play patterns (e.g. Smoke Veil [1 AP] -> Toxic Shiv [1 AP, breaks stealth] -> Smoke Veil [1 AP with extra AP]). The AI only spammed Smoke Veil because it saw positive utility even when already stealthed.
- **Alternative Considered:** `oncePerTurn: true` on `Smoke Veil`. Rejected because it unnecessarily restricts player tactical options.

### Decision 2: Declarative `onTakeDamage` Hook in `ConditionDefinition`
- **Approach:** Add `onTakeDamage?: (condition: ActiveCondition, bearer: CombatUnit, context: DamageConditionContext, state?: CombatState) => { removeCondition?: boolean } | undefined` to `ConditionDefinition`.
- **Rationale:** Keeps condition logic encapsulated in `conditions.ts` rather than hardcoding `if (targetCu.hasCondition('STEALTH'))` in `resolver.ts`. This allows future conditions (e.g. `SLEEP`, `CHALLENGED` broken by 3rd-party attacks) to use the same pipeline.
- **Rules for Stealth:**
  - If `context.reason === 'POISON'`, return `undefined` (stealth preserved).
  - If `context.reason === 'FALL'`, return `undefined` (stealth preserved if plunging safely or taking fall impact).
  - Direct attack damage, splash damage, or `damageType === 'MAGICAL'` from `BURN` returns `{ removeCondition: true }`.

### Decision 3: Unified Front-Arc Detection (Turn-Start & Movement Step)
- **Approach:** Implement a reusable helper `evaluateFrontArcDetection(state: CombatState, detectorUnitId: string, detectorCoord: HexCoord, detectorFacing: HexDirection): string[]`.
  - Inspects all living opposing units at distance 1.
  - Evaluates `getCombatArc(detectorFacing, detectorCoord, targetCoord)`.
  - If `arc === 'FRONT'` (the 3 frontal hexes within the 120° forward cone: relative angles 0, 1, and 5):
    - Remove `STEALTH` from the target unit.
    - Log: `"⚠️ Spotted! [Active Unit] spotted [Stealthed Enemy] in their direct field of view! Stealth broken!"`.
    - **Do NOT rotate the stealthed enemy**: The revealed unit maintains their existing facing, preserving flank and rear vulnerabilities.
- **Execution at Turn Start (`turnClock.ts`):**
  - When `advanceTurn` selects `nextActive`, run front-arc detection. If an enemy ended their turn directly in `nextActive`'s front cone, they are revealed before `nextActive` takes action.
- **Execution during Movement (`resolver.ts`):**
  - In `executeMove`, after stepping into each hex along `pathInfo.path` and setting facing to the direction of travel, run `evaluateFrontArcDetection`.
  - If an opposing stealthed unit is detected in any of the 3 frontal hexes:
    - Halt movement immediately at the current step hex (do not continue along the remaining path).
    - Conclude the move action (1 AP deducted for the move).
    - The moving unit now stands at range 1 facing the revealed enemy, ready to use any remaining AP to attack!
- **Rationale:** By evaluating detection across the 3 frontal hexes on every step, we completely avoid complex physical collision rollback or double-occupancy bugs. Stepping into line-of-sight of a hidden enemy naturally stops movement and reveals them, giving every unit tactile, intuitive counterplay against stealth.

## Risks / Trade-offs

- **[Risk] Path stops early when detecting enemy:**
  - *Mitigation:* In `executeMove`, calculate fall damage and hexes moved only across the steps actually taken up to the interruption hex.
- **[Risk] AI pathfinding over-planning through stealthed units:**
  - *Mitigation:* The existing pathfinding treats occupied tiles as impassable. If an AI or player paths toward or past an invisible enemy, the front-arc detection halts them adjacent at range 1 as soon as they step into visual contact, allowing smooth follow-up attacks.
