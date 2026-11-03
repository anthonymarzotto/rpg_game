# Spec Delta: Composable Abilities

## MODIFIED Requirements

### Requirement: Composable Ability Effects Pipeline
The combat engine SHALL model abilities as an execution envelope containing an array of atomic `AbilityEffect` objects rather than a single monolithic damage profile and secondary effect. Each effect SHALL declare its type, execution payload, optional `targetScope` (`'TARGET' | 'SELF' | 'ALLIES'`), optional `applyOn` trigger condition (`'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY'`), optional tactical execution condition (`condition: 'FLANK_OR_REAR' | 'TARGET_CHALLENGED'`), optional `bonusDamage` dice profile evaluated when the condition is satisfied, and optional to-hit modifiers including `grantsAdvantage`, `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty`.

Displacement effects that move a unit across grid tiles—including `KNOCKBACK` and `RETREAT_STEP`—SHALL evaluate the elevation delta between origin and destination tiles. When displacement plunges off an elevated ledge ($\Delta h \le -2$), the system SHALL calculate raw fall impact damage ($|\Delta h| \times 4$) and resolve unmitigated fall damage against the displaced unit, dispatching a `DAMAGE` event with `reason: 'FALL'`. If a retreat step encounters an impassable elevation climb ($\Delta h > \text{maxClimbElevation}$) or an unwalkable obstacle, displacement SHALL be aborted unless the unit possesses a trait granting `canVaultOnRetreat`. Units with `canVaultOnRetreat` SHALL vault up onto the cliff top when the landing tile is walkable and unoccupied, or vault over an adjacent 1-hex obstacle onto the far-side hex if open.

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

### Requirement: Non-Damaging Utility and Kinetic Feedback
The combat system SHALL support distinct utility classification and combat log metadata for non-damaging abilities (`damageType: 'NONE'`) that target hostile units, cause displacement, or inflict conditions. Single-target abilities declaring `targetType: 'SINGLE_TARGET'` SHALL strictly restrict valid targets to opposing-faction units regardless of whether their `damageType` is physical, magical, or none. Friendly supportive abilities targeting another unit SHALL declare `targetType: 'ALLY'`. When a non-damaging ability causes collision, collateral, or fall damage, the combat log SHALL record the damage amount, target vitals, and collision detail in `UTILITY` log metadata. The floating combat text system SHALL process damage, displacement, and status events across all ability resolution types, rendering appropriate visual floaters (`KNOCKBACK!`, `TELEPORT!`, `SLAM!`, `COLLISION!`, `RETREAT!`) on the battlefield.

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

#### Scenario: Skirmish retreat displacement emits RETREAT floater
- **WHEN** an actor executes `Skirmish` or an ability with retreat displacement moving away from an enemy
- **THEN** a `DISPLACEMENT` event with `kind: 'RETREAT'` is dispatched
- **THEN** floating combat text displays `RETREAT!` at the retreat destination hex rather than `KNOCKBACK!`

#### Scenario: Single-target hostile utility rejects friendly targets
- **WHEN** an actor selects a non-damaging `SINGLE_TARGET` ability (such as `Challenging Shout` or `Expose Weakness`) and attempts to target an allied unit of the same faction
- **THEN** ability validation fails and rejects the ally as an illegal target
