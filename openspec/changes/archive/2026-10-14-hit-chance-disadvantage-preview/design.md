# Design

## Context

Target hit-chance calculations are currently duplicated and inconsistent across `src/core/combat/attackRoll.ts` (resolution) and `src/core/combat/targetPreview.ts` (UI display and AI decision heuristics). `targetPreview.ts` relies on a simplified linear calculation `(21 - neededRoll) / 20 * 100` that ignores Disadvantage, the Knight's `CHALLENGED` condition, low-ground elevation disadvantage, aura defenses, and active stat roll modifiers.

See [proposal.md](file:///c:/Repos/rpg_game/openspec/changes/hit-chance-disadvantage-preview/proposal.md) for the problem statement and motivation.

## Goals / Non-Goals

**Goals:**
- Provide a single pure evaluator `evaluateAttackRollContext` in `attackRoll.ts` that determines net roll modifiers, target defense, advantage/disadvantage state, and mathematical hit probability.
- Implement closed-form probability modeling for single-die ($p$), Advantage ($1 - (1-p)^2$), and Disadvantage ($p^2$), clamped to standard d20 limits ($[5\%, 95\%]$).
- Support spatial lookahead via optional `originCoord` and `targetCoord` to evaluate hypothetical moves in AI planning and UI hover states without state mutation.
- Implement a declarative `ConditionDefinition` registry in `src/core/combat/conditions.ts` with typed roll hooks (`onOutgoingAttackRoll`, `onIncomingAttackRoll`).
- Extend `AbilityEffect` with optional `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty`.
- Expose `rollAdvantage` on `TargetPreview` and render `(Adv)` / `(Disadv)` badge pills in `UnitStatusCard.tsx`.

**Non-Goals:**
- Overhauling non-attack condition effects (tick damage, movement restrictions, turn start/end triggers) into full ECS systems; the registry cleanly targets attack roll interactions.
- Implementing unrequested conditions (`BLIND`, `PRONE`, `FLYING`, `CONFUSED`) in this change; the registry establishes the architecture so future additions require no changes to roll evaluation.
- Modifying critical hit roll mechanics or Graze band calculations ($[\text{targetDefense} - 5, \text{targetDefense} - 1]$).
- Adding roll modifiers to the outer `Ability` envelope; all accuracy modifiers reside strictly on `AbilityEffect`.

## Decisions

### Decision 1: Pure Function (`evaluateAttackRollContext`) vs Class Instance

**Choice**: Pure function returning an immutable `AttackRollContext` data structure.

```typescript
export interface AttackRollContext {
  readonly actor: CombatUnit;
  readonly target: CombatUnit;
  readonly netModifier: number;
  readonly targetDefense: number;
  readonly defenseType: DefenseType;
  readonly advantageSources: readonly string[];
  readonly disadvantageSources: readonly string[];
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
  readonly finalAdvantage: 'ADVANTAGE' | 'DISADVANTAGE' | 'NORMAL';
  readonly neededRoll: number;
  readonly hitProbability: number; // 0.05 to 0.95
}
```

**Rationale**:
- Fits the functional, immutable paradigm used across `rpg_game` (Redux slices, pure preview helpers).
- Both `resolveAttackRoll` and `computeAbilityMetrics` can call the exact same function, guaranteeing 0% calculation drift between UI preview, AI heuristics, and combat resolution.

**Alternatives Considered**:
- Class-based evaluation context: Added allocation overhead, does not serialize cleanly across state boundaries.
- Separate calculation functions in each module: Already proven to cause drift and bugs.

### Decision 2: Declarative Condition Registry (`CONDITION_REGISTRY`)

**Choice**: Registry pattern mapping `ConditionType` to a `ConditionDefinition` containing optional roll lifecycle hooks.

```typescript
export interface ConditionAttackRollModifier {
  readonly advantage?: boolean;
  readonly disadvantage?: boolean;
  readonly attackRollBonus?: number;
  readonly attackRollPenalty?: number;
}

export interface ConditionDefinition {
  readonly type: ConditionType;
  readonly onOutgoingAttackRoll?: (
    condition: ActiveCondition,
    actor: CombatUnit,
    target: CombatUnit,
    state: CombatState
  ) => ConditionAttackRollModifier | undefined;
  readonly onIncomingAttackRoll?: (
    condition: ActiveCondition,
    attacker: CombatUnit,
    target: CombatUnit,
    state: CombatState
  ) => ConditionAttackRollModifier | undefined;
}
```

**Rationale**:
- Decouples condition semantics from roll evaluation. `evaluateAttackRollContext` queries the registry for each active condition on the attacker (outgoing) and target (incoming), instead of hardcoding `if (c.type === 'CHALLENGED')` or `if (c.type === 'STEALTH')`.
- `CHALLENGED` simply defines `onOutgoingAttackRoll`: if `target.id !== condition.sourceUnitId`, return `{ disadvantage: true }`.
- `STEALTH` defines `onOutgoingAttackRoll`: return `{ advantage: true }`.

**Alternatives Considered**:
- Hardcoded string checks in `evaluateAttackRollContext`: Creates tight coupling and requires modifying core combat logic for every new condition added.
- Full OOP Status Effect hierarchy: Overkill for the current state-slice architecture.

### Decision 3: Roll Properties on `AbilityEffect` Exclusively

**Choice**: Add `grantsDisadvantage?: boolean`, `attackRollBonus?: number`, and `attackRollPenalty?: number` exclusively to `AbilityEffect` in `src/core/types/ability.ts`.

**Rationale**:
- `Ability` acts as the execution envelope and targeting contract, whereas `AbilityEffect` defines what happens and how it executes.
- If an ability contains multiple effects (e.g. an attack effect and an unconditional self-buff), the accuracy profile belongs to the effect that requires the attack roll.

**Alternatives Considered**:
- Duplicating properties on both `Ability` and `AbilityEffect`: Leads to ambiguity regarding precedence and conflicts.
- Placing properties only on `Ability`: Prevents composite abilities from having distinct accuracy behaviors per effect.

### Decision 4: Closed-Form Quadratic Probability Modeling

**Choice**: Calculate hit probability via closed-form quadratic equations:
- $neededRoll = \text{clamp}(targetDefense - netModifier, 1, 20)$
- $p = \text{clamp}\left(\frac{21 - neededRoll}{20}, 0.05, 0.95\right)$
- Under `ADVANTAGE`: $p_{final} = 1 - (1 - p)^2$
- Under `DISADVANTAGE`: $p_{final} = p^2$
- Under `NORMAL` (or both): $p_{final} = p$

**Rationale**:
- Mathematically exact for rolling two independent d20 dice and taking either the maximum (Advantage) or minimum (Disadvantage).
- Fast $O(1)$ computation with zero memory allocations, ideal for evaluating hundreds of tiles during AI move-and-act simulations and UI path hover.

**Alternatives Considered**:
- Precomputed 20x20 lookup matrix: Unnecessary memory overhead for a simple algebraic identity.
- Monte Carlo simulation: Non-deterministic and prohibitively slow for real-time preview.

## Risks / Trade-offs

- `[Risk]` AI heuristics may deprioritize attacks that it previously favored due to overly optimistic hit rates.
  $\to$ **Mitigation**: This is the intended tactical outcome. An AI unit with `CHALLENGED` targeting someone other than the Knight will now correctly perceive the disadvantage penalty and prioritize the challenger or use non-attack abilities.
- `[Risk]` Abilities with multiple effects could have ambiguity over which effect drives the attack roll preview.
  $\to$ **Mitigation**: `evaluateAttackRollContext` accepts an optional `AbilityEffect` argument. If omitted, it defaults to the first attack effect (`DAMAGE` or `HEAL` requiring a roll) in `ability.effects`.
- `[Risk]` Visual clutter on unit status preview cards when displaying advantage badges.
  $\to$ **Mitigation**: Use compact, low-profile pill indicators (`(Adv)` in emerald, `(Disadv)` in amber) placed immediately adjacent to the hit percentage number.

## Migration Plan

1. **Phase 1**: Add properties to `AbilityEffect` in `src/core/types/ability.ts`.
2. **Phase 2**: Create `src/core/combat/conditions.ts` with `CONDITION_REGISTRY` registering `CHALLENGED` and `STEALTH`.
3. **Phase 3**: Implement `evaluateAttackRollContext` and refactor `resolveAttackRoll` in `src/core/combat/attackRoll.ts`.
4. **Phase 4**: Update `computeAbilityMetrics` and `TargetPreview` in `src/core/combat/targetPreview.ts`.
5. **Phase 5**: Update `UnitStatusCard.tsx` to render the advantage badges.
6. **Phase 6**: Update and expand tests in `src/core/combat/targetPreview.test.ts`.
