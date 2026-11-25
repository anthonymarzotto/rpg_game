# Composable Abilities Specification

## Purpose

Provides a composable atomic effect pipeline and declarative ability modifier engine that allows abilities to be composed of multiple distinct effects, modified dynamically in combat or permanently via overclocks, and clearly attributed in the UI.

## Requirements

### Requirement: Composable Ability Effects Pipeline
The combat engine SHALL model abilities as an execution envelope containing an array of atomic `AbilityEffect` objects rather than a single monolithic damage profile and secondary effect. Each effect SHALL declare its type, execution payload, optional `targetScope` (`'TARGET' | 'SELF' | 'ALLIES'`), optional `applyOn` trigger condition (`'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY' | 'HIT_ONLY' | 'GRAZE_ONLY'`), optional tactical execution condition (`condition: 'FLANK_OR_REAR' | 'TARGET_CHALLENGED'`), optional `bonusDamage` dice profile evaluated when the condition is satisfied, and optional to-hit modifiers including `grantsAdvantage`, `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty`.

When a `CLEANSE` effect resolves against a target unit, the system SHALL purge all active negative status conditions (`POISON`, `BURN`, `EXPOSED`, `BLINDED`, `CHALLENGED`, `TELEMETRY`) from that unit while preserving `HENOSIS`, `MORTAL_EBB`, and `STEALTH`, emitting a structured outcome documenting the purged conditions.

Displacement effects that move a unit across grid tiles—including `KNOCKBACK`, `PULL`, and `RETREAT_STEP`—SHALL evaluate the elevation delta between origin and destination tiles. When displacement plunges off an elevated ledge ($\Delta h \le -2$), the system SHALL calculate raw fall impact damage ($|\Delta h| \times 4$) and resolve unmitigated fall damage against the displaced unit, dispatching a `DAMAGE` event with `reason: 'FALL'`. When a `PULL` effect resolves against a target at distance 2 or greater, the system SHALL step the target 1 hex along the line toward the actor (`getHexLine`) provided that destination hex is walkable, unoccupied, and does not exceed standard climb elevation ($\Delta h \le \text{maxClimbElevation}$), unless the target possesses displacement immunity. If a retreat step encounters an impassable elevation climb ($\Delta h > \text{maxClimbElevation}$) or an unwalkable obstacle, displacement SHALL be aborted unless the unit possesses a trait granting `canVaultOnRetreat`. Units with `canVaultOnRetreat` SHALL vault up onto the cliff top when the landing tile is walkable and unoccupied, or vault over an adjacent 1-hex obstacle onto the far-side hex if open.

#### Scenario: Multi-effect execution on hit
- **WHEN** an ability with both a physical damage effect and a knockback effect scores a solid hit against an enemy
- **THEN** both the damage and the knockback displacement are dispatched and resolved against the target

#### Scenario: Unconditional self-buff executes regardless of hit outcome
- **WHEN** an ability declares an attack damage effect with `applyOn: 'HIT_OR_CRIT'` and an armor buff effect on self with `applyOn: 'ALWAYS'`
- **THEN** missing the attack roll negates the damage against the target while still applying the armor buff to the caster

#### Scenario: Secondary effects negated on graze
- **WHEN** an attack with `applyOn: 'HIT_OR_CRIT'` secondary effects (e.g. poison condition or knockback) scores a Graze outcome
- **THEN** the damage effect resolves at half value and all secondary effects are negated

#### Scenario: Graze-only effect triggers exclusively on Graze outcome
- **WHEN** a contested ability declares an effect with `applyOn: 'GRAZE_ONLY'` (such as `Billet-Doux` applying `EXPOSED` on a Graze) and the roll results in a `GRAZE`
- **THEN** the `GRAZE_ONLY` effect is executed while `HIT_ONLY`, `HIT_OR_CRIT`, and `CRIT_ONLY` effects are skipped

#### Scenario: Cleanse effect purges negative status conditions while preserving Mortal Ebb
- **WHEN** an ability with a `CLEANSE` effect resolves on an allied unit afflicted with `POISON`, `EXPOSED`, and `MORTAL_EBB`
- **THEN** `POISON` and `EXPOSED` are removed from the unit
- **THEN** `MORTAL_EBB` remains on the unit

#### Scenario: Pull effect draws target 1 hex toward actor and evaluates fall damage
- **WHEN** an ability with a `PULL` effect (`magnitude: 1`) hits a target at distance 2 or 3 whose next step along the line toward the actor is walkable and unoccupied
- **THEN** the target is displaced 1 hex toward the actor and a `DISPLACEMENT` event with `kind: 'PULL'` is emitted
- **THEN** if the pulled step drops down a ledge with $\Delta h \le -2$, the target suffers Fall Impact Damage unless immune to fall damage

