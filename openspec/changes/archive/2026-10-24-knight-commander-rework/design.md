# Design

## Context

See `proposal.md` for background and motivation. 

The combat engine currently implements condition lifecycle hooks in `src/core/combat/conditions.ts`:
- `onOutgoingAttackRoll`: Modifies outgoing roll (imposes Disadvantage on `CHALLENGED` when attacking non-challenger).
- `onIncomingAttackRoll`: Modifies incoming roll (used for `STEALTH` or defensive abilities).
- `onAfterAction`: Called after an actor executes an action (currently used by `STEALTH` to break on attack, returning `{ removeCondition: boolean }`).
- `onTakeDamage`: Called when taking damage (used by `STEALTH` to break on direct/fire damage).

For conditional bonus damage, `damageHandler.ts` and `targetPreview.ts` currently evaluate `effect.condition === 'FLANK_OR_REAR'`. The unit vitals and modifiers pipeline natively supports `attackRoll` as a stat key, used by `getAttackRollModifier` in `attackRoll.ts`.

## Goals / Non-Goals

**Goals:**
- Rebalance the Knight into a cohesive offensive **Commander** who dictates battle tempo, commands ally focus-fire, and punishes enemies who defy frontline challenges.
- Enhance `Lead the Charge` (2 AP) with an active `+2 Attack` roll modifier buff to all allies within 3 hexes for 2 turns.
- Introduce the `EXPOSED` status condition: incoming attacks against the target gain Advantage; the condition is consumed upon being attacked.
- Punish defiance of `CHALLENGED`: when a challenged unit attacks any target other than its challenger, inflict `EXPOSED` via `onAfterAction`.
- Enhance `Pommel Strike` with a declarative `TARGET_CHALLENGED` condition that rolls `+1d4` bonus physical damage against challenged foes.
- Align AI decision-making with these mechanics so enemies respect the defiance penalty and allies leverage Advantage on exposed targets.
- Update class catalog description to reflect the Commander archetype.

**Non-Goals:**
- Guardian, interception, or damage redirection mechanics (reserved for the planned Shield-bearer class).
- Breaking `CHALLENGED` when damaged by third-party allies (rejected in item 2.5).
- Implementing a real-time reactive attack / opportunity attack system.

## Decisions

### 1. Defiance Retaliation via `EXPOSED` Status Condition
- **Choice**: When a unit afflicted with `CHALLENGED` executes an attack that does not include its challenger, apply `EXPOSED` to the attacker. Incoming attacks against an `EXPOSED` unit gain Advantage and consume the condition.
- **Rationale**: The combat engine does not have an opportunity attack or reaction phase. `EXPOSED` integrates seamlessly with the d20 roll evaluation (`onIncomingAttackRoll`), creates an intuitive focus-fire incentive for the Knight's team, and turns the taunt into a true dilemma for enemies.
- **Alternatives Considered**:
  - *Free counter-strike*: Requires building a reaction pipeline and fails when the Knight is outside melee range (Shout has range 3).
  - *Direct true damage*: Generic and uninteractive; does not reward allied coordination.
  - *CTB initiative penalty*: Solid tempo effect, but lacks the visual and offensive punch of team focus-fire Advantage.

### 2. Condition Consumption on Attack Action (Hit or Miss)
- **Choice**: `EXPOSED` is consumed and removed immediately upon resolving an incoming attack action against the bearer, whether that attack hits, misses, or grazes.
- **Rationale**: If consumed on damage, environmental effects or turn-start DoT ticks (`POISON`, `BURN`) would prematurely strip `EXPOSED` before allies can strike. If it persisted across an entire turn without being consumed, stacking +2 Attack and Advantage across an entire party would result in oppressive burst damage. Single-attack consumption provides balanced, high-impact payoff.
- **Alternatives Considered**:
  - *Consume on hit only*: Allows missed attacks to retain Advantage, stretching out turn sequences unnaturally.
  - *Timed duration without consumption*: Too lethal in 3v3 focus-fire.

### 3. Defiance Logic in Shared `CHALLENGED` Registry Definition
- **Choice**: Implement the defiance check in `CONDITION_REGISTRY.CHALLENGED.onAfterAction`.
- **Rationale**: `CHALLENGED` is shared by the Knight (`Challenging Shout`), Cavalier (`Flamboyant Flourish`), and the `Vanguard Shard` infusion. Making the defiance rule part of `CHALLENGED` standardizes the taunt mechanic across the entire game, immediately boosting Cavalier's viability without duplicating code.
- **Alternatives Considered**:
  - *Bespoke KNIGHT_CHALLENGE condition*: Splits the condition ecosystem and requires duplicate UI badges and AI handlers.

### 4. `TARGET_CHALLENGED` Tactical Condition Pipeline
- **Choice**: Add `'TARGET_CHALLENGED'` to `AbilityCondition` and evaluate it in `damageHandler.ts` and `targetPreview.ts` alongside `'FLANK_OR_REAR'`.
- **Rationale**: Reuses the established declarative pattern where `AbilityEffect.condition` gates `AbilityEffect.bonusDamage`. This ensures both live combat resolution and UI target previews accurately reflect the +1d4 damage against challenged targets.
- **Alternatives Considered**:
  - *New effect type `CHALLENGED_BONUS_DAMAGE`*: Redundant; `AbilityCondition` was designed specifically for conditional bonus damage.

### 5. `Lead the Charge` 2 AP Signature Tuning
- **Choice**: Retain 2 AP cost, maintaining `+2 Move` and `+2 Speed` while adding `attackRoll: 2` to the effect's `statModifiers` for 2 turns in radius 3.
- **Rationale**: A 2 AP signature should feel transformative. Adding +2 to attack rolls (~+10% hit rate) for all allies (physical and magical) directly addresses the Knight's team damage race deficit while keeping the high-tempo charge fantasy intact.
- **Alternatives Considered**:
  - *Reduce AP cost to 1*: Weakens the signature fantasy and turns the Knight into a spammy utility bot.
  - *Add Armor / Ward*: Pushes the Knight back toward the Bastion archetype, overlaps with Shield-bearer, and fails to solve the team damage deficit.

## Risks / Trade-offs

- **[Risk: Vanguard Shard Proliferation]** → Infusing `Vanguard Shard` on high-attack units could apply `CHALLENGED` frequently, potentially triggering multiple `EXPOSED` states.
  * *Mitigation*: `Vanguard Shard` only applies `CHALLENGED` for 1 turn, and `EXPOSED` is only triggered if the target defies the challenge by attacking someone other than the infuser.
- **[Risk: AI Target Selection Blind Spots]** → AI might ignore or undervalue `EXPOSED` targets.
  * *Mitigation*: `heuristics.ts` derives expected damage directly from `rollContext.hitProbability`. Since `EXPOSED` provides Advantage, hit probability and expected damage automatically surge against exposed targets, naturally drawing AI focus-fire without brittle hardcoded rules. Additionally, update AI target evaluation for challenged enemies to factor in the threat of acquiring `EXPOSED`.
- **[Risk: Knight Turn 1 Damage Vacuum in 2v2]** → A Knight spending 2 AP on `Lead the Charge` and 1 AP on `Challenging Shout` deals 0 damage on Turn 1.
  * *Mitigation*: The allied partner immediately leverages +2 Move and +2 Attack on Turn 1. On Turn 2, the Knight attacks up to 3 times with `Pommel Strike` at `2d4 + Force` each, rapidly regaining damage parity. Verified through the automated 2v2 support synergy benchmark.
