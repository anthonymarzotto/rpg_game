# Composable Abilities Delta Specification

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Ally-Transparent Magical Line of Sight and Geometric Formula Effects
The combat engine SHALL support declarative passive flag `ignoresAllyLoS?: boolean`, allowing magical abilities (`damageType === 'MAGICAL'` or `archetypeTag === 'MAGE'`) to ignore intermediate friendly units during 3D Line-of-Sight raycasting across validation, target preview, and AI evaluation.
The composable ability pipeline SHALL additionally support atomic effect types `'ALLY_REFRACTION'` (redirecting conserved strikes from spared allies inside an AoE blast round-robin across lowest-HP living enemies in the blast using the unified spellcast roll) and `'DISTRIBUTIVE_PROOF'` (branching between isolated `EXPOSED` setup and clustered adjacent `1d4` magical splash), with deterministic human-readable formatter clauses and structured combat log outcomes.

#### Scenario: Formatter renders readable clauses for LOWER_DEFENSE, ALLY_REFRACTION, and DISTRIBUTIVE_PROOF
- **WHEN** the ability formatter formats `Refractive Array`, `Adaptive Formula`, or `Distributive Proof`
- **THEN** it produces human-readable stat strip pills and effect clauses (such as `+FOC vs Lower (EVA/RES)`, ally refraction redirect rules, and isolated vs clustered equations) without exposing raw internal enum strings