#### Scenario: Ability effect imposes disadvantage on attack roll
- **WHEN** an attack ability effect specifies `grantsDisadvantage: true`
- **THEN** the attack roll evaluates with Disadvantage unless canceled by an Advantage source

#### Scenario: Tactical condition TARGET_CHALLENGED applies bonus damage
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that has an active `CHALLENGED` condition
- **THEN** the bonus damage dice are rolled and added to the attack's damage payload before armor/ward mitigation

#### Scenario: Tactical condition TARGET_CHALLENGED omitted when target is not challenged
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that does not possess `CHALLENGED`
- **THEN** the bonus damage dice are not rolled and only the baseline damage profile resolves

#### Scenario: Retreat step down cliff ledge inflicts fall damage
- **WHEN** a unit on elevation 2 executes `Skirmish` or an ability with `RETREAT_STEP` and steps backward onto a tile at elevation 0 ($\Delta h = -2$)
- **THEN** the unit is displaced to the lower tile and suffers 8 direct Fall Impact Damage (`reason: 'FALL'`) unless protected by fall damage immunity

#### Scenario: Retreat step blocked by impassable cliff climb
- **WHEN** a unit without vaulting passives executes `Skirmish` with a retreat destination tile that is vertically higher than the actor's tile by more than `maxClimbElevation` ($\Delta h > 2$)
- **THEN** the retreat displacement is aborted and the unit remains on their starting tile

#### Scenario: Retreat step vaults up high cliff when unit has canVaultOnRetreat
- **WHEN** a unit possessing `canVaultOnRetreat` (e.g. equipped with `Feline Grace`) executes `Skirmish` with a retreat destination tile at $\Delta h = 3$ that is walkable and unoccupied
- **THEN** the unit vaults up onto the cliff top destination hex rather than being blocked

#### Scenario: Retreat step vaults over obstacle when unit has canVaultOnRetreat
- **WHEN** a unit possessing `canVaultOnRetreat` executes `Skirmish` with an adjacent unwalkable 1-hex obstacle in the retreat direction, and the far-side hex is walkable and unoccupied
- **THEN** the unit vaults over the obstacle to the far-side hex

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
The engine SHALL evaluate an ability against a collection of active modifiers using a pure resolution function (`getEffectiveAbility`). The resulting `EffectiveAbility` SHALL retain all standard `Ability` properties while tracking a collection of `PropertyAttribution` records documenting every modified property, its source name, its provenance tier (`'SHARD'` for socketed astral augment shards or `'TRIAL'` for in-combat primers and temporary modifiers), and a human-readable change label.

When `getEffectiveAbility` is invoked on an ability that already carries pre-resolved `attributions`, `appliedModifierIds`, or `attackRollBonus` (such as a combat ability hydrated with socketed shards via `resolveUnitLoadout`), it SHALL preserve all existing attributions, modifier IDs, and bonuses even when no additional in-combat modifiers apply (`applicable.length === 0`), and SHALL append new attributions when in-combat modifiers are layered on top. Any `AbilityEffect` appended or patched by a modifier SHALL record its provenance tier and source name so downstream formatters can highlight modified or injected effects.

#### Scenario: Tracking attribution for modified properties
- **WHEN** an ability's range is modified by "Spell Sculpt" from 3 to 4
- **THEN** the resolved `EffectiveAbility` includes a range attribution recording `sourceName: "Spell Sculpt"`, `tier: "TRIAL"`, and `changeLabel: "+1 Range"`

#### Scenario: Preserving pre-resolved shard attributions in combat when no in-trial modifiers are active (B.10)
- **WHEN** a unit enters combat with an ability augmented by a socketed shard (e.g. "Bloodbound Shard" or "Starlight Lens") and `getEffectiveAbility` is evaluated with an empty `abilityModifiers` list
- **THEN** the returned `EffectiveAbility` retains the shard's `attributions`, `appliedModifierIds`, and patched effect provenance rather than resetting `attributions` to an empty array

#### Scenario: Layering in-trial primer on top of pre-resolved shard ability
- **WHEN** an ability already augmented by a `'SHARD'` modifier (e.g. "Starlight Lens" upgrading `1d6 -> 1d8`) is evaluated with an active `'TRIAL'` modifier (e.g. "Blood Frenzy" upgrading `1d8 -> 1d10` and `+2 Attack Roll`)
- **THEN** the resolved `EffectiveAbility` preserves both the `'SHARD'` attribution and the `'TRIAL'` attribution, and resolves the property's display provenance tier to `'TRIAL'` according to `Normal -> Shard -> In-Trial` precedence

#### Scenario: Ephemeral primer consumed on ability execution
- **WHEN** an ability modified by a modifier with `consumesOnUse: true` is executed in combat
- **THEN** the ability resolves with the modified stats and the consumed modifier is removed from the unit's active modifiers list

