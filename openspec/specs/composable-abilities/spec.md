# Composable Abilities Specification

## Purpose

Provides a composable atomic effect pipeline and declarative ability modifier engine that allows abilities to be composed of multiple distinct effects, modified dynamically in combat or permanently via overclocks, and clearly attributed in the UI.

## Requirements

### Requirement: Composable Ability Effects Pipeline
The combat engine SHALL model abilities as an execution envelope containing an array of atomic `AbilityEffect` objects rather than a single monolithic damage profile and secondary effect. Each effect SHALL declare its type, execution payload, optional `targetScope` (`'TARGET' | 'SELF' | 'ALLIES'`), optional `applyOn` trigger condition (`'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY'`), and optional to-hit modifiers including `grantsAdvantage`, `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty`.

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
