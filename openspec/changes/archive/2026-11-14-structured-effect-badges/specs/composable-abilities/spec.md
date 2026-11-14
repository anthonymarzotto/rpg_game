# Spec Delta

## ADDED Requirements

### Requirement: Structured Effect Execution Outcomes
The combat engine SHALL emit structured, typed semantic effect outcome records from atomic effect handlers, ability effect dispatch, passive triggers, and secondary splash/context evaluation rather than formatted bracketed strings (`logDetail`).

Each structured outcome SHALL classify the mechanical event by category (`CONDITION`, `FORCED_FACING`, `DISPLACEMENT`, `COLLISION`, `FALL`, `MODIFIER`, `INITIATIVE`, `COLLATERAL_HIT`, or `CONTEXT`) and carry machine-readable domain attributes (such as condition type, duration, damage-per-turn, destination coordinates, resistance/negation flags, collision obstacle/bystander damage and vitals, stat modifier deltas, CTB delta, or roll context values).

Combat log construction SHALL derive plain-text `message` strings from these structured effect outcomes for text-based exports and diagnostics while attaching the structured outcome array to combat log metadata for `ATTACK`, `UTILITY`, `BUFF`, and `PASSIVE` entries.

#### Scenario: Effect handler emits structured condition outcome instead of plain text
- **WHEN** an ability or passive applies a status condition such as `BURN`, `POISON`, `CHALLENGED`, `STEALTH`, or `EXPOSED`
- **THEN** the effect execution result SHALL include a structured `CONDITION` outcome recording the condition type, duration in turns, and damage-per-turn or source name where applicable
- **AND** no raw bracketed string `logDetail` SHALL be emitted

#### Scenario: Knockback collision and fall plunge emit structured collision and fall outcomes
- **WHEN** a `KNOCKBACK` or `RETREAT_STEP` effect triggers an obstacle, cliff, boundary, or bystander collision, or plunges off a ledge
- **THEN** the effect execution result SHALL include structured `DISPLACEMENT`, `COLLISION`, and/or `FALL` outcomes carrying collision type, damage dealt, bystander name/collateral damage/remaining HP, or fall negation status

#### Scenario: Secondary effect negated on Graze emits structured context outcome
- **WHEN** an attack with `applyOn: 'HIT_OR_CRIT'` secondary effects scores a `GRAZE` outcome
- **THEN** the effect dispatch result SHALL emit a structured `CONTEXT` outcome indicating secondary effects were negated on Graze

#### Scenario: AoE splash and attack roll context notes emit unified structured outcomes
- **WHEN** a damaging attack or area spell resolves with elevation modifiers, aura penalties, or secondary splash hits/misses (including cone-applied conditions)
- **THEN** the combat log entry SHALL record the elevation, aura, and per-target splash results (including target name, hit/graze/miss outcome, defense target, damage dealt, remaining HP, and applied splash conditions) in the same unified `effects` metadata list

#### Scenario: Plain-text combat log message preserves readable summary from structured outcomes
- **WHEN** a combat action or passive logs an entry containing structured `effects`
- **THEN** the entry's plain-text `message` SHALL include a readable summary formatted from those structured outcomes so Markdown trial diagnostic exports remain complete

## MODIFIED Requirements

### Requirement: Secondary Splash and Collateral Damage Labeling
The combat system SHALL support declarative secondary damage labeling across abilities and atomic combat events. Damaging abilities with an area-of-effect blast radius (`aoeRadius > 0`) SHALL support an optional declarative `splashLabel` property. When resolving secondary damage, the system SHALL emit `DAMAGE` events carrying a dedicated `CombatDamageReason` (`'SPLASH'` for blast splash, `'COLLATERAL'` for bystander collision and secondary sweeps) and an explicit presentation `label`. The combat system SHALL record all secondary splash damage targets, damage values, and remaining HP as structured outcomes in combat log metadata, and the floating combat text system SHALL display the event's designated presentation label.

#### Scenario: Arcane Blast splash emits custom BLAST label and records secondary log
- **WHEN** an actor executes `Arcane Blast` (configured with `aoeRadius: 1` and `splashLabel: 'BLAST'`) scoring a solid hit or critical hit on a primary target with adjacent living enemies
- **THEN** secondary enemies within 1 hex receive splash damage events with `reason: 'SPLASH'` and `label: 'BLAST'`
- **THEN** the floating combat text on secondary targets renders with prefix `BLAST! `
- **THEN** the action's combat log entry records structured `COLLATERAL_HIT` outcomes in `effects` capturing the secondary targets, damage amounts, and remaining vitals

#### Scenario: Area-of-effect ability without custom label defaults to SPLASH
- **WHEN** an ability with `aoeRadius > 0` that does NOT define `splashLabel` (such as a spell augmented by `Spell Sculpt`) deals secondary damage to adjacent units
- **THEN** secondary damage events are emitted with `reason: 'SPLASH'` and `label: 'SPLASH'`
- **THEN** the floating combat text on secondary targets renders with prefix `SPLASH! `
- **THEN** the combat log records structured `COLLATERAL_HIT` outcomes in `effects` labeled as `SPLASH`