### Requirement: Combat UI Augment Indicators & Tooltips
The combat interface SHALL reflect active modifications on action bar buttons and in hover tooltips using a unified Hybrid Ability Description model. Action buttons SHALL display an illuminated augment indicator (`✦`) whenever the ability has any `'SHARD'` or `'TRIAL'` attributions, and SHALL color-code altered costs and stats using the 3-tier precedence `Normal -> Shard -> In-Trial`.

Hover tooltips on the Action Bar SHALL render:
1. **Thematic Flavor Line**: The ability's concise, number-free thematic `description`.
2. **Scannable Stat Strip Pills**: Structured pills for Reach/Area (e.g., `Melee 1`, `Range 3 • Blast 1`, `Cone 2`, `Self`), Defense Contest (e.g., `+FIN vs EVA`, `+FOC vs RES`), Primary/Splash Damage (e.g., `1d6 + FRC Physical`, `1d4 Splash`), and any HP sacrifice cost, with each pill colored by its highest active provenance tier (`NORMAL`, `SHARD`, or `TRIAL`).
3. **Generated Effect Clauses**: Human-readable descriptions for every non-primary `AbilityEffect` and conditional damage bonus (never raw enum dumps such as `SINGLE_TARGET` or `Effect: STAT_MODIFIER (Mag: 2)`), colored by provenance tier when injected or modified by a shard or in-trial modifier.
4. **Active Augments Footer**: An itemized summary of all active `'SHARD'` and `'TRIAL'` augment sources and their change labels.

#### Scenario: Action button indicates active modifications
- **WHEN** an active combat unit has shard augments or in-trial modifiers affecting an ability on the action bar
- **THEN** the ability button displays a celestial augment glyph (`✦`) and highlights any modified AP or HP cost in the corresponding provenance tier color

#### Scenario: Hover tooltip displays inline attribution and augment summary
- **WHEN** a player hovers over an ability on the action bar
- **THEN** the tooltip displays the flavor sentence, scannable stat strip pills, human-readable effect clauses for all secondary/utility effects, and the active augments summary footer without exposing raw internal enum strings

#### Scenario: Provenance color precedence highlights Normal vs Shard vs In-Trial changes
- **WHEN** an ability has stats or effects modified by a socketed shard and/or an in-combat primer
- **THEN** untouched stats/effects render in normal styling, shard-modified stats/effects render in Shard styling, and stats/effects modified by an in-combat primer (even if also modified by a shard) render in In-Trial styling

### Requirement: Deterministic Ability Description & Effect Clause Formatting
The system SHALL provide a deterministic formatting engine that converts any `Ability` or `EffectiveAbility` into structured Stat Strip pills, human-readable Effect Clauses covering all `AbilityEffectType` variants, and a Compact Mechanical 1-Liner. Authored `Ability.description` strings across all Novice and Class packages SHALL contain pure thematic flavor prose without hardcoded dice counts, damage numbers, ranges, or stat deltas that could contradict modified values.

#### Scenario: Formatting stat modifier and condition effects into readable clauses
- **WHEN** an ability contains `STAT_MODIFIER` (e.g., `{ armor: -2, evasion: -2 }` for 2 turns) or `CONDITION` (e.g., `BURN` with `magnitude: 2`, `durationTurns: 2`)
- **THEN** the formatter produces human-readable effect clauses (e.g., `On Hit: Inflicts -2 Armor, -2 Evasion (2 turns)` and `On Hit: Inflicts Burn (2 dmg/turn, 2 turns)`) rather than raw enum/magnitude labels

#### Scenario: Formatting conditional bonus damage and special movement effects
- **WHEN** an ability contains conditional bonus damage (`FLANK_OR_REAR` or `TARGET_CHALLENGED`) or movement/stance effects (`RUSH_CHARGE`, `PENETRATE_STEP`, `RETREAT_STEP`, `TELEPORT`, `POSITION_SWAP`, `AERIAL_VAULT`, `LINE_PIERCE`, `BASTION_STANCE`)
- **THEN** the formatter produces clear tactical clauses describing the trigger condition, bonus dice/attack bonus, and movement or stance behavior

#### Scenario: Generating compact mechanical 1-liner
- **WHEN** the formatter generates a compact 1-liner for an ability
- **THEN** it produces a concise single-line summary combining reach/area, primary damage or defense contest, and key secondary effect keywords reflecting any active shard or in-trial modifications

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

