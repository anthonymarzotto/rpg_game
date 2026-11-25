# Combat Conditions Specification

## Purpose
Provides core combat engine support for status conditions, Damage-over-Time ticks, behavioral constraints, CTB initiative manipulation, friendly aoeRadius auras, in-combat ability modifiers, and event-driven passive triggers.

## Requirements

### Requirement: Active Condition Tracking
The system SHALL maintain an active condition collection on each combat unit where each condition specifies a valid condition type (`POISON`, `BURN`, `CHALLENGED`, `STEALTH`, `EXPOSED`, `TELEMETRY`, `CHARMED`, `BLINDED`, `HENOSIS`, `MORTAL_EBB`), duration in turns, and a mandatory `sourceUnitId` representing the originating unit. Each registered condition definition SHALL declaratively specify its stacking policy, duration tick timing (`'TURN_START'`, `'TURN_END'`, or `'NEVER'`), optional flat combat stat modifiers (`statModifiers`), optional status-purification eligibility (`purgeableByCleanse`), optional per-caster active instance cap (`maxActivePerSource`), optional incompatible target conditions (`blockedByTargetConditions`), and optional automatic follow-up condition on natural expiration (`onExpireApplyCondition`). When applying a condition that is already present on a target, the system SHALL resolve the conflict according to the condition's registered stacking policy:
- `OVERRIDE_SOURCE`: Overwrite `sourceUnitId` with the new applying actor, refresh duration to the new duration, and preserve single-condition status (used by `CHALLENGED` for taunt steal, `CHARMED` for charm allegiance override, and `HENOSIS`).
- `STACK_INTENSITY`: Increment `damagePerTurn` up to a configured ceiling (8) and refresh duration to `Math.max(existing, new)` (used by `POISON` and `BURN`).
- `REFRESH_DURATION`: Keep existing properties and refresh duration to `Math.max(existing, new)` (used by `STEALTH`, `EXPOSED`, `TELEMETRY`, `BLINDED`, and `MORTAL_EBB`).

#### Scenario: Condition application with attribution
- **WHEN** an ability applies a condition to a target unit that does not currently possess that condition
- **THEN** an `ActiveCondition` entry is added to the target unit's condition list containing the correct type, duration, and the actor's unit ID as `sourceUnitId`

#### Scenario: Challenged taunt steal overrides previous challenger
- **WHEN** a unit with an active `CHALLENGED` condition from Unit A is challenged by Unit B
- **THEN** the existing condition's `sourceUnitId` is updated to Unit B
- **THEN** the condition's `durationTurns` is reset to the new duration
- **THEN** the target possesses exactly one `CHALLENGED` condition

#### Scenario: DoT intensity stacking up to maximum cap
- **WHEN** a unit with an active `POISON` or `BURN` condition takes a new application of the same condition
- **THEN** the condition's `damagePerTurn` is increased by the incoming condition magnitude up to a maximum cap of 8
- **THEN** the condition's `durationTurns` is set to the maximum of its remaining turns and incoming turns
- **THEN** the target possesses exactly one condition of that type

#### Scenario: Stealth duration refresh
- **WHEN** a unit with an active `STEALTH` condition is granted `STEALTH` again
- **THEN** the condition's duration is updated to `Math.max(currentDuration, newDuration)`
- **THEN** the target possesses exactly one `STEALTH` condition

#### Scenario: Exposed condition application and refresh
- **WHEN** a unit receives the `EXPOSED` condition
- **THEN** the unit acquires the `EXPOSED` condition for 1 turn (or refreshes duration if already active)

### Requirement: Turn-Start Damage-Over-Time Resolution
The system SHALL evaluate all active conditions at the beginning of a unit's combat turn before granting Action Points by delegating to each condition's registered `onTurnStart` lifecycle hook, applying returned unmitigated damage directly to HP and decrementing duration.

