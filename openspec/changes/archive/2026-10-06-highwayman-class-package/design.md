# Design

## Context

Phase 5 of the development roadmap (`DEVELOPMENT_PLAN_2026_10_04.md`) establishes individual class packages for all six Tier 3 dual-archetype hybrid classes in the 100-class lattice. Following Cavalier (`2 Fighter, 1 Rogue, 0 Mage`) and Berserker (`2 Fighter, 0 Rogue, 1 Mage`), the Highwayman (`1 Fighter, 2 Rogue, 0 Mage`, Class #64) is the dominant-Rogue hybrid vanguard.

The combat engine already provides robust atomic effects (`DAMAGE`, `KNOCKBACK`, `RETREAT_STEP`, `CTB_DELAY`, `STAT_MODIFIER`) and a 3-AP action economy with CTB initiative scheduling. See `proposal.md` for the thematic motivation behind the debonair gentleman ambusher fantasy.

## Goals / Non-Goals

**Goals:**
- Author `HIGHWAYMAN_PACKAGE` in `src/data/packages/highwayman.ts` adhering to the `ClassPackage` contract with signature ability `Point-Blank Buckshot`, domain pool abilities `Stand and Deliver!` and `Gallant Flourish`, innate passive `Highway Toll`, and AI profile `SKIRMISHER`.
- Decouple anti-armor passive damage scaling via a generic `targetArmorBonus` configuration on `PassiveTrait` evaluated in `src/core/combat/damageEngine.ts`.
- Ensure cohesive action economy synergy where `Point-Blank Buckshot` (2 AP, range 1–2), `Stand and Deliver!` (1 AP, range 1–2), and `Gallant Flourish` (1 AP, range 1) can be fluidly combined within a 3-AP turn.
- Register the package in `src/data/packages/index.ts` and enable wildcard progression in `src/core/progression/harmonization.ts`.

**Non-Goals:**
- Introducing new status condition types (leverages existing `ActiveModifier` stat modifications and `CTB_DELAY` rather than adding redundant conditions).
- Modifying core CTB turn clock math or action validation rules outside passive target armor checks.
- Overhauling AI profiles (reuses battle-tested `SKIRMISHER` profile).

## Decisions

### Decision 1: Single-Direction Knockback Without Self-Recoil for Buckshot
- **Choice**: `Point-Blank Buckshot` inflicts `KNOCKBACK 1` on the target with range 1–2, without applying `RETREAT_STEP` to the Highwayman.
- **Rationale**: Combining a forward knockback and backward recoil step creates 3 hexes of separation, putting the target out of range of Range-2 abilities and forcing the player to spend 1 AP on movement every turn. By displacing the enemy only, the target ends up at distance 2—the exact operational range for `Stand and Deliver!`.
- **Alternatives Considered**: 
  - *Knockback + Recoil*: Felt thematic on paper, but produced an unplayable "pinball" loop in tactical grid play.
  - *Melee Range 1 Only*: Overly restrictive, forcing constant repositioning. Range 1–2 provides tactical flexibility for a sawed-off firearm.

### Decision 2: Automatic Hold-Up Delivery for Stand and Deliver!
- **Choice**: `Stand and Deliver!` uses `damageType: 'NONE'` and `defenseTarget: 'NONE'`, executing as an automatic utility debuff (30 CTB delay + -2 Armor for 2 turns).
- **Rationale**: Aligns directly with established utility abilities such as `Expose Weakness` (Infiltrator) and `Flamboyant Flourish` (Cavalier). Avoids creating non-damaging d20 contest rolls or tacking on chip damage solely to force an attack roll.
- **Alternatives Considered**:
  - *Attack Roll vs Resolve with Chip Damage*: Adding 1d4 damage changes the identity from a psychological hold-up into a standard attack.
  - *Engine Non-Damaging Attack Roll Extension*: Deferred for future system-wide utility contest overhaul.

### Decision 3: Decoupled `targetArmorBonus` on PassiveTrait
- **Choice**: Add an optional `targetArmorBonus?: { minArmor: number; flatDamageBonus: number }` to `PassiveTrait` in `src/core/types/passive.ts`, and evaluate target effective armor in `resolveDamage()` (`src/core/combat/damageEngine.ts`).
- **Rationale**: Avoids hardcoding passive IDs (e.g. `p.id === 'highway_toll'`) into core damage resolution. Matches the precedent set by `collisionDamageBonus` (Cavalier) and `healthThreshold` (Berserker).
- **Alternatives Considered**:
  - *Condition-based roll modifier*: Does not cleanly scale flat attack damage.
  - *Hardcoded passive ID check*: Brittle and violates architecture isolation guidelines.

## Risks / Trade-offs

- **Risk**: Knocking an enemy back 1 hex might push them out of melee range of friendly frontliners.
  - **Mitigation**: The Highwayman's `SKIRMISHER` tactical profile seeks flanking angles, angling knockback trajectories parallel to frontlines or into perimeter walls for collision damage.
- **Risk**: -2 Armor debuff could trivialize enemy defenses if stacked.
  - **Mitigation**: Existing modifier refresh rules in `resolver.ts` deduplicate identical modifiers by refreshing duration rather than stacking magnitudes.
