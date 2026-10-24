# Design

## Context

See `proposal.md` for background and motivation. Currently in [`src/core/combat/resolver.ts`](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts), damaging attack resolution unconditionally expects a primary `target.targetUnitId` and executes secondary AoE splash damage as an automatic, uncontested `resolveDamage('SOLID_HIT')` against all adjacent units whenever the primary attack roll does not miss.

This design generalizes damaging AoE resolution to support ground hex targeting, declarative splash damage profiles, contested multi-target defense checks, and intelligent AI ground evaluation.

## Goals / Non-Goals

**Goals:**
- Enable `targetType: 'HEX'` for damaging abilities, allowing targeting of both occupied and unoccupied arena tiles within range.
- Provide a unified spellcast attack roll contested against each victim's individual defense (`defenseTarget`), ensuring high-defense targets can resist splash damage.
- Add an explicit `splashDamageProfile` to `Ability` (Approach A) with clean fallbacks for spells augmented via metamagic (`Spell Sculpt`).
- Preserve friendly fire for all units within the blast radius (excluding the caster).
- Update player targeting previews (`targetPreview.ts`), combat logs, and floating text for multi-target ground blasts.
- Implement AI candidate hex evaluation in `decisionEngine.ts` with multi-target payoff and strict friendly-fire suppression.

**Non-Goals:**
- Line-of-sight penetrations through solid walls (line of sight from caster to target hex is still strictly enforced).
- Modifying non-damaging utility AoEs (`Flash Powder`, `Lead the Charge`), which remain in their dedicated support pipelines.
- Persistent lingering surface hazards (e.g. flaming ground or ice surfaces)—this change focuses strictly on instantaneous blast resolution.

## Decisions

### 1. Unified Spellcast Roll vs. Individual Target Rolls
- **Decision**: The attacker rolls a single d20 (`d20 + attackModifierAttribute` + vantage bonuses). This single roll total is compared against each victim's respective `defenseTarget` (Resolve or Evasion) within the blast radius.
- **Rationale**: Keeps combat logs clear and readable, reflects the thematic quality of a single spellcast explosion, and maintains proper advantage/disadvantage dynamics without rolling 3–4 separate d20s for a 1-AP cantrip.
- **Alternatives Considered**: Individual attack rolls per target (discarded due to excessive combat log spam and RNG dilution).

### 2. Declarative `splashDamageProfile` on `Ability` (Approach A)
- **Decision**: Add optional `splashDamageProfile?: DiceProfile` to `Ability`. For `Arcane Blast`, `damageProfile` is `{ count: 1, sides: 4, modifierAttribute: 'focus' }` (center), while `splashDamageProfile` is `{ count: 1, sides: 4 }` (splash ring without attribute bonus).
- **Fallback Rule**: If an ability gains `aoeRadius > 0` (e.g. via `Spell Sculpt`) without an explicit `splashDamageProfile`, the splash defaults to the base dice profile without attribute modifiers.
- **Rationale**: Completely transparent in tooltips, UI inspect cards, and data packages.

### 3. Hex-Targeted Damaging Resolution Pipeline in `resolver.ts`
- **Decision**: In `resolver.ts`, generalize Damaging Attack Resolution to handle `targetType === 'HEX'`:
  - `targetCoord` is authoritative.
  - If a unit occupies `targetCoord`, it is designated the center target. It contests the spellcast roll for direct damage (can Critical Hit, Solid Hit, Graze, or Miss).
  - If `targetCoord` is unoccupied, center direct damage is skipped.
  - For all other units within `aoeRadius` of `targetCoord`: each contests the spellcast roll vs. their defense. On hit, they take splash damage from `splashDamageProfile`; on miss, they take 0 damage.
- **Rationale**: Unifies occupied and unoccupied ground targeting under a single execution contract.

### 4. AI Ground Candidate Hex Evaluation in `decisionEngine.ts`
- **Decision**: In `decisionEngine.ts`, evaluate damaging `targetType === 'HEX'` abilities across candidate arena tiles within range:
  - Generate all reachable walkable hexes.
  - Filter to hexes that contain $\ge 1$ enemy within `aoeRadius`.
  - Calculate `NetScore = CenterDirectScore + Sum(SplashEnemyScores) - Sum(FriendlyFirePenalties)`.
  - Assign a heavy `-25.0` penalty for any caught ally, ensuring the AI will never blast its own teammates unless no alternatives exist or the ally is shielded.

## Risks / Trade-offs

- **[Risk] Friendly fire frustration for new players** → *Mitigation*: The hover targeting preview (`targetPreview.ts`) and arena highlights will clearly illuminate all affected hexes in the blast radius and display warnings if allies are caught.
- **[Risk] AI combinatorial explosion checking all hexes in range** → *Mitigation*: Prune candidate hexes immediately by only evaluating hexes within `aoeRadius` of at least one living enemy.