#### Scenario: Poison damage tick
- **WHEN** a unit with an active `POISON` condition begins their combat turn
- **THEN** the registered `onTurnStart` hook resolves damage matching the condition's accumulated `damagePerTurn` (default 2) attributed to the `sourceUnitId`
- **THEN** the condition's remaining duration is decremented by 1 turn
- **THEN** if the remaining duration reaches 0, the condition is removed

#### Scenario: Burn damage tick
- **WHEN** a unit with an active `BURN` condition begins their combat turn
- **THEN** the registered `onTurnStart` hook resolves fire damage matching the condition's accumulated `damagePerTurn` (default 2) attributed to the `sourceUnitId`
- **THEN** the condition's remaining duration is decremented by 1 turn
- **THEN** if the remaining duration reaches 0, the condition is removed

#### Scenario: Defeat by damage-over-time
- **WHEN** a unit's current HP is reduced to 0 or below by a turn-start DoT tick
- **THEN** the unit is marked as defeated immediately and their turn terminates without granting AP

### Requirement: Behavioral Condition Enforcement
The system SHALL enforce tactical and behavioral constraints imposed by active conditions through declarative condition registry metadata and lifecycle hooks: `canBeTargeted`, `maxActivePerSource`, and `blockedByTargetConditions` for targeting validation; `statModifiers`, `onOutgoingAttackRoll`, and `onIncomingAttackRoll` for derived stat deltas, roll advantage/disadvantage, and flat attack roll bonuses/penalties; `tickTiming`, `onExpireApplyCondition`, and `onRemoved` for turn-start/turn-end duration ticking and automatic condition transitions; `onAfterAction` for condition removal and secondary status triggers upon combat actions; and `onTakeDamage` for condition removal upon taking damage.

For the `STEALTH` condition:
- The system SHALL reject hostile single-target abilities directed at a stealthed enemy.
- The system SHALL grant Advantage on outgoing attack rolls and remove `STEALTH` via `onAfterAction` when the stealthed unit executes an attack.
- The system SHALL remove `STEALTH` via `onTakeDamage` when the stealthed unit suffers direct attack damage, AoE splash damage, or fire damage (`damageType: 'MAGICAL'` from `BURN`). Turn-start damage from `POISON` DoT SHALL NOT remove `STEALTH`.
- When an active unit that is NOT afflicted with `BLINDED` begins their combat turn (or moves), if an opposing stealthed unit is within range 1 and positioned within the active unit's `FRONT` combat arc, the system SHALL remove `STEALTH` from that stealthed unit ("Spotted!"). The detected unit SHALL preserve its existing facing. If the stealthed unit is positioned within the active unit's `REAR` or `FLANK` combat arc, or if the detector unit is afflicted with `BLINDED`, `STEALTH` SHALL NOT be removed by proximity.

For the `CHALLENGED` condition:
- The system SHALL impose Disadvantage on outgoing attack rolls when attacking any target other than the challenger (`sourceUnitId`).
- When a unit with `CHALLENGED` executes an attack action where none of the targets are its challenger (`sourceUnitId`), the condition's `onAfterAction` hook SHALL inflict the `EXPOSED` condition upon the attacking unit. If the attack targets or includes the challenger, `EXPOSED` SHALL NOT be inflicted.

For the `EXPOSED` condition:
- The system SHALL grant Advantage on incoming attack rolls made against a unit with the `EXPOSED` condition.
- When an incoming attack resolves against an `EXPOSED` unit, the system SHALL consume and remove the `EXPOSED` condition immediately, regardless of whether the attack results in a Solid Hit, Critical Hit, Graze, or Miss.

