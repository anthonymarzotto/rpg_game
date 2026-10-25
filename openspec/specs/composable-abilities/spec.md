# Composable Abilities Specification

## Purpose

Provides a composable atomic effect pipeline and declarative ability modifier engine that allows abilities to be composed of multiple distinct effects, modified dynamically in combat or permanently via overclocks, and clearly attributed in the UI.

## Requirements

### Requirement: Composable Ability Effects Pipeline
The combat engine SHALL model abilities as an execution envelope containing an array of atomic `AbilityEffect` objects rather than a single monolithic damage profile and secondary effect. Each effect SHALL declare its type, execution payload, optional `targetScope` (`'TARGET' | 'SELF' | 'ALLIES'`), optional `applyOn` trigger condition (`'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY'`), optional tactical execution condition (`condition: 'FLANK_OR_REAR' | 'TARGET_CHALLENGED'`), optional `bonusDamage` dice profile evaluated when the condition is satisfied, and optional to-hit modifiers including `grantsAdvantage`, `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty`.

#### Scenario: Multi-effect execution on hit
- **WHEN** an ability with both a physical damage effect and a knockback effect scores a solid hit against an enemy
- **THEN** both the damage and the knockback displacement are dispatched and resolved against the target

#### Scenario: Unconditional self-buff executes regardless of hit outcome
- **WHEN** an ability declares an attack damage effect with `applyOn: 'HIT_OR_CRIT'` and an armor buff effect on self with `applyOn: 'ALWAYS'`
- **THEN** missing the attack roll negates the damage against the target while still applying the armor buff to the caster

#### Scenario: Secondary effects negated on graze
- **WHEN** an attack with `applyOn: 'HIT_OR_CRIT'` secondary effects (e.g. poison condition or knockback) scores a Graze outcome
- **THEN** the damage effect resolves at half value and all secondary effects are negated

#### Scenario: Ability effect imposes disadvantage on attack roll
- **WHEN** an attack ability effect specifies `grantsDisadvantage: true`
- **THEN** the attack roll evaluates with Disadvantage unless canceled by an Advantage source

#### Scenario: Tactical condition TARGET_CHALLENGED applies bonus damage
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that has an active `CHALLENGED` condition
- **THEN** the bonus damage dice are rolled and added to the attack's damage payload before armor/ward mitigation

#### Scenario: Tactical condition TARGET_CHALLENGED omitted when target is not challenged
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that does not possess `CHALLENGED`
- **THEN** the bonus damage dice are not rolled and only the baseline damage profile resolves

### Requirement: Universal Declarative Ability Modifiers
The combat engine SHALL provide an `AbilityModifier` contract that declarative patches can use to modify any property of an ability. Modifiers SHALL support numeric deltas (`apCost`, `range`, `aoeRadius`), property overrides (`archetypeTag`, `defenseTarget`, `attackModifierAttribute`, `targetType`), effect appends, and damage profile patches (die steps, die counts, flat damage). Modifiers SHALL support lifecycle scoping (`isPermanent`, `durationTurns`, `consumesOnUse`) and applicability filtering (`abilityIds`, `archetypeTags`, `damageTypes`).

#### Scenario: Primer modifies range and splash radius
- **WHEN** an in-combat modifier with `consumesOnUse: true` targeting Mage abilities specifies `range: +1` and `aoeRadius: +1`
- **THEN** any Mage spell evaluated while the modifier is active gains +1 range and a 1-hex splash radius

#### Scenario: Overclock patches damage die profile
- **WHEN** a permanent modifier targeting a specific ability applies a `diceStep: 1` patch to damage effects
- **THEN** the target ability's damage die upgrades by one die tier (e.g. 1d4 becomes 1d6) whenever evaluated

#### Scenario: Stance overrides attack attribute and defense target
- **WHEN** an active modifier overrides `attackModifierAttribute: 'focus'` and `defenseTarget: 'RESOLVE'`
- **THEN** the attack roll uses the unit's Focus attribute instead of Finesse and tests against the target's Resolve instead of Evasion

### Requirement: Effective Ability Resolution & Attributions
The engine SHALL evaluate an ability against a collection of active modifiers using a pure resolution function (`getEffectiveAbility`). The resulting `EffectiveAbility` SHALL retain all standard `Ability` properties while tracking a collection of `PropertyAttribution` records documenting every modified property, its source name, and a human-readable change label.

#### Scenario: Tracking attribution for modified properties
- **WHEN** an ability's range is modified by "Spell Sculpt" from 3 to 4
- **THEN** the resolved `EffectiveAbility` includes a range attribution recording `sourceName: "Spell Sculpt"` and `changeLabel: "+1 Range"`

