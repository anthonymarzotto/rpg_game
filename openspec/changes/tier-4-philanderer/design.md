# Design: Tier 4 Philanderer (`#84`, `0F, 3R, 1M`)

## Context

See `proposal.md` for motivation and scope. The Philanderer (`#84`, `0 Fighter, 3 Rogue, 1 Mage`) introduces four new mechanical primitives into the combat engine:
1. **`CHARMED` status condition**: A 1-turn (or 2-turn on Critical Hit) temporary faction flip that hands turn control over to the charmer's side.
2. **`BLINDED` status condition ("Myopic Dazzle")**: Imposes outgoing attack roll Disadvantage, clamps maximum ability targeting range to 1 hex, and disables front-arc Stealth detection.
3. **`PULL` displacement effect**: Draws a target 1 hex along the straight line toward the actor (`Beckoning Glance`), evaluating ledge plunge fall damage and displacement immunity.
4. **Directional Front-Arc Attacker Aura (`Captivating Presence`)**: Applies a `-2` Attack Roll penalty to any hostile unit attacking from within 3 hexes inside the Philanderer's forward 180-degree `FRONT` combat arc.

## Goals / Non-Goals

**Goals:**
- Implement `CHARMED` cleanly by leveraging `CombatUnit.faction` for active combat allegiance and turn control while preserving `CombatUnit.unit.faction` as the unit's permanent base faction for victory/defeat objectives and post-battle XP harvest.
- Keep `Billet-Doux` as a pure non-damaging contested ability (`damageType: 'NONE'`, `defenseTarget: 'RESOLVE'`, `+Finesse vs Resolve`) with outcome-specific effect triggers (`CRIT_ONLY` -> 2T `CHARMED`, `HIT_ONLY` -> 1T `CHARMED`, `GRAZE_ONLY` -> 1T `EXPOSED`).
- Implement `PULL` (`pullHandler.ts`) symmetrically with `retreatHandler` and `knockbackHandler` so fall damage, `Zeroed In` stack clearing, displacement immunity, structured `EffectOutcome` metadata, and floating combat text (`'PULL!'`) work out of the box.
- Extend aura evaluation so directional attacker-debuff auras (`targetScope: 'ENEMIES'`, `arc: 'FRONT'`, `radius: 3`) compose cleanly with existing target-centric protective auras (`Misfortune Ward`, `Unyielding Stance`).

**Non-Goals:**
- Summoned illusion decoys or clone tokens (reserved for higher-tier Illusionist `#93` and Trickster `#87` classes).
- Mid-turn reactive counter-attack stances.

## Decisions

### 1. `CHARMED` Faction Switching & Control Architecture
- **Choice**: Store active combat allegiance on `CombatUnit.faction` while treating `CombatUnit.unit.faction` as the immutable original faction.
- **How it works**:
  - When `applyConditionToUnit` applies `CHARMED` from `actorCu` to `targetCu` (with `stackingPolicy: 'OVERRIDE_SOURCE'`), `targetCu.faction` is set to `actorCu.faction ?? actorCu.unit.faction ?? 'PLAYER'`.
  - In `useCombatSimulation.ts`, turn phase resolution (`phase = activeCu?.faction !== 'PLAYER' ? 'HOSTILE_TURN' : 'PLAYER_ACTION'`) is already driven by `activeCu.faction`. Therefore:
    - When an enemy unit is charmed by a player Philanderer, `targetCu.faction` becomes `'PLAYER'`. On that unit's turn, the player receives full interactive control on the Action Bar (`PLAYER_ACTION`).
    - When a player unit is charmed by an enemy Philanderer, `targetCu.faction` becomes `'ENEMY'`. On that unit's turn, `executeHostileTurnAsync` automatically runs the AI decision engine for that unit (`HOSTILE_TURN`).
  - Condition duration ticks down at the **end of the charmed unit's turn** (in `endActiveTurn` in `turnClock.ts`), not at turn start, so a 1-turn `CHARMED` unit gets 1 full turn acting for their charmer's faction (and a 2-turn Crit `CHARMED` unit gets 2 full turns). When `CHARMED` expires or is removed, `cu.faction` is restored to `cu.unit.faction`.
  - In `objectives.ts` (`evaluateCondition` for `FACTION_DEFEATED` and `evaluateEncounterOutcome`) and `useCombatSimulation.ts` (`checkEncounterProgression` for post-battle player squad summaries), units are filtered by their original base faction (`cu.unit.faction ?? cu.faction`) so charming the final remaining enemy never prematurely triggers `VICTORY`, and charmed enemies never appear in the player's post-trial XP distribution modal.
- **Alternatives Considered**: Having the AI always control a player-charmed enemy during a special sub-phase. Rejected because flipping `cu.faction` to `'PLAYER'` requires less code, avoids a new combat phase state, and gives the player direct tactical agency over the charmed unit.

### 2. Outcome-Gated Effects (`HIT_ONLY` and `GRAZE_ONLY`) for `Billet-Doux`
- **Choice**: Extend `EffectApplyCondition` in `src/core/types/ability.ts` from `'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY'` to `'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY' | 'HIT_ONLY' | 'GRAZE_ONLY'`.
- **Rationale**: `Billet-Doux` deals no damage (`damageType: 'NONE'`, `defenseTarget: 'RESOLVE'`), yet needs three distinct non-miss outcomes:
  - `CRIT_ONLY`: `CHARMED` (`durationTurns: 2`)
  - `HIT_ONLY`: `CHARMED` (`durationTurns: 1`)
  - `GRAZE_ONLY`: `EXPOSED` (`durationTurns: 1`)
  In `executeAbilityEffects` (`src/core/combat/effects/index.ts`), when `hitOutcome === 'GRAZE'`, any effect declaring `applyOn: 'GRAZE_ONLY'` executes instead of emitting the generic `GRAZE_NEGATED` context note. `abilityFormatter.ts` formats `HIT_ONLY`, `CRIT_ONLY`, and `GRAZE_ONLY` effect clauses with clear prefixes (`On Hit:`, `On Crit:`, `On Graze:`).