For the `CHARMED` condition:
- Applying `CHARMED` SHALL switch the target unit's active combat `faction` to match the applying actor's combat `faction` (`'PLAYER'` or `'ENEMY'`) for the duration of the condition.
- `CHARMED` SHALL persist through incoming damage without breaking early.
- Because interactive vs AI turn sequencing follows the active unit's current combat `faction`, an enemy unit charmed to `'PLAYER'` SHALL be controlled directly by the player during its turn, while a player unit charmed to `'ENEMY'` SHALL be controlled by the AI turn sequencer during its turn.
- When `CHARMED` expires at the end of the charmed unit's turn (or is otherwise removed via `onRemoved`), the unit's active combat `faction` SHALL revert to its original base faction (`unit.faction`).
- Encounter victory and defeat evaluation (`FACTION_DEFEATED`) and post-trial player squad XP summaries SHALL evaluate each unit's original base faction (`unit.faction`) so charming the final remaining enemy does not prematurely end the encounter.

For the `BLINDED` condition:
- The system SHALL impose Disadvantage on all outgoing attack rolls made by a unit afflicted with `BLINDED`.
- The system SHALL clamp the effective maximum targeting range of all abilities used by a `BLINDED` unit to at most `1` hex (`Math.min(effectiveRange, 1)`), preventing targeting of units or hexes at distance 2 or greater.
- A unit afflicted with `BLINDED` SHALL NOT detect or reveal adjacent `STEALTH` units in their `FRONT` combat arc at turn start or during movement.

For the `HENOSIS` and `MORTAL_EBB` conditions:
- `HENOSIS` SHALL declare `tickTiming: 'TURN_END'`, `maxActivePerSource: 1`, `blockedByTargetConditions: ['MORTAL_EBB']`, `statModifiers: { attackRoll: 2, armor: 2, ward: 2, move: 1, speed: 1 }`, and `onExpireApplyCondition: { type: 'MORTAL_EBB', durationTurns: 1 }`.
- A unit with `HENOSIS` SHALL receive `+2` to outgoing Attack Rolls, `+2 Armor`, `+2 Ward`, `+1 Move`, and `+1 Speed`.
- Because `HENOSIS` declares `maxActivePerSource: 1`, ability validation SHALL reject any ability applying `HENOSIS` while any living unit on the battlefield already holds `HENOSIS` from the same `sourceUnitId`.
- When `HENOSIS` expires at the end of the bearer's turn (`durationTurns` reaches 0), its `onExpireApplyCondition` metadata SHALL automatically apply `MORTAL_EBB` for 1 turn (`sourceUnitId` preserved from `HENOSIS`).
- `MORTAL_EBB` SHALL declare `tickTiming: 'TURN_END'`, `purgeableByCleanse: false`, and `statModifiers: { attackRoll: -1, armor: -1, ward: -1, move: -1, speed: -1 }`.
- A unit with `MORTAL_EBB` SHALL receive `-1` to outgoing Attack Rolls, `-1 Armor`, `-1 Ward`, `-1 Move`, and `-1 Speed` (with effective Move and Speed floored at 1 and Armor and Ward floored at 0), and because `HENOSIS` declares `blockedByTargetConditions: ['MORTAL_EBB']`, the unit SHALL NOT be a valid target for `Henosis`.
- `MORTAL_EBB` SHALL decrement and expire at the end of the bearer's turn and SHALL NOT be removed by status purification effects (`CLEANSE`).

#### Scenario: Stealth prevents single-target hostile targeting
- **WHEN** an enemy attempts to execute a single-target ability targeting a unit with the `STEALTH` condition
- **THEN** `canBeTargeted` rejects the execution with an invalid target reason

#### Scenario: Attacking from stealth grants Advantage and breaks stealth
- **WHEN** a unit with the `STEALTH` condition executes an attack
- **THEN** the attack roll evaluates with Advantage
- **THEN** upon completing the action, the condition's `onAfterAction` hook removes the `STEALTH` condition

#### Scenario: Direct attack damage breaks stealth
- **WHEN** a unit with the `STEALTH` condition suffers direct attack damage or AoE splash damage
- **THEN** the condition's `onTakeDamage` hook removes the `STEALTH` condition

#### Scenario: Burn damage breaks stealth
- **WHEN** a unit with the `STEALTH` condition suffers damage from `BURN`
- **THEN** the condition's `onTakeDamage` hook removes the `STEALTH` condition

