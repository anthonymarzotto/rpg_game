# Design

## Context

See `proposal.md` for motivation. In 3v3 simulation trials, Highwayman suffers a bottom-tier 40.0% win rate and 3.3 net damage/match because the AI repeatedly casts `Stand and Deliver!` on the same target (43 out of 108 turns, 40%) without following up with attacks. Furthermore, `Highway Toll` requires target effective Armor $> 0$, which is disabled when `Stand and Deliver!` shreds Armor down to 0. `Gallant Flourish` (Range 1) suffers 0 casts across matches because Skirmishers avoid closing to melee range 1, and AI scoring ignores `targetScope: 'SELF'` on attack abilities.

## Goals / Non-Goals

**Goals:**
- Eliminate AI duplicate-cast spamming of non-damage/debuff abilities on the same target within a turn.
- Ensure primer bonuses drop once a target is already debuffed, prompting the AI to transition to follow-up physical attacks (`Point-Blank Buckshot`).
- Re-link `Highway Toll` passive to base Force comparison (`targetForce > actorForce`), allowing Highwayman to benefit from `+2` physical damage even after stripping target Armor to 0.
- Equip `Gallant Flourish` with `RETREAT_STEP: 1` and `aiHint.meleeContingency` so cornered Skirmishers strike in melee and automatically disengage back to Range 2.
- Support `targetScope: 'SELF'` evaluation in AI heuristics so self-buffs on offensive attacks are properly scored.

**Non-Goals:**
- Modifying `Point-Blank Buckshot`'s damage dice (retained at `1d8 + Finesse` for this baseline).
- Modifying other classes or introducing artificial `oncePerTurn` cooldowns on `Stand and Deliver!` (keeping multi-target debuffing across separate foes viable).

## Decisions

### 1. Highway Toll: Target Force Comparison Data Model
- **Decision**: Update `PassiveTrait` to replace or generalize `targetArmorBonus` with `targetForceBonus: { minForceDelta?: number; minTargetForce?: number; flatDamageBonus: number; damageTypeFilter?: DamageType }` (or evaluate `targetForce > actorForce`).
- **Rationale**: Highwayman has base Force 1. High-Force foes (Knights, Cavaliers, Warriors, Berserkers) have base Force 2+. Evaluating base Force preserves the thematic of "robbing heavier/wealthier foes" while ensuring that shredding their Armor with `Stand and Deliver!` does not deactivate the passive.
- **Alternatives Considered**:
  - *Keep target Armor $> 0$ with shred compensation*: Fails if allies or external debuffs strip armor, and feels confusing in combat tooltips.

### 2. Gallant Flourish: 1-Hex Retreat Step & Melee Contingency
- **Decision**: Add `{ type: 'RETREAT_STEP', magnitude: 1, targetScope: 'SELF', applyOn: 'ALWAYS' }` to `GALLANT_FLOURISH` and declare `aiHint: { meleeContingency: { preferredProfiles: ['SKIRMISHER'], bonusScore: 25.0 } }`.
- **Rationale**: When an enemy closes to Range 1, Highwayman cannot fire Buckshot without disadvantage or knockback complications, and Skirmisher standoff weight discourages staying in melee. `RETREAT_STEP` uses the existing `retreatHandler` to disengage 1 hex away, perfectly resetting distance to Range 2 while applying `+2 Evasion`.
- **Alternatives Considered**:
  - *Self-teleport*: Breaks physical rogue theme.
  - *Knockback on Flourish*: Pushes the enemy rather than moving the duelist; Highwayman already has knockback on Buckshot.

### 3. AI Duplicate Debuff Deprioritization & Primer Completion
- **Decision**:
  - In `scorePrimerAbility`: Check if the target already has the intended debuff active (e.g. `armor < 0` for `Stand and Deliver!`). If so, return `{ score: 0 }`.
  - In `scoreDebuffAndUtility`: If a non-damage ability's negative stat modifiers are already present on the target, do NOT allow secondary `CTB_DELAY` to bypass the non-redundancy guard on that same target within the same turn.
- **Rationale**: In 3v3 and 1v1, `CTB_DELAY` gave `Stand and Deliver!` a recurring ~35–45 utility score every action, causing Highwayman to hold up the same enemy twice per turn rather than firing Buckshot.
- **Alternatives Considered**:
  - *`oncePerTurn` on Stand and Deliver*: Prevents Highwayman from debuffing two *different* enemies in a 3v3 team fight (multi-target control). Deprioritizing duplicate targets preserves multi-target flexibility while eliminating single-target spam.

### 4. AI Evaluation of Self-Buffs on Offensive Attacks
- **Decision**: In `scoreDebuffAndUtility` or candidate action scoring, inspect `ability.effects` for `targetScope: 'SELF'` stat modifiers (e.g. `evasion: 2` on `Gallant Flourish`) and award utility score (e.g. `+8.0` for evasion when engaged in melee).
- **Rationale**: Without this, the AI only evaluates raw expected damage, ignoring the defensive value of offensive martial stances and flourishes.

## Risks / Trade-offs

- **[Risk] Obstacle-blocked Retreat**: If the tile behind Highwayman is occupied or a wall, `RETREAT_STEP` cannot displace the unit.
  - **Mitigation**: `retreatHandler` already handles this safely: if obstructed, displacement is skipped while damage and `+2 Evasion` apply normally.
- **[Risk] Highway Toll across class progression**: What if a player ascends Highwayman with custom Force attributes?
  - **Mitigation**: Testing against `target.baseAttributes.force > actor.baseAttributes.force` (or `target.baseAttributes.force >= 2`) ensures the trait scales naturally with character progression.