### 3. `PULL` Atomic Effect Handler (`Beckoning Glance`)
- **Choice**: Add `'PULL'` to `AbilityEffectType` and implement `pullHandler.ts`.
- **Mechanics**:
  - Given `actorPos` and `targetPos` at distance `d >= 2`, compute `const line = getHexLine(targetPos, actorPos)` and inspect the first step toward the actor (`destCoord = line[1]`).
  - If `targetCu` has `isImmuneToDisplacement(targetCu)`, emit a resisted `DISPLACEMENT` outcome (`displacement: 'PULL'`, `resisted: true`).
  - If `destCoord` exists on the arena, is walkable, is unoccupied, and its elevation rise from `targetPos` does not exceed `DISPLACEMENT_CONFIG.maxClimbElevation` (`dh <= 2`), move `targetCu` to `destCoord`, clear any `Zeroed In` stacks on `targetCu`, emit a `DISPLACEMENT` event with `kind: 'PULL'`, and evaluate plunge fall damage (`dh <= -2`) identically to `retreatHandler`.
  - If `targetPos` is already adjacent (`d === 1`) or `destCoord` is blocked/occupied, skip the displacement cleanly while still applying `FORCE_FACING` and `EXPOSED`.

### 4. `BLINDED` Condition ("Myopic Dazzle")
- **Choice**: Add `'BLINDED'` to `ConditionType` and `CONDITION_REGISTRY` with `stackingPolicy: 'REFRESH_DURATION'`.
- **Enforcement Points**:
  1. **Outgoing Disadvantage**: `CONDITION_REGISTRY.BLINDED.onOutgoingAttackRoll` returns `{ disadvantage: true, description: 'Blinded (Disadvantage)' }`.
  2. **Max Range Clamped to 1 Hex**: In `validator.ts` (`canExecuteAbility` and `getAbilityRangeCoords`), when `actorCu.activeConditions?.some(c => c.type === 'BLINDED')` and `effectiveAbility.range > 1`, clamp the effective maximum range to `1` (and if an ability has `minRange > 1`, such as a Ballistician's `minRange: 2` kit, no target hexes satisfy `minRange <= dist <= 1`, effectively locking out long-range artillery while Blinded).
  3. **Disabled Front-Arc Stealth Detection**: In `conditions.ts` (`evaluateFrontArcDetection`), return `[]` immediately if `detectorCu.activeConditions?.some(c => c.type === 'BLINDED')`.

### 5. `Captivating Presence` Directional Front-Arc Aura
- **Choice**: Extend `PassiveAuraEffect` in `src/core/types/passive.ts` with optional `arc?: 'FRONT'` and support `targetScope: 'ENEMIES'` in `evaluateTargetAuras` (`src/core/combat/auras.ts`).
- **Mechanics**:
  - Existing protective auras (`Misfortune Ward`, `Unyielding Stance`) use `targetScope: 'ALLIES'` and measure distance from the aura emitter to the **defender** (`targetCu`).
  - `Captivating Presence` uses `targetScope: 'ENEMIES'`, `radius: 3`, `arc: 'FRONT'`, `attackRollPenalty: 2`, and evaluates against the **attacker** (`actorCu`):
    - For each living unit `emitter` on the opposing faction of `actorCu` (`emitter.faction !== actorCu.faction`), if `hexDistance(emitterPos, actorPos) <= passive.aura.radius` and `getCombatArc(emitter.facing, emitterPos, actorPos) === 'FRONT'`, `Captivating Presence` contributes a `2`-point attack roll penalty.
  - Because `resolver.ts` rotates `actorCu.facing` toward `targetCoord` at line 666 *without* changing `emitter.facing`, checking `getCombatArc(emitter.facing, emitterPos, actorPos) === 'FRONT'` is completely invariant to who the enemy is attacking (whether the Philanderer or an ally).

## Risks / Trade-offs

- **[Risk] Condition duration lifecycle for `CHARMED` vs DoT conditions** -> DoT conditions (`POISON`, `BURN`) tick and decrement at turn *start* (`onTurnStartConditions`). If `CHARMED` decremented at turn start, a 1-turn `CHARMED` unit would immediately lose `CHARMED` at the start of their turn before acting! **Mitigation**: Decrement non-DoT turn-spanning conditions (`CHARMED`, `BLINDED`) at the end of the bearer's turn in `endActiveTurn` (or decrement `CHARMED` at turn end and restore `cu.faction = cu.unit.faction`), ensuring a 1-turn `CHARMED` unit always takes 1 full turn on the charmer's side and a 1-turn `BLINDED` unit suffers `BLINDED` throughout their entire next turn.
- **[Risk] AI targeting when enemies are `CHARMED`** -> Because `CHARMED` flips `targetCu.faction`, existing AI filters (`cu.faction !== actorCu.faction`) automatically treat a charmed unit as hostile to its former teammates and friendly to its charmer's team. We will add AI heuristic scoring so an AI Philanderer prioritizes high-threat uncharmed enemies for `Billet-Doux`, uses `Looking-Glass Glare` on dangerous ranged/martial threats, and uses `Beckoning Glance` to pull and expose enemies at distance 2–3.