### Requirement: Declarative Effect Shout Customization and Guardrails
The combat system SHALL support declarative floating combat text ("shout") customization directly on `AbilityEffect` definitions and carry resolved shout labels onto emitted `CombatEvent` payloads.
Each `AbilityEffect` SHALL support an optional `shout` property accepting:
- a custom display string (e.g., `'INTERCEPT!'`, `'VAULT!'`) to override the default floater text,
- `null` to explicitly suppress any floating combat text for that effect,
- an actor/target pair (`{ actor?: string | null; target?: string | null }`) for multi-unit effects such as `POSITION_SWAP`, or
- `undefined` to inherit the effect/displacement kind's default behavior.

For `DISPLACEMENT` events, the floating combat text resolver SHALL consult an exhaustive mapping over `DisplacementKind` (`KNOCKBACK`, `RETREAT`, `PULL`, `TELEPORT`, `CHARGE`, `SWAP`) without a catch-all `'KNOCKBACK!'` fallback:
- `CHARGE` SHALL default to silent (`null`),
- `SWAP` SHALL default to `'SWAP!'` on the acting unit and silent (`null`) on the swapped target unit, and
- `KNOCKBACK`, `RETREAT`, `TELEPORT`, and `PULL` SHALL default to `'KNOCKBACK!'`, `'RETREAT!'`, `'TELEPORT!'`, and `'PULL!'` respectively unless overridden or suppressed via `shout`.

All registered class and novice abilities using customizable or non-obvious movement/tempo effects (`POSITION_SWAP`, `PENETRATE_STEP`, `AERIAL_VAULT`, `RUSH_CHARGE`, `TELEPORT`, `CTB_DELAY`) SHALL be validated by catalog tests to declare an explicit `shout` configuration (custom label, `{ actor, target }` config, or `null` for silent) so future ability authors cannot omit shout intent.

#### Scenario: Ride-Through penetration displacement remains silent (B.17)
- **WHEN** a unit executes `Ride-Through` (`PENETRATE_STEP` configured with `shout: null`) and advances through the target to the rear hex
- **THEN** a `DISPLACEMENT` event with `kind: 'CHARGE'` and `label: null` is emitted
- **THEN** no `"KNOCKBACK!"` or other displacement shout floater is displayed over the Cavalier

#### Scenario: Intercept Step shouts INTERCEPT! on the Shield-bearer only (B.18)
- **WHEN** a Shield-bearer executes `Intercept Step` (`POSITION_SWAP` configured with `shout: { actor: 'INTERCEPT!', target: null }`) on an allied unit
- **THEN** the Shield-bearer's `DISPLACEMENT` event carries `label: 'INTERCEPT!'` and displays `"INTERCEPT!"` at the Shield-bearer's destination hex
- **THEN** the rescued ally's `DISPLACEMENT` event carries `label: null` and emits no displacement shout, showing only the `+2 ARMOR` buff floater

#### Scenario: Lance Charge keeps actor rush silent and target knockback loud
- **WHEN** a Cavalier executes `Lance Charge` (`RUSH_CHARGE` with `shout: null` and `KNOCKBACK` with default/explicit `'KNOCKBACK!'`) and hits an enemy
- **THEN** the Cavalier's rush `DISPLACEMENT` (`kind: 'CHARGE'`) emits no displacement floater
- **THEN** the enemy's knockback `DISPLACEMENT` (`kind: 'KNOCKBACK'`) displays `"KNOCKBACK!"` at the target's pushed hex

#### Scenario: Custom teleport or tempo effect shout overrides default
- **WHEN** an ability configures `TELEPORT` with `shout: 'VAULT!'` (such as `Rooftop Vault`) or `CTB_DELAY` with a custom shout string
- **THEN** the emitted `CombatEvent` carries `label: 'VAULT!'` (or the configured string)
- **THEN** the battlefield floating combat text renders the configured custom shout instead of the generic default

#### Scenario: Catalog invariant rejects unconfigured customizable effects
- **WHEN** a registered class or novice ability declares `POSITION_SWAP`, `PENETRATE_STEP`, `AERIAL_VAULT`, `RUSH_CHARGE`, `TELEPORT`, or `CTB_DELAY` without an explicit `shout` property
- **THEN** the package catalog verification test suite fails with a descriptive error naming the ability and effect type

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

