# Design: Tier 2 Classes & Combat Conditions

## Context

Following the completion of Phase 3, the campaign loop and Camp progression enable units to accumulate archetype XP and unlock nodes in the 100-class lattice. However, the runtime engine only possesses class packages for Level 0 Novice and the three Tier 1 foundations (Warrior, Thief, Wizard). Reaching Level 2 in a pure archetype unlocks the node in the constellation, but no packages exist in `src/data/packages/` for Knight `#02`, Infiltrator `#82`, or Sorcerer `#98`.

Furthermore, current combat state is limited to flat numeric stat modifiers (`ActiveModifier` for armor, ward, speed, move, evasion, resolve). The engine lacks mechanisms for non-stat conditions (Poison, Burn, Challenged, Stealth), direct CTB initiative modifications, friendly AoE auras, or ephemeral metamagic spell modifiers.

See `proposal.md` for motivation and `specs/` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
* Author clean, distinct, balanced class packages for Knight `(2, 0, 0)`, Infiltrator `(0, 2, 0)`, and Sorcerer `(0, 0, 2)`.
* Implement the supporting combat engine infrastructure organically on demand without hardcoding class-specific exceptions.
* Maintain complete backward compatibility with existing Novice and Tier 1 combat abilities and tests.
* Ensure seamless integration with the Camp Hub, `HeroProgressionDrawer`, and loadout validation.

**Non-Goals:**
* Authoring Tier 3+ hybrid classes (e.g. Cavalier, Berserker, Witch) — deferred to subsequent phases.
* Off-node progression mechanics (e.g. `(1, 1, 0)`) — deferred to Phase 4.4.
* Dynamic elevation terrain modifications — deferred to Phase 4.3.
* Inventory, weapons, or gear itemization — deferred to future item systems.

## Decisions

### Decision 1: Dedicated `ActiveCondition` Model on `CombatUnit`
* **Approach**: Add `activeConditions: ActiveCondition[]` to `CombatUnit`. Each condition requires `type: ConditionType`, `durationTurns: number`, and a mandatory `sourceUnitId: string`.
* **Rationale**:
  * Mandatory `sourceUnitId` enables accurate combat logging, attribution for damage dealt by DoTs, and resolution of `CHALLENGED` (knowing which unit issued the challenge).
  * Keeping conditions distinct from `activeModifiers` avoids polluting numeric stat calculations in `effectiveVitals.ts`.
* **Alternatives Considered**:
  * *Overloading `ActiveModifier` with special string constants*: Rejected because DoTs and behavioral locks do not map to derived vitals with arithmetic summation.

### Decision 2: Instantaneous CTB Gauge Manipulation via `EFFECT_HANDLERS`
* **Approach**: Register `CTB_DELAY: ctbDelayHandler` in `EFFECT_HANDLERS`. The handler subtracts `magnitude` directly from `targetCu.initiativeGauge` (floored at 0).
* **Rationale**:
  * Follows the existing pluggable effect registry pattern established by `knockbackHandler` and `teleportHandler`.
  * Allows any future ability (e.g., Stun, Time Warp, Haste) to reuse CTB delay/boost mechanics uniformly.
* **Alternatives Considered**:
  * *Handling CTB delay inside `modifierHandler`*: Rejected because `modifierHandler` manages ongoing duration-based stat buffs/debuffs (`durationTurns`), whereas gauge adjustment is an instantaneous resource change like damage.

### Decision 3: Pre-Encounter Setup Pass for Battle Start Hooks
* **Approach**: Introduce a pre-encounter initialization hook in `encounter.ts` (evaluated before the first CTB clock tick) where units and scenarios seed initial conditions, modifiers, or gauge.
* **Rationale**:
  * Decouples the engine from hardcoding class checks like `if (unit.hasPassive('tactical_vanguard'))`.
  * Enables future scenario-specific modifiers (ambushes, blessings, terrain starting conditions) to be injected generically.
* **Alternatives Considered**:
  * *Hardcoded if-check in `initCombatUnit`*: Rejected as brittle and difficult to extend for scenario variations.

### Decision 4: Friendly Auras via `aoeRadius`
* **Approach**: In `resolver.ts`, support/buff abilities (`damageType: 'NONE'`) check `ability.aoeRadius`. When present on `targetType: 'SELF'` or `'ALLY'`, the engine queries `getHexesInRange` and applies the effects to all friendly units within the radius.
* **Rationale**:
  * Avoids enum bloat on `AbilityTargetType`.
  * Automatically unifies AoE geometry across damage and support abilities.
  * Allows `Spell Sculpt` + `Minor Ward` to expand into an AoE ward bubble using the exact same code path.
