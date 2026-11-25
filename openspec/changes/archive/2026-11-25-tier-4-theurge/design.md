# Design: Tier 4 Theurge (`#79`, `1F, 0R, 3M`)

## Context

See `proposal.md` for motivation and scope. The Theurge (`#79`, `1 Fighter, 0 Rogue, 3 Mage`) introduces three new gameplay capabilities:
1. **`HENOSIS` and `MORTAL_EBB` linked condition lifecycle**: A 2-turn single-vessel divine ascension buff (`+2 Attack Roll, +2 Armor, +2 Ward, +1 Move, +1 Speed`) with a strict 1-vessel-per-caster exclusivity rule that automatically transitions into a 1-turn recovery penalty (`MORTAL_EBB`: `-1 Attack Roll, -1 Armor, -1 Ward, -1 Move, -1 Speed`) upon expiration.
2. **`CLEANSE` atomic effect (`Absolution`)**: Purges all active negative status conditions (`POISON`, `BURN`, `EXPOSED`, `BLINDED`, `CHALLENGED`, `TELEMETRY`) from an allied unit or self while leaving non-purgeable conditions (`MORTAL_EBB`, `HENOSIS`, `STEALTH`, `CHARMED`) untouched, paired with a `+20` CTB initiative boost.
3. **`Theurgic Synergy` conduit-projected passive radiant pulse**: On a Solid Hit or Critical Hit with a `MAGICAL` ability (excluding Graze and Miss), emits a 1-hex ring of `1` unmitigated magical damage around the bearer's active living `HENOSIS` vessel, falling back to the bearer themselves if no active `HENOSIS` vessel exists.

To avoid hardcoding condition-specific or class-specific rules into `turnClock.ts`, `effectiveVitals.ts`, `validator.ts`, `cleanseHandler.ts`, or `resolver.ts`, all of these behaviors are modeled as **generic, declarative metadata on `ConditionDefinition` and `PassiveTrait`**.

## Goals / Non-Goals

**Goals:**
- Extend `ConditionDefinition` (`src/core/combat/conditions.ts`) with generic declarative lifecycle and constraint metadata so future conditions (tethers, marks, stances, multi-stage buffs/curses) can reuse the exact same engine hooks without one-off `if (c.type === ...)` branches:
  - `tickTiming?: 'TURN_START' | 'TURN_END' | 'NEVER'`
  - `statModifiers?: Partial<Record<ModifiableCombatStat, number>>`
  - `purgeableByCleanse?: boolean`
  - `maxActivePerSource?: number`
  - `blockedByTargetConditions?: readonly ConditionType[]`
  - `onExpireApplyCondition?: { readonly type: ConditionType; readonly durationTurns: number }`
  - `onRemoved?: (condition: ActiveCondition, bearer: CombatUnit, state?: CombatState) => void`
- Refactor `turnClock.ts` (`advanceTurnClock` and `endActiveTurn`) to drive condition duration ticking, expiration chaining (`onExpireApplyCondition`), and removal callbacks (`onRemoved`) entirely through `ConditionDefinition` metadata—eliminating even the existing hardcoded `'STEALTH'`, `'CHARMED'`, and `'BLINDED'` checks in `turnClock.ts`.
- Extend `PassiveTrait` (`src/core/types/passive.ts`) with declarative `triggerFilter.requireSolidHitOrCrit?: boolean` and `conduitPulse?: PassiveConduitPulseEffect` so `resolver.ts` resolves conduit-projected AoE pulses generically without hardcoding `'theurgic_synergy'` or `'HENOSIS'`.

**Non-Goals:**
- Direct HP healing abilities (reserved for higher-tier Cleric `#47` and Acolyte `#63` kits).
- Channel-shifting `HENOSIS` onto a new target while a vessel is already active (intentionally excluded in favor of strict `maxActivePerSource: 1` lockout).

## Decisions

