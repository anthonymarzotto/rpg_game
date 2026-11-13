# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Non-Damaging Utility and Kinetic Feedback
The combat system SHALL support distinct utility classification and combat log metadata for non-damaging abilities (`damageType: 'NONE'`) that target hostile units, cause displacement, or inflict conditions. Single-target abilities declaring `targetType: 'SINGLE_TARGET'` SHALL strictly restrict valid targets to opposing-faction units regardless of whether their `damageType` is physical, magical, or none. Friendly supportive abilities targeting another unit SHALL declare `targetType: 'ALLY'`. When a non-damaging ability causes collision, collateral, or fall damage, the combat log SHALL record the damage amount, target vitals, and collision detail in `UTILITY` log metadata. The floating combat text system SHALL process damage, displacement, and status events across all ability resolution types, rendering appropriate visual floaters (`KNOCKBACK!`, `TELEPORT!`, `SLAM!`, `COLLISION!`, `RETREAT!`, or custom effect shout labels while honoring `null` suppression) on the battlefield.

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
- **WHEN** an actor executes `Shadow Step` or another non-damaging teleport ability without a custom shout override
- **THEN** a `DISPLACEMENT` event with `kind: 'TELEPORT'` is dispatched
- **THEN** floating combat text displays `TELEPORT!` at the destination hex

#### Scenario: Friendly non-damaging abilities remain classified as BUFF
- **WHEN** an actor executes a supportive or defensive non-damaging ability on an ally or self (such as `Minor Ward` or `Defensive Stance`)
- **THEN** the combat log records the entry with metadata `type: 'BUFF'` and a defensive shield glyph
- **THEN** positive stat modifiers and conditions float on the affected unit

#### Scenario: Skirmish retreat displacement emits RETREAT floater
- **WHEN** an actor executes `Skirmish` or an ability with retreat displacement moving away from an enemy
- **THEN** a `DISPLACEMENT` event with `kind: 'RETREAT'` is dispatched
- **THEN** floating combat text displays `RETREAT!` at the retreat destination hex rather than `KNOCKBACK!`

#### Scenario: Single-target hostile utility rejects friendly targets
- **WHEN** an actor selects a non-damaging `SINGLE_TARGET` ability (such as `Challenging Shout` or `Expose Weakness`) and attempts to target an allied unit of the same faction
- **THEN** ability validation fails and rejects the ally as an illegal target
