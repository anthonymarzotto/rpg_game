# Technical Design: Tier 3 Warlock Class Package

## Context

See `proposal.md` for background and motivation. The combat engine currently supports atomic effect execution (`DAMAGE`, `KNOCKBACK`, `CONDITION`, `STAT_MODIFIER`), collision physics via `resolveCollisionDamage`, and lifecycle passive hooks (`ALWAYS`, `BATTLE_START`, `ON_MOVE`, `ON_CRIT`). 

In the combat damage engine (`damageEngine.ts`), incoming damage mitigation strictly separates damage types:
- **Physical Damage** is mitigated by **Armor**.
- **Magical Damage** is mitigated by **Ward**.

The Warlock (`1 Fighter, 0 Rogue, 2 Mage`) operates across all ranges: long range (`Eldritch Blast`, Range 3), mid-range (`Hellfire Brand`, Range 2), and close-quarters melee (`Pact Blade`, Range 1).

## Goals / Non-Goals

**Goals:**
- Author `src/data/packages/warlock.ts` containing `ELDRITCH_BLAST`, `PACT_BLADE`, `HELLFIRE_BRAND`, `SOUL_CARAPACE`, and `WARLOCK_PACKAGE`.
- Register Warlock abilities, passive, and package in `src/data/packages/index.ts`.
- Support an on-hit magical attack lifecycle trigger for passive traits (e.g. `ON_HIT` hook or trigger filter on hit) that executes `STAT_MODIFIER` (+1 Armor, +1 Ward for 1 turn).
- Map Warlock to the `SNIPER` AI profile in `src/core/ai/heuristics.ts`.
- Deliver full integration tests validating all abilities, collision scaling, passive triggering, and AI behavior.

**Non-Goals:**
- Introducing custom status conditions (uses standard `BURN`).
- Modifying other existing class packages or ability definitions.
- Introducing complex lifesteal or on-kill action reset loops.

## Decisions

### 1. Dual-Mitigation On-Hit Passive (`Soul Carapace`) over Ward-Only
- **Decision**: `Soul Carapace` grants both `+1 Armor` and `+1 Ward` for 1 turn upon scoring a solid hit or critical hit with a magical attack.
- **Rationale**: Because `damageEngine.ts` routes physical mitigation through Armor and magical mitigation through Ward, a Ward-only shield would provide zero protection against physical swords and axes when the Warlock closes into melee to strike with `Pact Blade`. Providing both buffs rewards aggressive spell-weaving and represents the hybrid synergy of 1 Fighter (physical armor) and 2 Mage (mystical ward).
- **Alternatives Considered**: 
  - *Ward-only shield*: Leaves massive physical vulnerability in melee.
  - *On-kill AP refund*: High feast-or-famine variance, dormant in 80%+ of turns in small skirmishes.
  - *Static flat stats*: Less dynamic than earning defense through successful spell strikes.

### 2. Multi-Range Tactical Engagement Profile (Range 1, 2, and 3)
- **Decision**: 
  - `Eldritch Blast`: 2 AP, Range 3, `1d8 + Focus` vs Resolve + `KNOCKBACK 1`.
  - `Pact Blade`: 1 AP, Range 1, `1d6 + Focus` vs Resolve.
  - `Hellfire Brand`: 1 AP, Range 2, `1d4 + Focus` vs Resolve + `BURN` (2 turns).
- **Rationale**: Provides fluid range transitions. When distant, the Warlock zones and knocks foes into obstacles; at mid-range, brands with burning damage; in close quarters, slices through heavy armor.
- **Alternatives Considered**: 
  - *All ranged (Range 3 only)*: Misses the martial battlemage identity provided by the 1 Fighter requirement.

### 3. AI Profile Resolution (`SNIPER`)
- **Decision**: Map `warlock` to `SNIPER`.
- **Rationale**: `SNIPER` weights preferred standoff range at 2 hexes with high standoff priority. This naturally positions the Warlock at optimal range for `Hellfire Brand` (Range 2) and `Eldritch Blast` (Range 3), while keeping `Pact Blade` ready when enemies close the gap to Range 1.

### 4. Passive Triggering Architecture (`ON_HIT`)
- **Decision**: Extend `PassiveTriggerHook` with `'ON_HIT'` in `src/core/types/passive.ts` (as planned in its docstrings) and trigger `triggerPassiveHook(state, actorCu, 'ON_HIT', context)` in `resolver.ts` when an attack scores a `SOLID_HIT` or `CRITICAL_HIT`.
- **Rationale**: Decouples passive logic from class IDs. Any passive trait can subscribe to `ON_HIT` with `triggerFilter: { damageType: 'MAGICAL' }` and execute generic effects via the effect registry (`modifierHandler`).

## Risks / Trade-offs

- **[Risk] Collision calculation compatibility** → `resolveCollisionDamage` already checks for `MAGE` archetype and uses the actor's Focus attribute. Verified working with `Eldritch Blast`.
- **[Risk] Stacking duration of Soul Carapace** → `modifierHandler` applies active modifiers with duration. If triggered multiple times in one turn (e.g. 2 attacks), the modifier duration refreshes or stacks safely within existing bounds.
