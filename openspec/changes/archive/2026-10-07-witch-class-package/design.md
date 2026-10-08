# Technical Design: Tier 3 Witch Class Package

## Context

See `proposal.md` for background and motivation. Phase 5 of the development roadmap establishes the 6 Tier 3 dual-archetype hybrid classes. Following the completion of the Cavalier `(2, 1, 0)`, Berserker `(2, 0, 1)`, Highwayman `(1, 2, 0)`, and Warlock `(1, 0, 2)`, the Witch `(0, 1, 2)` (Mage/Rogue — Dominant Mage) is the next hybrid class.

The Witch introduces our first dedicated hybrid `SUPPORT` class. She blends occult hex debuffs (`POISON`, `CTB_DELAY`), sympathetic effigy manipulation (forcing target directional facing 180° away to expose rear arcs), allied tempo fuel (`INITIATIVE_BOOST`, `Speed`), and the foundation for tactical aura passives (`Misfortune Ward`).

## Goals / Non-Goals

**Goals:**
- Author `src/data/packages/witch.ts` defining `BALEFUL_HEX`, `POPPET_NEEDLE`, `WITCHS_TALISMAN`, `MISFORTUNE_WARD`, and `WITCH_PACKAGE`.
- Register the Witch package in `src/data/packages/index.ts` and export the abilities in `src/data/abilities.ts`.
- Implement target-centric aura architecture on `PassiveTrait`: extend `PassiveTrait` with an `aura` definition (`radius: number`, `targetScope: 'ALLIES' | 'ENEMIES'`, `attackRollPenalty?: number`).
- Evaluate target-centric aura in `attackRoll.ts` / `resolver.ts`: when an attack targets a unit within 2 hexes of an active ally with `Misfortune Ward`, apply -2 to the incoming attack roll.
- Implement directional facing reversal: support `FORCE_FACING_AWAY` in `AbilityEffectType` and `resolver.ts` so `Poppet Needle` overrides default on-hit facing rotation and flips the target 180° away (`(dirToOrigin + 3) % 6`).
- Map `witch` to the `SUPPORT` AI tactical profile in `src/core/ai/heuristics.ts`.
- Deliver thorough unit and integration test coverage across all Witch abilities, facing mechanics, aura penalties, and wildcard equipping.

**Non-Goals:**
- Creating new complex status conditions beyond existing `POISON`.
- Modifying other class packages or altering existing ability definitions.
- Authoring non-linear sector expedition nodes or Tier 3 enemy budgeting (deferred to Phase 5.7).

## Decisions

### 1. Target-Centric Defensive Aura (`Misfortune Ward`) over Attacker-Centric Miasma
- **Decision**: `Misfortune Ward` checks the position of the *defending target* relative to the Witch (`hexDistance(witchPos, targetPos) <= 2`). Any incoming attack targeting an ally (or the Witch herself) within this 2-hex radius imposes a -2 penalty to the attacker's roll.
- **Rationale**:
  - *Prevents Melee Hugging*: An attacker-centric check requires the squishy 0-Fighter Witch to stand within 2 hexes of enemy attackers, pulling her into suicidal frontline melee.
  - *Universal Protection*: Protects against both melee brawlers and distant ranged snipers (e.g. archers at Range 4 shooting an ally inside the ward).
  - *Reusable Precedent*: Establishes the exact architectural pattern that future defensive guardian classes like the **Shield Bearer** (*Phalanx Guard Aura*) and **Cleric** (*Sanctuary Aura*) will use.
- **Alternatives Considered**:
  - *Attacker-centric miasma (check distance from Witch to attacker)*: Completely bypassed by ranged enemies at range 3–4, and forces the Witch to stand in front-line danger.
  - *Pure condition-linked passive*: Loses the spatial tactical grid positioning that makes hex combat dynamic.

### 2. Reverse Facing Manipulation (`FORCE_FACING_AWAY`) via `Poppet Needle`
- **Decision**: Introduce `FORCE_FACING_AWAY` into `AbilityEffectType`. In `resolver.ts`, when resolving on-hit reactive rotation, if an executed ability contains `FORCE_FACING_AWAY`, the target rotates 180° opposite to the attack vector (`(dirToOrigin + 3) % 6`), rather than facing the attacker.
- **Rationale**: In the combat engine, attacks normally rotate the target to face the attacker (`targetCu.facing = dirToOrigin`). `Poppet Needle` symbolically twists the voodoo effigy, leaving the victim's back (`REAR` arc) exposed to allied rogues and brawlers for devastating criticals and flank attacks.
- **Alternatives Considered**:
  - *New 'CONFUSED' status condition*: Adds unnecessary condition engine overhead when an instantaneous facing flip achieves the exact desired gameplay.

### 3. Dual-Role Turn Economy with Allied CTB Haste (`Witch's Talisman`)
- **Decision**: Provide `Witch's Talisman` as a 1 AP Range 2 active buff targeting allies, applying `+25 CTB ticks` (`INITIATIVE_BOOST`) and `+2 Speed` for 1 turn.
- **Rationale**: With 3 AP per turn, a Dominant Mage needs flexible turn options. The Witch can spend 1 AP to supercharge her vanguard brawler (`Knight` or `Berserker`), 1 AP to curse an enemy with `Baleful Hex`, and 1 AP to disorient another foe with `Poppet Needle`.
- **Alternatives Considered**:
  - *Self-only haste*: Warlocks and Infiltrators are self-centered; a true occult Support specialist must actively empower teammates.

### 4. AI Profile Mapping (`SUPPORT`)
- **Decision**: Map `witch` to `SUPPORT` in `src/core/ai/heuristics.ts`.
- **Rationale**: The `SUPPORT` profile evaluates friendly targets for beneficial buffs while prioritizing debuffing high-threat targets and manipulating the turn gauge.

## Risks / Trade-offs

- **[Risk] Aura Performance on Attack Rolls** → Attack rolls are evaluated frequently during combat.
  - *Mitigation*: The aura check iterates only over active (non-defeated) units on the grid (`state.units.values()`, typically 4–10 units max) and checks simple hex distance math. Negligible overhead (<0.1ms).
- **[Risk] Aura Stacking Abuse** → Multiple friendly units with `Misfortune Ward` could theoretically stack penalties.
  - *Mitigation*: The aura evaluator clamps or takes the maximum penalty rather than uncapped summing, preventing infinite stacking if multiple witches are on the field.
- **[Risk] Target-Facing Override Conflicts** → If an ability has both displacement knockback and facing changes.
  - *Mitigation*: Displacement runs before final facing assignment; `FORCE_FACING_AWAY` applies to the final settled position of the target.
