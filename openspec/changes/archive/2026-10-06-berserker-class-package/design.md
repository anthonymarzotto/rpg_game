# Design: Tier 3 Berserker Class Package

## Context

The system supports Tier 1 and Tier 2 class packages and recently established the first Tier 3 hybrid package with the Cavalier (`src/data/packages/cavalier.ts`). The Berserker represents the primal `(2 Fighter, 0 Rogue, 1 Mage)` hybrid, requiring integration with:
* The declarative `Ability` and `ClassPackage` contracts in `src/core/types/`.
* The ephemeral `AbilityModifier` pipeline (`src/core/combat/modifiers.ts`) and attack roll resolution (`src/core/combat/attackRoll.ts`).
* Pluggable combat effect handlers in `src/core/combat/effects/`.
* Passive trait resolution in `src/core/combat/damageEngine.ts`.
* AI tactical profile routing and heuristics in `src/core/ai/`.

## Goals / Non-Goals

**Goals:**
* Implement the complete `BERSERKER_PACKAGE` with `Blood Frenzy`, `Reckless Cleave`, `Ignite Rage`, and `Deathbound Fury`.
* Support self-inflicted HP sacrifice on ability execution with suicide prevention validation.
* Implement full-arc frontal collateral sweep damage hitting up to 2 adjacent enemy hexes.
* Support low-health threshold scaling for passive traits when HP $\le 50\%$.
* Register the package in the global catalogs and token asset systems.

**Non-Goals:**
* Introducing new status condition types (reuses battle-tested `BURN`).
* Refactoring unrelated classes or global combat resolution pipelines.
* Multi-hex boss hitboxes or 3D elevation mechanics (deferred to Phase 6 & 7).

## Decisions

### 1. Blood Frenzy Self-Damage & Primer Integration
* **Approach**: `Blood Frenzy` is defined with an atomic effect that deducts 3 HP from the actor and injects an `AbilityModifier` into `actorCu.abilityModifiers`:
  ```ts
  {
    id: 'blood_frenzy',
    name: 'Blood Frenzy',
    targetArchetypes: ['FIGHTER'],
    targetDamageTypes: ['PHYSICAL'],
    effectPatches: { diceStep: 1 },
    attackRollBonus: 2,
    consumesOnUse: true,
    expiresAtTurnEnd: true
  }
  ```
* **Resolution**: If `actorCu.currentHp <= 3`, the 3 HP cost is paid in full, dropping HP to 0 and defeating the unit (`actorCu.isDefeated = true`, removed from arena grid). The UI provides a lethal warning indicator (`⚠️ Lethal Cost`) when `currentHp <= hpCost`.
* **Alternatives Considered**: Advantage on attack rolls was rejected because beats-DC-by-10 critical hit rules made Advantage overly swingy. Clamping HP at 1 was rejected because it produced "free" empowerment when low on health and broke mortality consequences.

### 2. Reckless Cleave Arc Sweep via Parameterized `cleaveHandler`
* **Approach**: Extend the existing `cleaveHandler.ts` to honor `effect.magnitude` as the maximum number of secondary collateral targets (defaulting to 1 for backwards compatibility):
  * On a 2D hex grid, two adjacent units share **at most 2 mutual neighbors** forming the frontal arc.
  * **Warrior Cleave** uses `{ type: 'CLEAVE', magnitude: 1 }`: sorts frontal candidates by lowest HP and strikes top 1 target.
  * **Berserker Reckless Cleave** uses `{ type: 'CLEAVE', magnitude: 2 }`: strikes up to 2 frontal candidates (hitting both if occupied), resolving `rolled 2d4 + Force - Armor` as `SOLID_HIT` against each secondary target.
* **Drawback**: Appends a `STAT_MODIFIER` effect imposing `{ evasion: -2 }` on `SELF` for 1 turn.
* **Alternatives Considered**: 
  * 2d6 base damage was considered during exploration, but dropped to 2d4 base to avoid overshadowing Warrior's 2d6 `Power Strike` and prevent domain skill exploitation in wildcard slots.
  * A generalized `sweepHandler` with configurable arc directions was evaluated, but parameterizing `cleaveHandler` via `effect.magnitude` is simpler, requires no new effect types, and maintains 100% backwards compatibility with existing tests.

### 3. Ignite Rage Attribute and Defense Targeting
* **Approach**: `Ignite Rage` is tagged `MAGE`, targeting `RESOLVE`, using `focus` for attack roll and damage:
  * Damage: `1d6 + Focus` (Magical)
  * Secondary Condition: `BURN` (magnitude 2, duration 2 turns).
* **Rationale**: Follows the Cavalier precedent where the hybrid class's domain ability scales from its off-archetype attribute (Cavalier uses Finesse for Rogue strike; Berserker uses Focus for Mage flame). This creates a dual-threat profile, enabling Berserkers to crack heavy plate enemies with low Resolve.

### 4. Deathbound Fury Passive Threshold Architecture
* **Approach**: Extend `PassiveTrait` with support for health threshold conditions:
  ```ts
  export interface PassiveTrait {
    // ...
    readonly healthThreshold?: {
      readonly maxPercent: number; // e.g. 0.5 for <= 50% max HP
      readonly flatDamageBonus?: number; // e.g. 2
      readonly critThreshold?: number; // e.g. 19
    };
  }
  ```
* **Integration**: `resolveDamage` in `damageEngine.ts` and `getHitOutcome` in `attackRoll.ts` check if the actor has a passive with `healthThreshold` active. When `currentHp <= maxHp * 0.5`, +2 flat physical damage is applied and critical hits trigger on natural 19–20.
* **Rationale**: Keeps passive math declarative and decoupled from hardcoded class IDs.

### 5. AI Heuristics & Profile Routing
* **Profile**: Berserker maps to `BRAWLER`.
* **Heuristics**: Teach composite move-and-act evaluation in `src/core/ai/heuristics.ts` to value `Blood Frenzy` when remaining AP allows an immediate follow-up attack (`Reckless Cleave` or `Ignite Rage`) against an in-range cluster.

## Risks / Trade-offs

* **[Risk] High burst potential from stacking Frenzy + Deathbound Cleave** → *Mitigation*: Base dice clamped at 2d4, 3 HP self-cost drains survivability, and -2 Evasion leaves the Berserker vulnerable to counterattacks.
* **[Risk] AI suiciding on Blood Frenzy** → *Mitigation*: AI scoring heuristic (`heuristics.ts`) strictly zeroes out self-damage skills when low on health (`currentHp <= 5`), while player retains full tactical agency to make sacrificial plays.