### Requirement: Ground-Targeted Damaging Abilities and Unified Blast Defense Contests
The combat engine SHALL support damaging abilities (`damageType !== 'NONE'`) declaring `targetType: 'HEX'`. When resolving a damaging hex-targeted ability, the player or AI SHALL be permitted to target any reachable walkable hex in the arena, regardless of whether that hex is occupied or unoccupied.
The attacker SHALL roll a single spellcast attack roll (`d20 + attackModifierAttribute`). The engine SHALL evaluate this attack roll against the individual defense (`defenseTarget`) of every unit located within the blast radius (`aoeRadius`) around the targeted hex (including both enemies and allies, excluding the attacker), **except** when the attacker possesses a passive granting `excludeFriendlyAoE: true`, in which case all friendly units in the blast radius (including an ally occupying the center targeted hex) SHALL be spared from defense contests, damage, and negative conditions.
If an eligible (non-spared) unit occupies the center targeted hex, it SHALL contest the attack roll for direct damage using the ability's primary `damageProfile` (eligible for Critical Hit, Solid Hit, Graze, or Miss).
All other eligible (non-spared) units located in surrounding hexes within `aoeRadius` SHALL contest the attack roll for secondary splash damage using the ability's declarative `splashDamageProfile` (or fallback base dice if undeclared). Surrounding units that are hit SHALL resolve as a solid hit (or graze), taking splash damage mitigated by their respective armor or ward; surrounding units whose defense exceeds the attack roll SHALL suffer a miss and take 0 damage.
If the center targeted hex is unoccupied (or occupied by a friendly unit spared via `excludeFriendlyAoE`), no direct damage event SHALL be emitted against the center hex, the combat log and card SHALL omit direct damage breakdowns and attack roll chips against the center hex (`0 (Ground)`), and all eligible units within the surrounding splash radius SHALL contest defense against the attack roll for splash damage.

#### Scenario: Direct hit on occupied center hex with adjacent secondary splash
- **WHEN** an actor executes `Arcane Blast` targeting an occupied hex containing Enemy A, with Enemy B adjacent within 1 hex
- **THEN** a single spellcast attack roll is rolled by the actor
- **THEN** the roll is compared against Enemy A's Resolve, dealing primary damage (`1d4 + Focus`) on a solid hit or critical hit
- **THEN** the roll is compared against Enemy B's Resolve, dealing splash damage (`1d4` flat) if the roll meets or exceeds Enemy B's Resolve, or 0 damage if it misses

#### Scenario: Ground targeting on an empty hex between two enemies
- **WHEN** an actor executes `Arcane Blast` targeting an unoccupied walkable hex adjacent to Enemy A and Enemy B
- **THEN** no direct damage is dealt to the center hex, and combat log entries do not report `0 (Ground)` damage or an attack roll chip against the ground
- **THEN** Enemy A and Enemy B independently compare the spellcast attack roll against their respective Resolve
- **THEN** each enemy that fails the defense contest suffers splash damage (`1d4` flat mitigated by Ward), while any enemy whose Resolve exceeds the roll suffers a miss and takes 0 damage

#### Scenario: Friendly fire damages caught allies
- **WHEN** an ally is positioned within the blast radius of a damaging AoE attack executed by a teammate who does not possess `excludeFriendlyAoE`
- **THEN** the ally contests the spellcast attack roll against their own defense
- **THEN** if the attack roll meets or exceeds the ally's defense, the ally takes splash damage (or center damage if in the center hex) and a damage event is emitted

#### Scenario: Passive excludeFriendlyAoE spares allies on center and surrounding blast hexes
- **WHEN** an actor possessing a passive with `excludeFriendlyAoE: true` (such as `Exclusion Matrix`) executes a damaging AoE ability (such as `Arcane Blast`, `Refractive Array`, or `Siege Barrage`) overlapping or centered on an allied unit
- **THEN** the allied unit is spared from defense contests, damage, and negative conditions
- **THEN** hostile units within the blast area resolve normally

#### Scenario: High Resolve targets avoid splash damage on low spellcast rolls
- **WHEN** an actor rolls a total spellcast attack roll of 11 on a damaging AoE ability targeting a cluster containing a low-Resolve goblin (Resolve 10) and a high-Resolve golem (Resolve 16)
- **THEN** the goblin suffers splash damage
- **THEN** the golem suffers a miss and takes 0 damage

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

### Requirement: Ally-Transparent Magical Line of Sight and Geometric Formula Effects
The combat engine SHALL support declarative passive flag `ignoresAllyLoS?: boolean`, allowing magical abilities (`damageType === 'MAGICAL'` or `archetypeTag === 'MAGE'`) to ignore intermediate friendly units during 3D Line-of-Sight raycasting across validation, target preview, and AI evaluation.
The composable ability pipeline SHALL additionally support atomic effect types `'ALLY_REFRACTION'` (redirecting conserved strikes from spared allies inside an AoE blast round-robin across lowest-HP living enemies in the blast using the unified spellcast roll) and `'DISTRIBUTIVE_PROOF'` (branching between isolated `EXPOSED` setup and clustered adjacent `1d4` magical splash), with deterministic human-readable formatter clauses and structured combat log outcomes.

#### Scenario: Formatter renders readable clauses for LOWER_DEFENSE, ALLY_REFRACTION, and DISTRIBUTIVE_PROOF
- **WHEN** the ability formatter formats `Refractive Array`, `Adaptive Formula`, or `Distributive Proof`
- **THEN** it produces human-readable stat strip pills and effect clauses (such as `+FOC vs Lower (EVA/RES)`, ally refraction redirect rules, and isolated vs clustered equations) without exposing raw internal enum strings