#### Scenario: Poison DoT tick does not break stealth
- **WHEN** a unit with the `STEALTH` condition suffers damage from a turn-start `POISON` DoT tick
- **THEN** the condition's `onTakeDamage` hook leaves the `STEALTH` condition active

#### Scenario: Ending turn in enemy front arc reveals stealth on enemy turn start
- **WHEN** a stealthed unit is positioned at range 1 in an unblinded enemy's `FRONT` combat arc when that enemy begins their combat turn
- **THEN** the enemy spots the unit and `STEALTH` is removed
- **THEN** the revealed unit's facing is preserved

#### Scenario: Ending turn in enemy rear or flank arc maintains stealth
- **WHEN** a stealthed unit is positioned at range 1 in an enemy's `REAR` or `FLANK` combat arc when that enemy begins their combat turn
- **THEN** the stealthed unit remains hidden in the enemy's blind spot and `STEALTH` is preserved

#### Scenario: Blinded unit cannot detect stealthed unit in front arc
- **WHEN** a stealthed unit is positioned at range 1 in the `FRONT` combat arc of an enemy afflicted with `BLINDED` when that enemy begins their turn or moves
- **THEN** the `BLINDED` enemy fails to spot the stealthed unit and `STEALTH` remains active

#### Scenario: Challenged condition imposes Disadvantage
- **WHEN** a unit with an active `CHALLENGED` condition attacks a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the attack roll evaluates with Disadvantage

#### Scenario: Challenged condition applies Disadvantage to targeting preview
- **WHEN** a unit with an active `CHALLENGED` condition previews an attack against a target that is NOT the challenger (`sourceUnitId`)
- **THEN** the previewed hit chance is calculated using the Disadvantage formula ($p^2$)
- **THEN** the preview indicates active Disadvantage

#### Scenario: Challenged unit attacking non-challenger incurs Disadvantage and receives Exposed
- **WHEN** a unit afflicted with `CHALLENGED` attacks a target other than its designated challenger
- **THEN** the attack roll evaluates with Disadvantage
- **THEN** upon completion of the attack action, the attacking unit receives the `EXPOSED` condition

#### Scenario: Challenged unit attacking challenger rolls normally without receiving Exposed
- **WHEN** a unit afflicted with `CHALLENGED` attacks its designated challenger
- **THEN** the attack roll evaluates normally without Disadvantage from `CHALLENGED`
- **THEN** the attacking unit does not receive the `EXPOSED` condition

#### Scenario: Incoming attack against Exposed unit rolls with Advantage and consumes condition
- **WHEN** any unit executes an attack against a target with the `EXPOSED` condition
- **THEN** the attack roll evaluates with Advantage
- **THEN** upon resolving the attack roll, the `EXPOSED` condition is consumed and removed from the target regardless of hit or miss

#### Scenario: Charmed enemy switches to player faction for duration and restores faction on expiry
- **WHEN** a player unit applies `CHARMED` for 1 turn to an enemy unit
- **THEN** the enemy unit's active combat `faction` immediately becomes `'PLAYER'`
- **THEN** taking damage while `CHARMED` does not remove `CHARMED`
- **THEN** when the charmed unit completes its turn and `CHARMED` expires, its active combat `faction` reverts to `'ENEMY'`

#### Scenario: Charming the last surviving enemy does not prematurely end the encounter
- **WHEN** only one living enemy unit remains in the arena and a player unit applies `CHARMED` to that enemy
- **THEN** encounter outcome evaluation (`FACTION_DEFEATED`) continues to return `'IN_PROGRESS'` because the unit's original base faction is still `'ENEMY'` and the unit is not defeated

#### Scenario: Blinded unit suffers outgoing Disadvantage and has maximum range clamped to 1
- **WHEN** a unit afflicted with `BLINDED` attempts to target a unit or hex at distance 2 or greater, or executes an attack at distance 1
- **THEN** targeting validation rejects targets at distance 2 or greater because effective ability range is clamped to 1
- **THEN** any attack executed at distance 1 evaluates with Disadvantage

