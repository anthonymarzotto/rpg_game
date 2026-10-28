# Spec Delta: composable-abilities

## MODIFIED Requirements

### Requirement: Non-Damaging Utility and Kinetic Feedback
The combat system SHALL support distinct utility classification and combat log metadata for non-damaging abilities (`damageType: 'NONE'`) that target hostile units, cause displacement, or inflict conditions. When a non-damaging ability causes collision, collateral, or fall damage, the combat log SHALL record the damage amount, target vitals, and collision detail in `UTILITY` log metadata. The floating combat text system SHALL process damage, displacement, and status events across all ability resolution types, rendering appropriate visual floaters (`KNOCKBACK!`, `TELEPORT!`, `SLAM!`, `COLLISION!`, `RETREAT!`) on the battlefield.

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

### Requirement: Ground-Targeted Damaging Abilities and Unified Blast Defense Contests
The combat engine SHALL support damaging abilities (`damageType !== 'NONE'`) declaring `targetType: 'HEX'`. When resolving a damaging hex-targeted ability, the player or AI SHALL be permitted to target any reachable walkable hex in the arena, regardless of whether that hex is occupied or unoccupied.
The attacker SHALL roll a single spellcast attack roll (`d20 + attackModifierAttribute`). The engine SHALL evaluate this attack roll against the individual defense (`defenseTarget`) of every unit located within the blast radius (`aoeRadius`) around the targeted hex (including both enemies and allies, excluding the attacker).
If a unit occupies the center targeted hex, it SHALL contest the attack roll for direct damage using the ability's primary `damageProfile` (eligible for Critical Hit, Solid Hit, Graze, or Miss).
All units located in surrounding hexes within `aoeRadius` SHALL contest the attack roll for secondary splash damage using the ability's declarative `splashDamageProfile` (or fallback base dice if undeclared). Surrounding units that are hit SHALL resolve as a solid hit (or graze), taking splash damage mitigated by their respective armor or ward; surrounding units whose defense exceeds the attack roll SHALL suffer a miss and take 0 damage.
If the center targeted hex is unoccupied, no direct damage event SHALL be emitted, the combat log and card SHALL omit direct damage breakdowns and attack roll chips against the center hex (`0 (Ground)`), and all units within the surrounding splash radius SHALL contest defense against the attack roll for splash damage.

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
- **WHEN** an ally is positioned within the blast radius of a damaging AoE attack executed by a teammate
- **THEN** the ally contests the spellcast attack roll against their own defense
- **THEN** if the attack roll meets or exceeds the ally's defense, the ally takes splash damage (or center damage if in the center hex) and a damage event is emitted

#### Scenario: High Resolve targets avoid splash damage on low spellcast rolls
- **WHEN** an actor rolls a total spellcast attack roll of 11 on a damaging AoE ability targeting a cluster containing a low-Resolve goblin (Resolve 10) and a high-Resolve golem (Resolve 16)
- **THEN** the goblin suffers splash damage
- **THEN** the golem suffers a miss and takes 0 damage
