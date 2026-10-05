# Proposal

## Why

With Phase 3 complete, players have a fully functioning campaign loop, persistent save slots, and a Camp Hub where heroes can spend archetype XP to advance into the Constellation Pyramid. However, combat variety remains restricted to Level 0 Novice cantrips and the three basic Tier 1 classes (Warrior, Thief, Wizard). When heroes reach Level 2 in a pure archetype, their constellation node is unlocked, but no Tier 2 class packages, signature abilities, or new mechanics currently exist to equip.

This change introduces the three pure Tier 2 classes (**Knight**, **Infiltrator**, **Sorcerer**) and, following the architectural principle of *introducing systems on demand*, establishes the combat engine capabilities required to support their kits (status conditions, CTB initiative manipulation, friendly aoeRadius auras, pending ability modifiers, and on-crit triggers).

## What Changes

* **Tier 2 Class Packages**:
  * **Knight** `(2, 0, 0)`: Leader & Controller.
    * Signature: `Lead the Charge` (2 AP, 3-hex aura, grants +2 Move and +2 Speed for 2 turns to Knight and all allies within range).
    * Domain 1: `Challenging Shout` (1 AP, range 3, forces target to face the Knight and inflicts Challenged: Disadvantage on attacks against other targets).
    * Domain 2: `Pommel Strike` (1 AP, melee 1d4+Force, delays target CTB gauge by -20).
    * Passive: `Tactical Vanguard` (seeds +25 starting CTB initiative in pre-encounter setup).
  * **Infiltrator** `(0, 2, 0)`: Shadow Stalker & Saboteur.
    * Signature: `Expose Weakness` (1 AP, range 3, applies -2 Armor and -2 Evasion to target for 2 turns).
    * Domain 1: `Smoke Veil` (1 AP, self-stealth for 1 turn, untargetable by single-target attacks, breaking stealth grants Advantage).
    * Domain 2: `Toxic Shiv` (1 AP, melee 1d4+Finesse, applies Poison dealing 2 unmitigated damage on CTB turn start for 2 turns).
    * Passive: `Elusive Stride` (spending AP to Move grants +2 Evasion until the start of the next turn).
  * **Sorcerer** `(0, 0, 2)`: Metamagic Sculptor & Wild Magic.
    * Signature: `Spell Sculpt` (1 AP, once per turn, primes next Mage spell to gain +1 Range and +1 AoE splash radius; expires at turn end).
    * Domain 1: `Ignite` (1 AP, range 3, 1d4+Focus magical fire damage, applies Burn dealing 2 unmitigated fire damage on turn start for 2 turns).
    * Domain 2: `Gust` (1 AP, range 3, pushes target 1 hex directly away from caster).
    * Passive: `Wild Surge` (scoring a spell Critical Hit rolls 1d3 to trigger Mana Surge +1 AP, Chrono Flux +25 CTB, or Arcane Cascade 2 magic damage shockwave).

* **Combat Engine Infrastructure (On Demand)**:
  * **Status Condition Pipeline (`ActiveCondition`)**:
    * Adds `activeConditions: ActiveCondition[]` to `CombatUnit` with mandatory `sourceUnitId`.
    * Implements `POISON` and `BURN` (turn-start DoT ticks in `turnClock.ts`).
    * Implements `CHALLENGED` (Disadvantage on non-challenger targets in `attackRoll.ts`).
    * Implements `STEALTH` (single-target targeting rejection in `validator.ts`, Advantage on break in `attackRoll.ts`).
  * **CTB Gauge Manipulation**:
    * Registers `CTB_DELAY` effect handler to deduct initiative gauge.
    * Implements pre-encounter setup pass in `encounter.ts` to allow passives (`Tactical Vanguard`) and scenarios to seed starting initiative or conditions.
  * **Friendly Aura Resolution**:
    * Support and buff abilities in `resolver.ts` evaluate `aoeRadius` on `targetType: 'SELF'` or `'ALLY'`, dispatching effects to all allies within radius.
  * **Generic Pending Ability Modifiers**:
    * Adds `pendingAbilityModifier` to `CombatUnit` with `consumesOnUse` and `expiresAtTurnEnd`, enabling `Spell Sculpt` and future spell/attack primers without mutating static ability contracts.
  * **On-Crit Event Trigger & Handlers**:
    * `resolver.ts` dispatches `ON_CRITICAL_HIT` events to modular passive handlers, allowing `Wild Surge` to execute cleanly.
  * **AI Profile & Tactical Integration**:
    * Updates `src/core/ai/heuristics.ts` to map `infiltrator` to `SKIRMISHER`, `sorcerer` to `SNIPER`, and `knight` to `SUPPORT` in `resolveAIProfile`.
    * Implements primer scoring in `decisionEngine.ts` allowing AI Sorcerers with >= 2 AP to sculpt spells before attacking.
  * **Procedural Encounters & Token Whitelist**:
    * Updates `src/core/campaign/encounterGenerator.ts` to allow Stage 3+ encounters to spawn Tier 2 enemies (`Knight`, `Infiltrator`, `Sorcerer`) at 40 threat cost.
    * Updates `src/ui/combat/tokenAssets.ts` to whitelist `02_human_male` (Knight), `82_human_male` (Infiltrator), and `98_human_male` (Sorcerer) for 8-direction pixel art rendering on the hex arena.

## Capabilities

### New Capabilities
- `tier-2-classes`: Authored class packages for Knight `(2, 0, 0)`, Infiltrator `(0, 2, 0)`, and Sorcerer `(0, 0, 2)`, their abilities, passives, pixel token assets, procedural encounter generation, and integration into the global packages registry.
- `combat-conditions`: Combat engine support for active conditions (Poison, Burn, Challenged, Stealth), CTB gauge modification, friendly auras, pending ability modifiers, on-crit trigger handling, and AI tactical profile mapping.

### Modified Capabilities
*(None. Existing capabilities such as `hero-progression-drawer` and `campaign-progression` already support unlocking classes and equipping wildcards generically).*

## Impact

- **Affected Code**:
  - `src/data/packages/`: New files `knight.ts`, `infiltrator.ts`, `sorcerer.ts`, exported through `index.ts`.
  - `src/core/types/`: Updates to `ability.ts` (new effect types), `passive.ts`, `combat/types.ts` (`ActiveCondition`, `PendingAbilityModifier`).
  - `src/core/combat/`: Updates to `resolver.ts`, `turnClock.ts`, `attackRoll.ts`, `validator.ts`, `encounter.ts`, and `effects/` (`registry.ts`, `ctbDelayHandler.ts`, `conditionHandler.ts`).
  - `src/core/ai/`: Updates to `heuristics.ts` and `decisionEngine.ts` for Tier 2 profile mapping and Spell Sculpt priming.
  - `src/core/campaign/`: Updates to `encounterGenerator.ts` for Tier 2 enemy squad assembly.
  - `src/ui/combat/`: Updates to `tokenAssets.ts` whitelisting `02_human_male`, `82_human_male`, and `98_human_male`.
- **Dependencies**: No external npm dependencies added; leverages existing `vitest` suite for test coverage.
- **Breaking Changes**: None. All new types and modifiers are additive and backward-compatible with Novice and Tier 1 classes.