#### Scenario: Henosis boosts combat vitals and transitions to Mortal Ebb on expiry via condition definition metadata
- **WHEN** a unit has `HENOSIS` with `durationTurns: 1` and finishes its active turn
- **THEN** while `HENOSIS` is active, the condition's declarative `statModifiers` increase the unit's effective Attack Roll by `+2`, Armor by `+2`, Ward by `+2`, Move by `+1`, and Speed by `+1`
- **THEN** upon ending its turn, `HENOSIS` expires (`tickTiming: 'TURN_END'`) and its declarative `onExpireApplyCondition` applies `MORTAL_EBB` for 1 turn, reducing effective Attack Roll by `-1`, Armor by `-1`, Ward by `-1`, Move by `-1`, and Speed by `-1` until the end of its next turn

### Requirement: CTB Gauge Manipulation & Pre-Encounter Setup
The system SHALL support direct adjustments to a unit's CTB initiative gauge during combat and provide a pre-encounter setup pass allowing passives and scenario modifiers to seed starting initiative or conditions.

#### Scenario: CTB delay execution
- **WHEN** an ability effect with `CTB_DELAY` resolves against a target
- **THEN** the target's `initiativeGauge` is reduced by the specified magnitude, floored at 0

#### Scenario: Pre-encounter setup pass
- **WHEN** a combat encounter is initialized before the first CTB clock tick
- **THEN** a setup pass is evaluated across all units
- **THEN** units with `Tactical Vanguard` receive +25 starting initiative gauge

### Requirement: Friendly AoE Aura Resolution
The system SHALL evaluate the `aoeRadius` of support and buff abilities (`damageType: 'NONE'`) to apply effects to all friendly units within the specified radius.

#### Scenario: Multi-ally buff dispatch
- **WHEN** an ability with `targetType: 'SELF'`, `damageType: 'NONE'`, and `aoeRadius: 3` is executed
- **THEN** the ability's effects are applied to the actor and all friendly units within 3 hexes

### Requirement: In-Combat Ability Modifiers
The system SHALL support ephemeral `AbilityModifier` entries on combat units that enhance the range, blast radius, or damage of eligible subsequent abilities, consuming on use or automatically expiring at the end of the turn.

#### Scenario: Modifier enhances next matching ability
- **WHEN** a unit with an active `AbilityModifier` configured with `consumesOnUse: true` executes an eligible ability matching the allowed archetype
- **THEN** the ability resolves with the extra range and extra AoE radius applied
- **THEN** the modifier is cleared upon completion

#### Scenario: Modifier expires at turn end
- **WHEN** a unit with an active ephemeral `AbilityModifier` concludes their turn without executing a matching ability
- **THEN** the modifier is purged from the combat unit

### Requirement: Event-Driven Passive Trigger Dispatch
The system SHALL dispatch combat lifecycle events to registered passive handlers when specific triggers occur, including critical attack hits.

#### Scenario: On-crit trigger dispatch
- **WHEN** an attack roll resolves as `CRITICAL_HIT`
- **THEN** the combat engine dispatches an `ON_CRITICAL_HIT` event to the actor's passive handlers
- **THEN** any registered effect (such as `Wild Surge`) is resolved and appended to the combat events

### Requirement: Condition Combat Log Presentation and Feedback
The combat logging system SHALL render dedicated styled visual cards in the Combat Log panel for condition removal (`CONDITION_BROKEN`) and turn-start condition Damage-over-Time resolution (`DOT_DAMAGE`). The cards SHALL display appropriate condition glyphs (`👤`, `🔥`, `🧪`, `⚔️`, `💘`, `✨`), target affiliation styling, damage quantities, and remaining health vitals rather than unstyled generic fallback text. For `CONDITION_BROKEN` cards with `reason: 'source_defeated'`, the card SHALL render a cleared badge (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, or `✨ HENOSIS CLEARED`) and contextual note naming the defeated source rather than a challenge-defiance message.