### Requirement: Explicit Effect Execution Timing Lifecycle
The combat engine SHALL support an explicit execution timing phase on each `AbilityEffect` (`timing?: 'PRE_ACTION' | 'ON_RESOLVE' | 'POST_ACTION'`, defaulting to `'ON_RESOLVE'`).

During ability execution, the engine SHALL resolve effects in strict lifecycle phase order:
1. **`PRE_ACTION`**: Pre-roll positioning or setup effects executed before the attack roll (e.g. `RUSH_CHARGE`, `AERIAL_VAULT`).
2. **Attack Roll & Damage**: Primary attack roll, primary damage, and AoE/cone defense contests and damage.
3. **`ON_RESOLVE`**: Standard primary/secondary effects evaluated against each hit target (respecting `applyOn` and Graze negation) and once-per-action `SELF`-scoped `ON_RESOLVE` effects.
4. **Event Application & Hit-Reaction Facing**: Commit damage, displacements, and statuses to combat state, then update surviving hit targets' facing toward the attack origin (or away when `FORCE_FACING_AWAY` is present).
5. **Post-Action Condition Hooks (`onAfterAction`)**: On contested attack actions, evaluate pre-existing active conditions on the actor (such as breaking pre-existing `STEALTH` on attack or applying `EXPOSED` for defying `CHALLENGED`).
6. **`POST_ACTION`**: Execute and commit all effects declaring `timing: 'POST_ACTION'` after `onAfterAction` cleanup completes on contested attacks, and after `ON_RESOLVE` completes on non-attack utilities/buffs, teleports, and battlefield zone abilities (`DELAYED_BOMBARDMENT`, `SHRAPNEL_RUBBLE`).

`Shadow Shard` SHALL declare `timing: 'POST_ACTION'` on its self-targeted `STEALTH` effect. The deterministic ability description formatter SHALL render `POST_ACTION` effects with an explicit `After Action` trigger label.

#### Scenario: Shadow Shard on an attack grants Stealth after the attack completes
- **WHEN** a unit executes `Sneak Attack` augmented with `Shadow Shard` against an enemy
- **THEN** the attack roll does not receive Stealth Advantage from `Shadow Shard`
- **THEN** any pre-existing `STEALTH` on the actor is broken during `onAfterAction`
- **THEN** `Shadow Shard`'s `POST_ACTION` effect executes afterward and leaves the actor with active `STEALTH` for 1 turn