### 1. Declarative `ConditionDefinition` Metadata & Stat Modifiers
- **Choice**: Add `statModifiers?: Partial<Record<ModifiableCombatStat, number>>` directly to `ConditionDefinition` in `src/core/combat/conditions.ts`.
- **How it works**:
  - `HENOSIS` declares `statModifiers: { attackRoll: 2, armor: 2, ward: 2, move: 1, speed: 1 }` and `onOutgoingAttackRoll: () => ({ attackRollBonus: 2, description: 'Henosis (+2)' })`.
  - `MORTAL_EBB` declares `statModifiers: { attackRoll: -1, armor: -1, ward: -1, move: -1, speed: -1 }` and `onOutgoingAttackRoll: () => ({ attackRollPenalty: 1, description: 'Mortal Ebb (-1)' })`.
  - In `getEffectiveStat` (`src/core/combat/effectiveVitals.ts`), a helper `getConditionStatModifier(cu.activeConditions, stat)` sums `getConditionDefinition(c.type)?.statModifiers?.[stat] ?? 0` across all active conditions on `cu`.
  - Standard floors (`Math.max(1, total)` for `move` and `speed`; `Math.max(0, total)` for `armor` and `ward`) apply automatically.
- **Rationale**: Zero condition names are referenced in `effectiveVitals.ts`, and any future condition that modifies derived stats works purely by declaring `statModifiers` in `CONDITION_REGISTRY`. Because the stat deltas live on the condition definition itself, there is no risk of `activeModifiers` (turn-start tick) and `activeConditions` (turn-end tick) falling out of sync.

### 2. Generic Condition Tick Timing & Expiration Chaining (`tickTiming`, `onExpireApplyCondition`, `onRemoved`)
- **Choice**: Replace hardcoded condition-type checks in `advanceTurnClock` and `endActiveTurn` (`src/core/combat/turnClock.ts`) with a generic condition tick processor driven by `ConditionDefinition`.
- **How it works**:
  - Each `ConditionDefinition` specifies `tickTiming`:
    - `'TURN_START'` (default when omitted): Used by `POISON`, `BURN`, `CHALLENGED`, `EXPOSED`, `TELEMETRY`.
    - `'TURN_END'`: Used by `CHARMED`, `BLINDED`, `HENOSIS`, `MORTAL_EBB`.
    - `'NEVER'`: Used by `STEALTH` (which persists until broken by action/damage/detection).
  - When ticking conditions for a timing phase (`'TURN_START'` or `'TURN_END'`):
    - Snapshot the conditions currently matching that `tickTiming` and decrement their `durationTurns` by `1`.
    - For each condition whose `durationTurns` reaches `<= 0`:
      - Remove it from `cu.activeConditions`.
      - Invoke `def.onRemoved?.(cond, cu, state)` (e.g., `CHARMED` restores original faction via `onRemoved`, removing the bespoke `hadCharmed` check from `turnClock.ts`).
      - If `def.onExpireApplyCondition` is defined (e.g., `HENOSIS` declares `onExpireApplyCondition: { type: 'MORTAL_EBB', durationTurns: 1 }`), apply that follow-up condition to `cu` with `sourceUnitId: cond.sourceUnitId`. Because the newly spawned condition was not in the pre-tick snapshot, it is not decremented during the same turn-end pass.
- **Rationale**: Completely generic lifecycle engine. Future multi-stage conditions (e.g., an Incubation curse that blooms into Plague, or Overcharge that expires into Stun) require only a 1-line `onExpireApplyCondition` declaration in `CONDITION_REGISTRY`.

### 3. Generic Active-Source Limit (`maxActivePerSource`) & Target Condition Exclusions (`blockedByTargetConditions`)
- **Choice**: Add `maxActivePerSource?: number` and `blockedByTargetConditions?: readonly ConditionType[]` to `ConditionDefinition`, and enforce them generically in `validator.ts` (`canExecuteAbility` and `getAbilityRangeCoords`).
- **Mechanics**:
  - In `CONDITION_REGISTRY`:
    - `HENOSIS` declares `maxActivePerSource: 1` and `blockedByTargetConditions: ['MORTAL_EBB']`.
  - In `canExecuteAbility` (`src/core/combat/validator.ts`):
    - For every `CONDITION` effect on `effectiveAbility` with `effect.conditionType`:
      - Look up `const condDef = getConditionDefinition(effect.conditionType)`.
      - **Source Exclusivity Check (`condDef?.maxActivePerSource`)**: Count living units on the arena (`!u.isDefeated && u.currentHp > 0`) that currently have an active condition of `effect.conditionType` with `c.sourceUnitId === actorUnitId`. If `activeCount >= condDef.maxActivePerSource`, return `{ valid: false, reason: `Maximum active ${effect.conditionType} limit (${condDef.maxActivePerSource}) reached.` }` (with a human-readable condition label). If the bearer dies, `!u.isDefeated && u.currentHp > 0` is false, automatically freeing the cap.
      - **Target Condition Block Check (`condDef?.blockedByTargetConditions`)**: When `targetCu` is known, check if `targetCu.activeConditions` contains any condition listed in `condDef.blockedByTargetConditions`. If a match `blockingType` is found, return `{ valid: false, reason: `Cannot apply ${effect.conditionType} while target is afflicted with ${blockingType}.` }`.
  - In `getAbilityRangeCoords` (`validator.ts`), if any condition effect on `effectiveAbility` violates `maxActivePerSource` for `cu`, return `[]` so the UI does not highlight targetable hexes while locked out.

