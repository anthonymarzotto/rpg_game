# Hybrid AI Profiles and Tactical Primer Heuristics Specification

## Purpose

Defines autonomous AI decision heuristics, behavioral archetype mappings, tactical primer coordination, and composite move-and-act evaluation for Tier 3 hybrid classes (Cavalier, Berserker, Highwayman, Warlock, Witch).

## Requirements

### Requirement: Hybrid AI Profile Resolution
The AI decision system SHALL resolve the authoritative `AIProfile` for any combat unit from its active class package: Cavalier to `BRAWLER`, Berserker to `BRAWLER`, Highwayman to `SKIRMISHER`, Warlock to `SNIPER`, and Witch to `SUPPORT`.

#### Scenario: Authoritative profile resolution from hybrid class packages
- **WHEN** an AI-controlled combatant has an active class package of Cavalier, Berserker, Highwayman, Warlock, or Witch
- **THEN** `resolveAIProfile` returns the package's declared profile (`BRAWLER`, `SKIRMISHER`, `SNIPER`, or `SUPPORT`)

### Requirement: Ally Buff and Tempo Evaluation
The AI decision system SHALL evaluate ally-targeted abilities (`targetType: 'ALLY'`) during turn decision scoring, assigning utility bonuses to CTB initiative boosts and speed modifiers (`Witch's Talisman`) when targeting allied combatants engaged in melee or lagging on the CTB initiative track. The AI SHALL assign zero utility to initiative-boosting effects if the allied target's initiative gauge is already at or near maximum (>= 80) or if the ally currently has an active positive speed modifier.

#### Scenario: Witch casts Witch's Talisman on frontline ally
- **WHEN** an active Witch unit has 1 AP and an allied combatant within range 2 engaged in melee with an enemy and lagging on initiative (< 80)
- **THEN** the AI evaluates `Witch's Talisman` with positive utility and prioritizes granting the ally CTB acceleration and speed

#### Scenario: Repetitive initiative boost suppressed on high-tempo ally
- **WHEN** an ally currently has an initiative gauge >= 80 or already has an active positive speed modifier
- **THEN** the AI assigns zero utility score to casting `Witch's Talisman` or initiative boosts on that ally

#### Scenario: Composite move-and-buff candidate generation
- **WHEN** an active support unit has sufficient AP (>= 2) and movement to reach an ally out of base ability range
- **THEN** the AI generates and scores composite move-then-buff candidate actions

### Requirement: Skirmisher Flank and Armor-Shred Coordination
The AI decision system SHALL prioritize using armor-reducing and CTB-delaying hold-up abilities (`Stand and Deliver!`) on high-armor enemies before executing follow-up physical attacks (`Point-Blank Buckshot`), and SHALL suppress casting `Stand and Deliver!` on the same target multiple times within the same turn.

#### Scenario: Highwayman shreds armor before follow-up attack
- **WHEN** an active Highwayman with 3 AP faces an enemy with positive Armor (> 0)
- **THEN** the AI selects `Stand and Deliver!` to strip target armor and delay their initiative gauge before spending subsequent AP on follow-up attacks

#### Scenario: Duplicate hold-up suppressed on already-primed target in same turn
- **WHEN** an active Highwayman has already executed `Stand and Deliver!` on an enemy during the current turn and retains remaining AP
- **THEN** the AI evaluates subsequent casts of `Stand and Deliver!` on that same enemy with zero primer bonus and zero utility score, directing remaining AP to follow-up attacks or alternative viable actions

#### Scenario: Skirmisher flank position seeking
- **WHEN** an active Highwayman has available movement AP and can flank an enemy
- **THEN** the AI move evaluation awards high utility bonus to repositioning into the target's Flank or Rear arc

### Requirement: Sniper Standoff and Knockback Spacing
The AI decision system SHALL direct `SNIPER` units equipped with ranged kinetic abilities (`Eldritch Blast`) to maintain standoff distance 2–3 and score knockback against approaching melee threats.

#### Scenario: Warlock repels adjacent enemy with Eldritch Blast
- **WHEN** an enemy is adjacent (range 1) to an active Warlock unit with 2 AP
- **THEN** the AI scores `Eldritch Blast` with high priority to deal damage and push the target 1 hex away into standoff range

#### Scenario: Warlock retreats to maintain preferred standoff distance
- **WHEN** a Warlock unit has movement AP and an enemy is within range 1
- **THEN** the AI prioritizes repositioning to standoff distance 2 before firing ranged spells

### Requirement: Sniper Melee Contingency Adaptation
The AI decision system SHALL direct `SNIPER` units engaged in close melee (distance 1) against high-armor targets to execute armor-bypassing melee strikes (`Pact Blade`) when displacement is blocked or unavailable.

#### Scenario: Warlock strikes armored target with Pact Blade
- **WHEN** a Warlock is adjacent to a target with high Armor where knockback is obstructed
- **THEN** the AI selects `Pact Blade` to bypass physical Armor rather than casting disadvantaged or blocked ranged spells