* **Alternatives Considered**:
  * *Adding a new `ALL_ALLIES_IN_RANGE` target type*: Rejected as redundant when `aoeRadius` already expresses the spatial extent.

### Decision 5: Generic `PendingAbilityModifier` on `CombatUnit`
* **Approach**: Add an ephemeral `pendingAbilityModifier?: PendingAbilityModifier` field to `CombatUnit` with properties `extraRange`, `extraAoeRadius`, `allowedArchetypes`, `consumesOnUse`, and `expiresAtTurnEnd`.
* **Rationale**:
  * Completely decouples `Spell Sculpt` from mutating immutable static `Ability` contracts.
  * Generically supports future metamagic, stances, and infused shots (e.g., Arcane Archer, Sharpshooter).
  * Automatically clears upon spell execution or at turn end in `turnClock.ts`, preventing lingering carry-overs.
* **Alternatives Considered**:
  * *Cloning and modifying the ability in memory*: Rejected as error-prone and leaky across multiple turns.

### Decision 6: Event-Driven Passive Trigger Registry
* **Approach**: In `resolver.ts`, when a critical hit occurs (`hitOutcome === 'CRITICAL_HIT'`), dispatch an event to registered passive handlers. `Wild Surge` registers a handler that evaluates a 1d3 roll and dispatches the corresponding outcome.
* **Rationale**:
  * Mirrors the pluggable effect registry pattern for event-driven passives.
  * Keeps `resolver.ts` lean and prevents gigantic switch-case statements.
* **Alternatives Considered**:
  * *Hardcoding a switch statement in `resolver.ts` for each passive ID*: Rejected as unmaintainable as class count grows.

### Decision 7: AI Profile & Metamagic Primer Integration
* **Approach**: Update `resolveAIProfile` in `src/core/ai/heuristics.ts` to map `infiltrator` to `SKIRMISHER`, `sorcerer` to `SNIPER`, and `knight` to `SUPPORT` (or `BRAWLER`). In `decisionEngine.ts`, add primer scoring so that if an AI unit has an unconsumed metamagic primer ability (`Spell Sculpt`) and sufficient AP (>= 2), it prioritizes activating the primer before firing a spell.
* **Rationale**:
  * Seamlessly future-proofs AI combatants when Tier 2 classes are assigned to enemies or custom encounters.
  * Avoids AI Sorcerers wasting AP on raw attacks without utilizing their core class fantasy.
* **Alternatives Considered**:
  * *Leaving AI updates out*: Rejected because adding a couple of profile checks and a simple primer rule takes negligible code and avoids AI regression when Tier 2 enemies spawn.

### Decision 8: Procedural Tier 2 Encounter Generation & Pixel Token Whitelist
* **Approach**: In `src/core/campaign/encounterGenerator.ts`, extend `assembleEnemySquad` to permit spawning Tier 2 enemies (`TIER2_CLASSES = ['knight', 'infiltrator', 'sorcerer']`) at Stage 3+ when remaining threat budget is >= 40 points (aligned with `threatBudget.ts` Level 2 threat rating: `10 + 2 * 15 = 40`). In `src/ui/combat/tokenAssets.ts`, add `'02_human_male'`, `'82_human_male'`, and `'98_human_male'` to `AVAILABLE_PIXEL_TOKENS`.
* **Rationale**:
  * Enemy squads naturally escalate in power as the expedition sector advances, testing player mastery against advanced Tier 2 mechanics.
  * Complete 8-direction pixel art sets already exist on disk in `public/assets/tokens/pixel/` for all three classes (`02`, `82`, `98`), allowing immediate visual rendering without fallback badges.
* **Alternatives Considered**:
  * *Restricting enemy encounters to Tier 1*: Rejected because Stage 3+ battles would become repetitive and under-budgeted against Level 2 player squads.

## Risks / Trade-offs

* **[Risk] DoT ticks causing combat defeat during turn handoff**
  * *Mitigation*: In `turnClock.ts`, evaluate defeat and check objectives immediately after DoT ticks resolve. If the active unit dies before taking actions, bypass AP allocation and proceed immediately to the next turn winner.
* **[Risk] Stealth locking out all hostile actions in 1v1 situations**
  * *Mitigation*: Single-target attacks are blocked, but AoE abilities (like `Arcane Blast`) target hexes and can still catch stealthed units in collateral splash damage.
* **[Risk] Challenged condition forcing invalid actions**
  * *Mitigation*: `Challenged` only applies Disadvantage when attacking other targets; it does not hard-lock target selection, preserving AI decision-making.

## Migration Plan

No database migrations or breaking schema changes required. All new types and fields on `CombatUnit` are additive with default fallbacks.