#### Scenario: Ephemeral primer consumed on ability execution
- **WHEN** an ability modified by a modifier with `consumesOnUse: true` is executed in combat
- **THEN** the ability resolves with the modified stats and the consumed modifier is removed from the unit's active modifiers list

### Requirement: Combat UI Augment Indicators & Tooltips
The combat interface SHALL reflect active modifications on action bar buttons and in hover tooltips. Action buttons SHALL display an illuminated augment indicator when modified, and hover tooltips SHALL render inline attribution badges next to altered stats as well as an active augments summary.

#### Scenario: Action button indicates active modifications
- **WHEN** an active combat unit has modifiers affecting an ability on the action bar
- **THEN** the ability button displays a celestial augment glyph (`✦`) and reflects any discounted AP cost in emerald green

#### Scenario: Hover tooltip displays inline attribution and augment summary
- **WHEN** a player hovers over an ability with active modifications
- **THEN** the tooltip displays inline badges next to modified stats (e.g. `[✦ +1 Range from Spell Sculpt]`) and lists all active augment sources in a dedicated footer

### Requirement: Secondary Splash and Collateral Damage Labeling
The combat system SHALL support declarative secondary damage labeling across abilities and atomic combat events. Damaging abilities with an area-of-effect blast radius (`aoeRadius > 0`) SHALL support an optional declarative `splashLabel` property. When resolving secondary damage, the system SHALL emit `DAMAGE` events carrying a dedicated `CombatDamageReason` (`'SPLASH'` for blast splash, `'COLLATERAL'` for bystander collision and secondary sweeps) and an explicit presentation `label`. The combat system SHALL record all secondary splash damage targets, damage values, and remaining HP in combat log metadata, and the floating combat text system SHALL display the event's designated presentation label.

#### Scenario: Arcane Blast splash emits custom BLAST label and records secondary log
- **WHEN** an actor executes `Arcane Blast` (configured with `aoeRadius: 1` and `splashLabel: 'BLAST'`) scoring a solid hit or critical hit on a primary target with adjacent living enemies
- **THEN** secondary enemies within 1 hex receive splash damage events with `reason: 'SPLASH'` and `label: 'BLAST'`
- **THEN** the floating combat text on secondary targets renders with prefix `BLAST! `
- **THEN** the action's combat log entry records the secondary targets, damage amounts, and remaining vitals in `secondaryDetail`

#### Scenario: Area-of-effect ability without custom label defaults to SPLASH
- **WHEN** an ability with `aoeRadius > 0` that does NOT define `splashLabel` (such as a spell augmented by `Spell Sculpt`) deals secondary damage to adjacent units
- **THEN** secondary damage events are emitted with `reason: 'SPLASH'` and `label: 'SPLASH'`
- **THEN** the floating combat text on secondary targets renders with prefix `SPLASH! `
- **THEN** the combat log records the secondary targets under a `Splash hit` summary in `secondaryDetail`

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
The combat system SHALL support distinct utility classification and combat log metadata for non-damaging abilities (`damageType: 'NONE'`) that target hostile units, cause displacement, or inflict conditions. When a non-damaging ability causes collision, collateral, or fall damage, the combat log SHALL record the damage amount, target vitals, and collision detail in `UTILITY` log metadata. The floating combat text system SHALL process damage, displacement, and status events across all ability resolution types, rendering appropriate visual floaters (`KNOCKBACK!`, `TELEPORT!`, `SLAM!`, `COLLISION!`) on the battlefield.

#### Scenario: Gust knockback into obstacle emits displacement and wall slam floaters
- **WHEN** an actor executes `Gust` on an enemy and the knockback pushes the target into a wall or obstacle
- **THEN** a `DISPLACEMENT` event with `kind: 'KNOCKBACK'` and a `DAMAGE` event with `reason: 'COLLISION'` are dispatched
- **THEN** the floating combat text displays `KNOCKBACK!` at the collision hex and `SLAM! -X` on the target
- **THEN** the combat log entry is recorded with metadata `type: 'UTILITY'`, including `damageTotal`, `targetHp`, `targetMaxHp`, and `secondaryDetail` documenting the collision

#### Scenario: Gust bystander impact emits collateral damage floater
- **WHEN** `Gust` knockback pushes an enemy into an occupied hex, colliding with a bystander unit
- **THEN** collateral damage is dealt to the bystander with `reason: 'COLLATERAL'` and `label: 'COLLISION'`
- **THEN** the floating combat text displays `COLLISION! -X` on the bystander
- **THEN** the combat log entry notes both the target collision damage and the bystander collateral damage