#### Scenario: Stealth broken by damage log card
- **WHEN** a unit with an active `STEALTH` condition suffers direct attack damage or AoE splash damage that breaks stealth
- **THEN** the Combat Log renders a styled `CONDITION_BROKEN` card with a broken stealth badge (`👤 STEALTH BROKEN`), target affiliation styling, and context noting the loss of concealment

#### Scenario: Source-defeated condition cleared log card
- **WHEN** `CHALLENGED`, `CHARMED`, or `HENOSIS` is cleared because its `sourceUnitId` was defeated
- **THEN** the Combat Log renders a styled `CONDITION_BROKEN` card displaying the corresponding cleared badge (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, or `✨ HENOSIS CLEARED`) and a context note explaining that the source unit was defeated

#### Scenario: Turn-start Burn or Poison DoT damage log card
- **WHEN** an active unit suffers turn-start damage from an active `BURN` or `POISON` condition
- **THEN** the Combat Log renders a distinct `DOT_DAMAGE` card showing the condition icon (`🔥` for Burn, `🧪` for Poison), damage amount, and current/maximum target vitals

### Requirement: Source-Defeated Condition Cleanup
The system SHALL support a declarative `clearWhenSourceDefeated` flag on condition definitions (`CHALLENGED`, `CHARMED`, and `HENOSIS`). Whenever any combatant is defeated (via direct or splash damage, self-sacrifice HP cost, turn-start DoT damage, or delayed battlefield hazard detonation), the system SHALL immediately purge all active conditions on living combatants whose `sourceUnitId` matches the defeated unit and whose condition definition sets `clearWhenSourceDefeated: true`.

When a condition is purged due to source defeat:
- The system SHALL invoke the condition's `onRemoved` lifecycle hook (such as restoring a `CHARMED` unit's original base faction).
- The system SHALL NOT invoke natural-expiration follow-up transitions (`onExpireApplyCondition`), so severing `HENOSIS` upon caster defeat SHALL NOT inflict `MORTAL_EBB`.
- The system SHALL record a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` identifying the cleared condition and defeated source.

#### Scenario: Challenged clears when challenger is defeated
- **WHEN** Unit B holds an active `CHALLENGED` condition sourced from Unit A, and Unit A is defeated in combat
- **THEN** the `CHALLENGED` condition is immediately removed from Unit B
- **THEN** subsequent attacks by Unit B against any target no longer suffer `CHALLENGED` Disadvantage or trigger `EXPOSED`
- **THEN** a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` is recorded for Unit B

#### Scenario: Charmed clears and restores allegiance when charmer is defeated
- **WHEN** Unit B holds an active `CHARMED` condition sourced from Unit A (temporarily aligned to Unit A's faction), and Unit A is defeated
- **THEN** the `CHARMED` condition is immediately removed from Unit B
- **THEN** Unit B's active combat faction reverts to its original base faction via `onRemoved`
- **THEN** a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` is recorded for Unit B

#### Scenario: Henosis clears without Mortal Ebb when Theurge is defeated
- **WHEN** an ally holds an active `HENOSIS` condition sourced from a Theurge, and that Theurge is defeated
- **THEN** the `HENOSIS` condition is immediately removed from the ally
- **THEN** the ally does NOT receive the `MORTAL_EBB` follow-up condition
- **THEN** a `CONDITION_BROKEN` combat log entry with `reason: 'source_defeated'` is recorded for the ally

#### Scenario: Defeat via turn-start DoT or delayed hazard also clears source-bound conditions
- **WHEN** a challenger, charmer, or Theurge is defeated by turn-start `BURN`/`POISON` damage, self-sacrifice `hpCost`, or a delayed bombardment detonation
- **THEN** all `clearWhenSourceDefeated` conditions sourced from that unit are purged from living combatants