### Requirement: Brawler Shock Charge and Engagement Control
The AI decision system SHALL direct `BRAWLER` units equipped with rush charges (`Lance Charge`) or taunts (`Flamboyant Flourish`) to initiate straight-line shock engagements into enemy clusters and impose disadvantage on priority targets.

#### Scenario: Cavalier executes straight-line Lance Charge
- **WHEN** an active Cavalier has 2 AP and an enemy target in a clear straight line 2–3 hexes away
- **THEN** the AI selects `Lance Charge` to initiate combat, close distance, and push the target

#### Scenario: Cavalier taunts high-threat target
- **WHEN** a Cavalier is engaged in melee and has 1 AP remaining
- **THEN** the AI selects `Flamboyant Flourish` to inflict `CHALLENGED` on the enemy and boost self Evasion

### Requirement: Support Hex Sabotage and Facing Manipulation
The AI decision system SHALL direct `SUPPORT` units equipped with curses (`Baleful Hex`) and effigy manipulation (`Poppet Needle`) to debuff priority enemy targets and rotate melee enemies away from friendly lines.

#### Scenario: Witch executes Poppet Needle to force facing reversal
- **WHEN** an enemy combatant is threatening an ally and within range 1–3 of an active Witch
- **THEN** the AI scores `Poppet Needle` to inflict damage, shred Resolve, and rotate the target's facing 180° away from the front line

### Requirement: Declarative Ability AI Hints and Role Metadata
The combat ability contract SHALL support optional declarative AI metadata (`aiHint`) specifying tactical roles (`PRIMER`, `FINISHER`, `DISRUPTION`, `UTILITY`, `DEFENSIVE`) and combo sequencing parameters (required follow-up attack category, minimum combined AP threshold, bonus scoring weight).

#### Scenario: Ability declares primer metadata
- **WHEN** an ability definition declares `aiHint` with role `PRIMER` and follow-up prerequisites
- **THEN** downstream AI decision modules can inspect the metadata without inspecting ability identifiers or class packages

#### Scenario: Wildcard ability retains AI metadata across classes
- **WHEN** a unit equips an ability through a wildcard loadout slot
- **THEN** the ability's `aiHint` is retained and utilized identically by the actor's AI controller regardless of their active class package

### Requirement: Generic Primer Combo Evaluation
The AI decision system SHALL evaluate any ability declaring primer metadata by checking whether the actor has sufficient remaining AP and at least one valid, affordable follow-up ability that can target an enemy within range. When these conditions are satisfied, the AI SHALL award the declared primer utility bonus.

#### Scenario: Primer ability prioritized when follow-up attack is viable
- **WHEN** an AI-controlled actor has sufficient AP for both the primer ability and an in-range follow-up attack
- **THEN** the primer ability is scored with its bonus utility and prioritized for execution

#### Scenario: Primer ability penalized or zeroed when follow-up is unavailable
- **WHEN** an AI-controlled actor lacks the AP required for a follow-up attack or has no hostile targets in range of a follow-up
- **THEN** the primer ability does not receive the primer bonus score

### Requirement: Universal Modifier Non-Redundancy Guards
The AI decision system SHALL evaluate target active modifiers and active conditions before selecting abilities that apply stat debuffs, buffs, or conditions. The AI SHALL assign zero score to effects that attempt to re-apply an active modifier to a stat already modified in the same direction, attempt to inflict `CHALLENGED` on a target already challenged by the actor, or attempt to apply `STEALTH` to an actor that currently possesses an active `STEALTH` condition. Additionally, abilities with zero base damage and zero primary utility SHALL NOT receive auxiliary tactical positioning scores (focus-fire or standoff bonuses) that would cause them to clear the AP conservation threshold. Secondary kinetic utility (`CTB_DELAY`) on non-damaging abilities SHALL NOT bypass non-redundancy guards when targeting a foe that already has the negative stat modifier active from the same actor.

#### Scenario: Hostile attack-roll debuff not repeated on debuffed enemy
- **WHEN** an enemy combatant currently has an active negative attack-roll modifier
- **THEN** the AI assigns zero utility to abilities whose sole or primary hostile effect is an attack-roll penalty against that enemy

#### Scenario: Duplicate hold-up with CTB delay suppressed on shredded foe
- **WHEN** an enemy combatant currently has an active negative armor modifier applied by the actor
- **THEN** the AI assigns zero utility to re-casting non-damaging armor shred abilities (`Stand and Deliver!`) on that same target even if the ability contains a CTB delay component

#### Scenario: Challenging shout not repeated on already challenged target
- **WHEN** an enemy combatant currently has an active `CHALLENGED` condition where `sourceUnitId` matches the actor's ID
- **THEN** the AI assigns zero utility to abilities applying `CHALLENGED` against that enemy

#### Scenario: Allied defensive buff not repeated on buffed ally
- **WHEN** a friendly combatant currently has an active positive modifier on armor, ward, or evasion
- **THEN** the AI assigns zero utility to re-applying that same positive stat buff on that target