#### Scenario: Cleave frontal sweep emits CLEAVE label
- **WHEN** an ability with a `CLEAVE` effect damages secondary units in the frontal arc
- **THEN** secondary damage events are emitted with `label: 'CLEAVE'`
- **THEN** the floating combat text on secondary targets renders with prefix `CLEAVE! `

#### Scenario: Knockback bystander collision emits COLLISION label
- **WHEN** a knocked-back unit collides with another unit, dealing collateral impact damage to the bystander
- **THEN** the collateral damage event is emitted with `reason: 'COLLATERAL'` and `label: 'COLLISION'`
- **THEN** the floating combat text on the bystander renders with prefix `COLLISION! `

#### Scenario: Wild Surge arcane discharge emits SURGE label
- **WHEN** a critical hit triggers a Wild Surge arcane discharge dealing magic damage to a random enemy
- **THEN** the surge damage event is emitted with `label: 'SURGE'`
- **THEN** the floating combat text on the struck enemy renders with prefix `SURGE! `

### Requirement: Non-Damaging Utility and Kinetic Feedback
The combat system SHALL support distinct utility classification and combat log metadata for non-damaging abilities (`damageType: 'NONE'`) that target hostile units, cause displacement, or inflict conditions. Single-target abilities declaring `targetType: 'SINGLE_TARGET'` SHALL strictly restrict valid targets to opposing-faction units regardless of whether their `damageType` is physical, magical, or none. Friendly supportive abilities targeting another unit SHALL declare `targetType: 'ALLY'`. When a non-damaging ability causes collision, collateral, or fall damage, the combat log SHALL record the damage amount, target vitals, and structured collision outcomes in `UTILITY` log metadata. The floating combat text system SHALL process damage, displacement, and status events across all ability resolution types, rendering appropriate visual floaters (`KNOCKBACK!`, `TELEPORT!`, `SLAM!`, `COLLISION!`, `RETREAT!`, or custom effect shout labels while honoring `null` suppression) on the battlefield.

#### Scenario: Gust knockback into obstacle emits displacement and wall slam floaters
- **WHEN** an actor executes `Gust` on an enemy and the knockback pushes the target into a wall or obstacle
- **THEN** a `DISPLACEMENT` event with `kind: 'KNOCKBACK'` and a `DAMAGE` event with `reason: 'COLLISION'` are dispatched
- **THEN** the floating combat text displays `KNOCKBACK!` at the collision hex and `SLAM! -X` on the target
- **THEN** the combat log entry is recorded with metadata `type: 'UTILITY'`, including `damageTotal`, `targetHp`, `targetMaxHp`, and structured `effects` documenting the collision

#### Scenario: Gust bystander impact emits collateral damage floater
- **WHEN** `Gust` knockback pushes an enemy into an occupied hex, colliding with a bystander unit
- **THEN** collateral damage is dealt to the bystander with `reason: 'COLLATERAL'` and `label: 'COLLISION'`
- **THEN** the floating combat text displays `COLLISION! -X` on the bystander
- **THEN** the combat log entry records structured collision outcomes capturing both target collision damage and bystander collateral damage

#### Scenario: Gust push into open terrain emits displacement without damage
- **WHEN** `Gust` pushes an enemy into an unoccupied walkable hex
- **THEN** a `DISPLACEMENT` event is dispatched and floating combat text displays `KNOCKBACK!` at the destination hex
- **THEN** no collision damage floater is displayed and the combat log records a `UTILITY` card with a structured `DISPLACEMENT` outcome in `effects` and 0 damage

#### Scenario: Teleportation ability emits teleport floater
- **WHEN** an actor executes `Shadow Step` or another non-damaging teleport ability without a custom shout override
- **THEN** a `DISPLACEMENT` event with `kind: 'TELEPORT'` is dispatched
- **THEN** floating combat text displays `TELEPORT!` at the destination hex

#### Scenario: Friendly non-damaging abilities remain classified as BUFF
- **WHEN** an actor executes a supportive or defensive non-damaging ability on an ally or self (such as `Minor Ward` or `Defensive Stance`)
- **THEN** the combat log records the entry with metadata `type: 'BUFF'` and a defensive shield glyph
- **AND** records structured `MODIFIER` or `CONDITION` outcomes in `effects`
- **THEN** positive stat modifiers and conditions float on the affected unit

#### Scenario: Skirmish retreat displacement emits RETREAT floater
- **WHEN** an actor executes `Skirmish` or an ability with retreat displacement moving away from an enemy
- **THEN** a `DISPLACEMENT` event with `kind: 'RETREAT'` is dispatched
- **THEN** floating combat text displays `RETREAT!` at the retreat destination hex rather than `KNOCKBACK!`

#### Scenario: Single-target hostile utility rejects friendly targets
- **WHEN** an actor selects a non-damaging `SINGLE_TARGET` ability (such as `Challenging Shout` or `Expose Weakness`) and attempts to target an allied unit of the same faction
- **THEN** ability validation fails and rejects the ally as an illegal target