### 4. Generic `CLEANSE` Atomic Effect Driven by `purgeableByCleanse`
- **Choice**: Add `purgeableByCleanse?: boolean` to `ConditionDefinition` and implement `src/core/combat/effects/cleanseHandler.ts`.
- **Mechanics**:
  - `POISON`, `BURN`, `EXPOSED`, `BLINDED`, `CHALLENGED`, and `TELEMETRY` declare `purgeableByCleanse: true` in `CONDITION_REGISTRY`.
  - `HENOSIS`, `MORTAL_EBB`, `STEALTH`, and `CHARMED` omit `purgeableByCleanse` (or set `false`).
  - `cleanseHandler` inspects `targetCu.activeConditions`, removes all entries where `getConditionDefinition(c.type)?.purgeableByCleanse === true`, invokes their `onRemoved` hook if any, and emits a structured `CONTEXT` outcome (and floating text `'CLEANSED!'` when 1+ conditions are purged) listing the removed condition names.

### 5. Declarative `conduitPulse` & `requireSolidHitOrCrit` on `PassiveTrait` (`Theurgic Synergy`)
- **Choice**: Extend `PassiveTrait` (`src/core/types/passive.ts`) with:
  - `triggerFilter?: { readonly damageType?: DamageType; readonly requireSolidHitOrCrit?: boolean }`
  - `conduitPulse?: { readonly linkedCondition: ConditionType; readonly fallbackToSelf: boolean; readonly radius: number; readonly damage: number; readonly damageType: 'PHYSICAL' | 'MAGICAL'; readonly label: string }`
- **Mechanics**:
  - In `resolver.ts` (`triggerPassiveHook`):
    - When `passive.triggerFilter?.requireSolidHitOrCrit` is true, skip the passive unless `context?.hitOutcome === 'SOLID_HIT' || context?.hitOutcome === 'CRITICAL_HIT'`. (This keeps existing `ON_HIT` passives backward-compatible while allowing `Theurgic Synergy` and future passives to exclude `GRAZE`).
    - When `passive.conduitPulse` is present:
      - Search `state.units.values()` for a living unit (`!u.isDefeated && u.currentHp > 0`) that has an active condition of `passive.conduitPulse.linkedCondition` with `c.sourceUnitId === cu.unit.id`.
      - If no such unit is found on the arena, use `cu` (when `fallbackToSelf: true`).
      - From the resolved conduit unit's position, find all living opposing units within `hexDistance(conduitPos, enemyPos) <= passive.conduitPulse.radius` (excluding distance 0) and emit `DAMAGE` events (`amount: passive.conduitPulse.damage`, `damageType: passive.conduitPulse.damageType`, `reason: 'PASSIVE'`, `label: passive.conduitPulse.label`, `sourceUnitId: cu.unit.id`) plus a `combatLogger.logPassive` entry.

## Risks / Trade-offs

- **[Risk] Passive pulse defeating an adjacent enemy mid-resolution** -> Because `triggerPassiveHook` appends `DAMAGE` events to the primary attack's `events` array right before `applyCombatEvents(state, events, { claimed: true })` in `resolver.ts`, `applyCombatEvents` already handles HP deduction, defeat marking, arena unit removal, and `combatLogger.logDefeat` for every `DAMAGE` event in `events` uniformly.
- **[Risk] AI over-casting `Absolution` when no conditions are present and CTB boost is low value** -> In `decisionEngine.ts`, score `CLEANSE` effects dynamically based on the number and severity of `purgeableByCleanse` conditions currently on `targetCu`, combined with the existing `INITIATIVE_BOOST` tempo valuation.