#### Scenario: Smoke Veil not repeated when already stealthed
- **WHEN** an AI-controlled actor currently has an active `STEALTH` condition
- **THEN** the AI assigns zero utility to `Smoke Veil` and any other ability whose primary effect is applying `STEALTH` to self

#### Scenario: Zero-damage zero-utility debuffs do not clear AP conservation
- **WHEN** an ability evaluates with zero damage and zero net utility against valid targets
- **THEN** auxiliary scores for focus-fire and standoff are zeroed
- **THEN** total action score remains below the AP conservation threshold (4.0), causing the actor to conserve remaining AP

### Requirement: Turn Execution Resilience and Action Validation Fallback
The AI decision and execution system SHALL validate candidate actions using authoritative engine rules (`canMove` for movement and `canExecuteAbility` for abilities) before execution, and SHALL evaluate ability affordability against effective AP costs (`getEffectiveAbility().apCost`). If an action fails validation or encounters an execution error during an AI turn, the system SHALL NOT throw an unhandled exception or abort the turn sequencer. Instead, the system SHALL record a diagnostic log entry, halt further action attempts for that turn, conserve remaining unspent AP for CTB recovery, and guarantee via a `try / finally` contract that `endActiveTurn` is executed so the CTB initiative clock advances to the next unit.

#### Scenario: AI action validation failure falls back to AP conservation cleanly
- **WHEN** an AI unit attempts an action that fails validation (such as insufficient AP, blocked path, or obstructed charge ray)
- **THEN** the action is aborted without throwing an unhandled exception
- **THEN** remaining AP is banked with standard CTB recovery (+20 gauge per AP) and the turn concludes cleanly

#### Scenario: AI turn sequencer guarantees endActiveTurn on unexpected error
- **WHEN** an unexpected runtime exception occurs during the execution of an AI turn
- **THEN** the turn sequencer catches the exception, logs diagnostic details, and executes `endActiveTurn` in its finally block to ensure the CTB clock advances

### Requirement: Consecutive Turn Reactivity
The combat simulation and turn sequencing interface SHALL support consecutive turns taken by the same AI unit. When an active unit conserves AP and wins the CTB clock again (remaining the active unit for the subsequent turn), the reactive interface SHALL trigger and sequence the new turn without stalling, tracking turn advancement through the encounter's turn number. State updates emitted during intermediate steps within a turn SHALL NOT cancel or re-trigger the ongoing turn execution.

#### Scenario: Support unit banks AP and immediately executes subsequent turn upon winning CTB clock
- **WHEN** an AI support unit banks AP and subsequently wins the CTB clock again for the next turn
- **THEN** the simulation interface detects the turn increment and executes the unit's subsequent turn with full 3 AP without freezing or requiring user intervention

#### Scenario: Action state updates mid-turn do not abort ongoing turn sequencer
- **WHEN** an AI unit resolves an action (such as Move or Strike) and dispatches combat log and floating text updates
- **THEN** the reactive turn effect remains stable and continues executing subsequent actions without aborting the turn

### Requirement: In-Game AI Action Fault Diagnostics
When an AI action fails validation or cannot be resolved, the combat logging and feedback system SHALL record a structured diagnostic entry in the combat log and surface visual feedback in the combat interface. The combat log entry SHALL document the actor, attempted action, validation failure reason, and fallback AP conservation. The combat interface SHALL render a styled amber diagnostic card (`⚠️ AI FAULT`) in the Combat Log panel and dispatch an amber floating combat text alert (`⚠️ Action Fault`) directly over the actor's arena hex.

#### Scenario: Failed action generates amber diagnostic card in combat log
- **WHEN** an AI action fails validation during an automated turn
- **THEN** a diagnostic entry is appended to the combat log detailing the actor name, attempted action, and failure reason
- **THEN** the Combat Log panel renders an amber-accented card highlighting the action fault

#### Scenario: Floating text alert appears over actor on action fault
- **WHEN** an AI action fails validation during an automated turn
- **THEN** an amber floating combat text reading `⚠️ Action Fault` appears over the actor's position on the arena grid

### Requirement: Offensive Ability Self-Buff and Melee Contingency Evaluation
The AI decision system SHALL evaluate offensive abilities that grant `targetScope: 'SELF'` stat modifiers or declare `meleeContingency` hints when scoring candidate actions against enemies. When an AI actor is engaged at distance 1, attacks that provide evasive buffs, displacement retreat, or declare `meleeContingency` (such as `Gallant Flourish`) SHALL receive priority utility scoring to disengage or protect the actor.

#### Scenario: Cornered Skirmisher executes Gallant Flourish in melee
- **WHEN** an AI Skirmisher is adjacent (distance 1) to an enemy and has 1 AP
- **THEN** the AI scores `Gallant Flourish` with defensive melee contingency utility, prioritizing the attack to deal rapier damage, gain +2 Evasion, and trigger a retreat step back to standoff range 2