#### Scenario: Gust push into open terrain emits displacement without damage
- **WHEN** `Gust` pushes an enemy into an unoccupied walkable hex
- **THEN** a `DISPLACEMENT` event is dispatched and floating combat text displays `KNOCKBACK!` at the destination hex
- **THEN** no collision damage floater is displayed and the combat log records a `UTILITY` card with displacement detail and 0 damage

#### Scenario: Teleportation ability emits teleport floater
- **WHEN** an actor executes `Shadow Step` or another non-damaging teleport ability
- **THEN** a `DISPLACEMENT` event with `kind: 'TELEPORT'` is dispatched
- **THEN** floating combat text displays `TELEPORT!` at the destination hex

#### Scenario: Friendly non-damaging abilities remain classified as BUFF
- **WHEN** an actor executes a supportive or defensive non-damaging ability on an ally or self (such as `Minor Ward` or `Defensive Stance`)
- **THEN** the combat log records the entry with metadata `type: 'BUFF'` and a defensive shield glyph
- **THEN** positive stat modifiers and conditions float on the affected unit

### Requirement: Ground-Targeted Damaging Abilities and Unified Blast Defense Contests
The combat engine SHALL support damaging abilities (`damageType !== 'NONE'`) declaring `targetType: 'HEX'`. When resolving a damaging hex-targeted ability, the player or AI SHALL be permitted to target any reachable walkable hex in the arena, regardless of whether that hex is occupied or unoccupied.
The attacker SHALL roll a single spellcast attack roll (`d20 + attackModifierAttribute`). The engine SHALL evaluate this attack roll against the individual defense (`defenseTarget`) of every unit located within the blast radius (`aoeRadius`) around the targeted hex (including both enemies and allies, excluding the attacker).
If a unit occupies the center targeted hex, it SHALL contest the attack roll for direct damage using the ability's primary `damageProfile` (eligible for Critical Hit, Solid Hit, Graze, or Miss).
All units located in surrounding hexes within `aoeRadius` SHALL contest the attack roll for secondary splash damage using the ability's declarative `splashDamageProfile` (or fallback base dice if undeclared). Surrounding units that are hit SHALL resolve as a solid hit (or graze), taking splash damage mitigated by their respective armor or ward; surrounding units whose defense exceeds the attack roll SHALL suffer a miss and take 0 damage.
If the center targeted hex is unoccupied, no direct damage event SHALL be emitted, and all units within the surrounding splash radius SHALL contest defense against the attack roll for splash damage.

#### Scenario: Direct hit on occupied center hex with adjacent secondary splash
- **WHEN** an actor executes `Arcane Blast` targeting an occupied hex containing Enemy A, with Enemy B adjacent within 1 hex
- **THEN** a single spellcast attack roll is rolled by the actor
- **THEN** the roll is compared against Enemy A's Resolve, dealing primary damage (`1d4 + Focus`) on a solid hit or critical hit
- **THEN** the roll is compared against Enemy B's Resolve, dealing splash damage (`1d4` flat) if the roll meets or exceeds Enemy B's Resolve, or 0 damage if it misses

#### Scenario: Ground targeting on an empty hex between two enemies
- **WHEN** an actor executes `Arcane Blast` targeting an unoccupied walkable hex adjacent to Enemy A and Enemy B
- **THEN** no direct damage is dealt to the center hex
- **THEN** Enemy A and Enemy B independently compare the spellcast attack roll against their respective Resolve
- **THEN** each enemy that fails the defense contest suffers splash damage (`1d4` flat mitigated by Ward), while any enemy whose Resolve exceeds the roll suffers a miss and takes 0 damage

#### Scenario: Friendly fire damages caught allies
- **WHEN** an ally is positioned within the blast radius of a damaging AoE attack executed by a teammate
- **THEN** the ally contests the spellcast attack roll against their own defense
- **THEN** if the attack roll meets or exceeds the ally's defense, the ally takes splash damage (or center damage if in the center hex) and a damage event is emitted

#### Scenario: High Resolve targets avoid splash damage on low spellcast rolls
- **WHEN** an actor rolls a total spellcast attack roll of 11 on a damaging AoE ability targeting a cluster containing a low-Resolve goblin (Resolve 10) and a high-Resolve golem (Resolve 16)
- **THEN** the goblin suffers splash damage
- **THEN** the golem suffers a miss and takes 0 damage