#### Scenario: Two-shard combo pairs Recoil Shard with Shadow Shard to disengage into Stealth
- **WHEN** a unit executes `Sneak Attack` augmented with both `Recoil Shard` (`ON_RESOLVE`) and `Shadow Shard` (`POST_ACTION`) and scores a solid hit against an adjacent enemy
- **THEN** `Recoil Shard` steps the actor 1 hex away from the target (to distance 2) during `ON_RESOLVE`
- **THEN** hit-reaction facing turns the target toward the attack origin
- **THEN** `Shadow Shard` grants `STEALTH` during `POST_ACTION` while the actor is at distance 2 (outside the victim's distance-1 front-arc detection)

#### Scenario: Post-action self-buff executes on battlefield zone abilities
- **WHEN** a unit executes `Siege Barrage` (`DELAYED_BOMBARDMENT`) or `Shrapnel Canister` (`SHRAPNEL_RUBBLE`) augmented with `Shadow Shard`, `Bastion Shard`, or `Anchorite Shard`
- **THEN** the bombardment zone or shrapnel rubble is placed on the arena
- **THEN** the actor immediately receives the shard's `POST_ACTION` or unconditional `SELF` buff on the launch turn

#### Scenario: Formatter displays After Action label for POST_ACTION effects
- **WHEN** the ability formatter formats an ability augmented with `Shadow Shard` (`timing: 'POST_ACTION'`)
- **THEN** the generated effect clause renders with trigger label `After Action` (e.g., `After Action: Grants Stealth to self (1 turn)`)

### Requirement: Multi-Target AoE, Cone & Delayed Bombardment Shard Delivery
When an ability resolves against multiple units via AoE blast (`aoeRadius >= 1`), directional Cone (`coneTemplate: true`), or delayed bombardment detonation (`DELAYED_BOMBARDMENT`), the combat engine SHALL deliver all target-scoped `ON_RESOLVE` effects (including socketed hostile shard infusions such as `POISON`, `BURN`, `KNOCKBACK`, `SLOW`, `CTB_DELAY`, `STAT_MODIFIER`, `CONDITION`, and `FORCE_FACING`) to every eligible hit unit individually, respecting each unit's own `HitOutcome` (`SOLID_HIT` / `CRITICAL_HIT` apply `HIT_OR_CRIT` effects; `GRAZE` negates secondary non-damage effects; `MISS` applies none).

`SELF`-scoped `ON_RESOLVE` effects (such as `Aegis Shard`, `Warding Shard`, `Flourish Shard`, `Carapace Shard`, `Fury Shard`'s self-Evasion penalty, or `Hold-Up Shard`'s self-CTB boost) SHALL execute at most once per ability action (triggering for `HIT_OR_CRIT` whenever at least one target scores a Solid Hit or Critical Hit) and SHALL NEVER be applied to enemy targets inside an AoE or Cone loop.

Declarative damage patches (`diceStep`, `diceCount`, `flatDamage`) SHALL patch `DELAYED_BOMBARDMENT` effects in addition to `DAMAGE` effects. When launching a `DELAYED_BOMBARDMENT`, the pending bombardment record SHALL snapshot effective shard overrides (`damageType`, `defenseTarget`, `attackRollBonus`, `flatDamage`, `CRIT_BOOST`) and hostile target-scoped `ON_RESOLVE` effects so they resolve against every hit unit upon detonation.

Displacement handlers for `RETREAT_STEP` and `PENETRATE_STEP` SHALL normalize their displacement direction vector to a single 1-hex step along the hex direction between actor and target so ranged attacks (such as ranged `Recoil Shard` / `Buckshot Shard`) and range-extended melee attacks (such as `Astral Reach` + `Trample Shard`) always step by 1 hex rather than the full actor-to-target distance.

#### Scenario: Venom Shard on Arcane Blast poisons every hit enemy in the blast
- **WHEN** a unit executes `Arcane Blast` augmented with `Venom Shard` targeting an empty hex adjacent to Enemy A (Solid Hit), Enemy B (Graze), and Enemy C (Miss)
- **THEN** Enemy A takes splash damage and receives `POISON` for 2 turns
- **THEN** Enemy B takes grazed splash damage and does not receive `POISON`
- **THEN** Enemy C takes 0 damage and does not receive `POISON`

#### Scenario: Shadow Shard on Wyrmflame Breath cloaks only the caster and never enemies
- **WHEN** a Dragoon executes `Wyrmflame Breath` augmented with `Shadow Shard` hitting two enemies in the forward cone
- **THEN** neither enemy receives `STEALTH`
- **THEN** the Dragoon receives `STEALTH` after the attack resolves

#### Scenario: Self-scoped on-hit shard triggers once on multi-target AoE hit
- **WHEN** a unit executes `Arcane Blast` augmented with `Hold-Up Shard` or `Aegis Shard` and hits two enemies in the blast
- **THEN** both hit enemies suffer `CTB_DELAY` (for `Hold-Up Shard`)
- **THEN** the caster receives the self-scoped bonus (`+10` CTB or `+1 Armor`) exactly once for the action

#### Scenario: Siege Barrage carries Power, Aether, and hostile infusion shards to detonation
- **WHEN** a Ballistician launches `Siege Barrage` augmented with `Force Shard` (`+2` flat damage) and `Pyre Shard` (Burn on hit/crit), and Enemy A is hit when the bombardment detonates next turn
- **THEN** Enemy A takes the patched bombardment damage including `+2` flat damage
- **THEN** Enemy A receives `BURN` (2 dmg/turn, 2 turns) upon detonation

#### Scenario: Ranged attack with Recoil Shard steps back exactly 1 hex
- **WHEN** an actor executes a range-3 single-target attack (such as `Throw Dart` or `Sighting Bolt`) augmented with `Recoil Shard` against an enemy 3 hexes away and scores a Solid Hit
- **THEN** the actor steps back exactly 1 hex away from the target along the normalized direction vector rather than jumping 3 hexes

### Requirement: Metadata-Driven Effect Lifecycle Phases and Unified Event Application
The combat engine SHALL classify every effect type through centralized declarative metadata defining its default execution phase (`PRE_ACTION`, `ON_RESOLVE`, or `POST_ACTION`), execution role (roll modifier, primary damage, geometric dispatch, zone deployment, or standard resolution), targeting semantics, and whether it supports target-scoped resolution delivery.

During ability execution:
1. Effects whose resolved phase is `PRE_ACTION` (including `RUSH_CHARGE` and `AERIAL_VAULT`, or any effect explicitly declaring `timing: 'PRE_ACTION'`) SHALL execute exclusively before the attack roll and SHALL NOT be dispatched during `ON_RESOLVE` or `POST_ACTION`.
2. Self-scoped effects SHALL be identified consistently across direct ability resolution and delayed bombardment detonation from declared `targetScope: 'SELF'` data (including `Smoke Veil`) and shared metadata helpers rather than hard-coded per-condition or per-effect checks.
3. Actor-displacing effects that reference the primary target coordinate (such as `RETREAT_STEP`) SHALL execute at most once per action against the primary target rather than repeating for every splash hit in a multi-target action.
4. Post-action condition hooks (`onAfterAction`, such as breaking pre-existing `STEALTH` on attack or applying `EXPOSED` when defying `CHALLENGED`) SHALL run after event application on contested attack actions and before `POST_ACTION` effects. Non-attack buffs, teleports, and battlefield zone launches SHALL execute `ON_RESOLVE` effects strictly before `POST_ACTION` effects without invoking attack-only `onAfterAction` hooks.
5. Direct ability execution and delayed bombardment detonation SHALL share a single combat event application pipeline so all damage (including collision, fall, and infusion damage) invokes `onTakeDamage` condition reactions (such as breaking `STEALTH`), swap displacements, and defeat cleanup identically.
6. Multi-target `ON_RESOLVE` resolution SHALL apply damage and displacement events sequentially per target through the shared event application pipeline rather than mutating arena coordinates early and re-applying them later, ensuring units defeated by primary or splash damage are removed from the arena before subsequent knockbacks resolve occupancy.

#### Scenario: PRE_ACTION effects never leak into ON_RESOLVE or POST_ACTION
- **WHEN** an ability declares an effect with `timing: 'PRE_ACTION'` (or a pre-roll positioning effect such as `RUSH_CHARGE` or `AERIAL_VAULT`) alongside `ON_RESOLVE` and `POST_ACTION` effects
- **THEN** the `PRE_ACTION` effect is excluded from both `ON_RESOLVE` and `POST_ACTION` dispatch passes

#### Scenario: Zone launch executes ON_RESOLVE self-buffs strictly before POST_ACTION effects
- **WHEN** a unit executes `Siege Barrage` or `Shrapnel Canister` augmented with both an `ON_RESOLVE` unconditional self-buff (`Bastion Shard`) and a `POST_ACTION` self-buff (`Shadow Shard`) regardless of socket order
- **THEN** the `ON_RESOLVE` self-buff executes and commits before the `POST_ACTION` self-buff

#### Scenario: Bombardment infusion collision damage breaks Stealth via shared event application
- **WHEN** a Stealthed enemy takes collision or fall damage triggered by an `Impact Shard` infusion on a detonating `Siege Barrage`
- **THEN** the shared event application pipeline invokes `onTakeDamage` hooks and breaks the victim's `STEALTH`

#### Scenario: Defeated splash victim does not block a subsequent AoE knockback
- **WHEN** an `Arcane Blast` augmented with `Impact Shard` deals lethal splash damage to Enemy A standing directly behind Enemy B, and Enemy B survives and is knocked back into Enemy A's hex
- **THEN** Enemy A's defeat removes them from the arena before Enemy B's knockback calculates occupancy
- **THEN** Enemy B is displaced cleanly into the vacated hex without colliding with the already-defeated Enemy A

#### Scenario: Non-attack utility preserves Stealth while still running POST_ACTION effects
- **WHEN** a Stealthed unit executes a non-attack utility or teleport (such as `Shadow Step` or `Smoke Veil`)
- **THEN** attack-only `onAfterAction` hooks do not strip `STEALTH`
- **THEN** any `POST_ACTION` shard effect still executes after `ON_RESOLVE`

### Requirement: Snapshotted Origin for Delayed Bombardment Displacements
When a `DELAYED_BOMBARDMENT` ability is launched, the pending bombardment record SHALL snapshot the launcher's hex coordinate at launch time. When the bombardment detonates on a later turn, target-scoped displacement infusions (such as `Impact Shard` or `Repelling Shard`) SHALL compute push direction away from the snapshotted launch coordinate rather than querying the launcher's live arena position.

#### Scenario: Siege Barrage with Impact Shard pushes from launch position after launcher moves
- **WHEN** a Ballistician at `(-3, 0)` launches `Siege Barrage` augmented with `Impact Shard` onto `(0, 0)`, then moves to `(0, 3)` before detonation
- **THEN** upon detonation, a hit enemy at `(0, 0)` is knocked back 1 hex away from `(-3, 0)` (toward `(1, 0)`) rather than away from `(0, 3)`

#### Scenario: Siege Barrage with Impact Shard still knocks back enemies if launcher is defeated before detonation
- **WHEN** a Ballistician at `(-3, 0)` launches `Siege Barrage` augmented with `Impact Shard` and is defeated before the bombardment detonates
- **THEN** upon detonation, a hit enemy at `(0, 0)` is still knocked back 1 hex away from `(-3, 0)` despite the launcher no longer occupying the arena

