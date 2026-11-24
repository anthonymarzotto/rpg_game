# tier-4-arcanist Specification

## Purpose

Defines the complete class package, combat abilities (`Refractive Array`, `Adaptive Formula`, `Distributive Proof`), innate passive trait (`Exclusion Matrix`), AI tactical behavior, encounter generation roster membership, wildcard compatibility, and pixel token integration for the Tier 4 Arcanist (`#96`, 0 Fighter, 1 Rogue, 3 Mage) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Arcanist Class Package Resolution
The system SHALL provide a bespoke class package for the Arcanist `(0 Fighter, 1 Rogue, 3 Mage)` consisting of signature ability `Refractive Array`, domain pool abilities `Adaptive Formula` and `Distributive Proof`, innate passive trait `Exclusion Matrix`, and default AI tactical profile `SNIPER`.

#### Scenario: Arcanist package resolution
- **WHEN** a unit equips the Arcanist active class
- **THEN** their core combat abilities resolve to `Refractive Array`, `Adaptive Formula`, and `Distributive Proof`
- **THEN** their innate passive trait resolves to `Exclusion Matrix`
- **THEN** their default AI tactical profile resolves to `SNIPER`

### Requirement: Exclusion Matrix Friendly-Fire Exclusion and Ally-Transparent Magical LoS
The system SHALL provide an innate passive trait `Exclusion Matrix` (`hook: 'ALWAYS'`) declaring `excludeFriendlyAoE: true` and `ignoresAllyLoS: true`.
- **Ally-Transparent Magical LoS**: Friendly units occupying intermediate hexes SHALL NOT obstruct 3D Line of Sight for magical abilities (`damageType === 'MAGICAL'` or `archetypeTag === 'MAGE'`) executed or previewed by a unit possessing `Exclusion Matrix`. Opposing units, impassable obstacles, and elevated terrain hills SHALL continue to block Line of Sight normally.
- **Zero Friendly Fire**: Hostile area-of-effect abilities, splashes, cones, clustered distributions, and delayed bombardments executed by a unit possessing `Exclusion Matrix` SHALL NOT damage, target for defense contests, or inflict negative conditions on friendly units, including when a `HEX`-targeted hostile AoE is centered directly on an ally's hex.

#### Scenario: Magical spell shoots through an intervening ally
- **WHEN** a unit equipped with `Exclusion Matrix` targets an enemy within range with a magical ability (such as `Adaptive Formula` or `Distributive Proof`) and a friendly unit stands directly on the intermediate hex between them at the same elevation
- **THEN** Line-of-Sight validation succeeds without obstruction
- **THEN** the spell resolves normally against the enemy target

#### Scenario: Intervening enemy or obstacle still blocks magical LoS
- **WHEN** a unit equipped with `Exclusion Matrix` attempts to cast a magical ability through an intervening enemy unit or impassable `RUINS` obstacle at or above the 3D ray elevation
- **THEN** Line-of-Sight validation rejects the target with the standard obstruction reason

#### Scenario: Hostile AoE centered on or overlapping an ally spares the ally
- **WHEN** a unit equipped with `Exclusion Matrix` casts a damaging `HEX` AoE ability (such as `Refractive Array` or wildcard `Arcane Blast`) centered directly on a friendly Knight's hex with hostile enemies adjacent
- **THEN** the friendly Knight suffers 0 damage and no negative conditions
- **THEN** hostile enemies within the blast radius contest the spellcast roll and take damage normally

### Requirement: Refractive Array Signature AoE with Ally Refraction
The system SHALL provide a signature combat ability `Refractive Array` costing 2 AP (without a `oncePerTurn` restriction), with range 1–3, `aoeRadius: 1`, `archetypeTag: 'MAGE'`, `targetType: 'HEX'`, `defenseTarget: 'RESOLVE'`, `attackModifierAttribute: 'focus'`, and `damageType: 'MAGICAL'`.
- Executing `Refractive Array` SHALL roll a single unified spellcast attack roll (`d20 + Focus + modifiers`) and resolve `1d4 + Focus` magical damage (mitigated by Ward, half on Graze, 0 on Miss) against every living enemy within the blast radius contesting that roll against their Resolve.
- Friendly units inside the blast radius (excluding the caster themselves, following standard AoE Self exclusion) SHALL be spared from harm.
- For each living spared ally inside the blast radius, when at least one living enemy remains inside the blast radius, `Refractive Array` SHALL redirect one additional `1d4 + Focus` magical strike onto a living enemy inside the blast radius, spreading round-robin across lowest-current-HP enemies first (prioritizing enemies with the fewest refracted strikes already assigned, then lowest current HP, then deterministic unit ID, cycling back if more spared allies than living enemies exist).
- Each refracted strike SHALL test the unified spellcast d20 roll against its recipient's Resolve (Solid Hit, Graze, or Miss), roll its own `1d4 + Focus` damage dice mitigated by Ward, emit a `DAMAGE` event labeled `'REFRACT'` when damage is dealt, and record a structured `COLLATERAL_HIT` outcome (`sourceLabel: 'Refract'`) in the combat log.

#### Scenario: Refractive Array redirects spared ally hit onto lowest-HP enemy
- **WHEN** an Arcanist casts `Refractive Array` centered on an allied Knight's hex with two adjacent enemies (Enemy A at 8 HP and Enemy B at 14 HP) and rolls a spellcast total meeting both enemies' Resolve
- **THEN** the action consumes 2 AP
- **THEN** the allied Knight takes 0 damage
- **THEN** Enemy A and Enemy B each take a base `1d4 + Focus` magical blast hit
- **THEN** the Knight's spared hit redirects one additional `1d4 + Focus` magical strike labeled `REFRACT` onto Enemy A (the lowest-HP living enemy in the blast)

#### Scenario: Multiple spared allies spread refractions round-robin across living enemies
- **WHEN** an Arcanist casts `Refractive Array` covering two allies and two living enemies (Enemy A at 8 HP and Enemy B at 14 HP) that both survive the base blast
- **THEN** the first refracted strike targets Enemy A (lowest HP) and the second refracted strike targets Enemy B (round-robin spread)

#### Scenario: Single surviving enemy receives cycled refractions from multiple allies
- **WHEN** an Arcanist casts `Refractive Array` covering two allies and a single living enemy that survives the base blast and first refraction
- **THEN** both refracted strikes resolve against that living enemy

#### Scenario: Caster inside blast radius does not generate a self-refraction
- **WHEN** an Arcanist casts `Refractive Array` such that the Arcanist's own hex lies within the blast radius alongside one enemy and zero other allies
- **THEN** the Arcanist takes 0 damage and generates 0 refracted strikes

### Requirement: Adaptive Formula Lower-Defense Targeting
The system SHALL provide a domain combat ability `Adaptive Formula` costing 1 AP with range 1–3, `archetypeTag: 'MAGE'`, `targetType: 'SINGLE_TARGET'`, `defenseTarget: 'LOWER_DEFENSE'`, `attackModifierAttribute: 'focus'`, and `damageType: 'MAGICAL'`.
- Executing `Adaptive Formula` SHALL automatically compare the target's effective `Evasion` and effective `Resolve`, contesting the spellcast attack roll against whichever defense score is lower (selecting `Resolve` on an exact tie), and dealing `1d6 + Focus` magical damage mitigated by Ward (half on Graze).

#### Scenario: Adaptive Formula targets Evasion against a high-Resolve caster
- **WHEN** a unit executes `Adaptive Formula` against a hostile Mage with `Evasion 10` and `Resolve 15`
- **THEN** the attack roll and target preview contest `Evasion` (`DC 10`) rather than `Resolve`
- **THEN** on Hit or Crit the target takes `1d6 + Focus` magical damage mitigated by Ward

#### Scenario: Adaptive Formula targets Resolve against a high-Evasion skirmisher or on a tie
- **WHEN** a unit executes `Adaptive Formula` against a hostile Rogue with `Evasion 16` and `Resolve 11` (or a unit with `Evasion 12` and `Resolve 12`)
- **THEN** the attack roll and target preview contest `Resolve`

### Requirement: Distributive Proof Isolated-vs-Clustered Equation
The system SHALL provide a domain combat ability `Distributive Proof` costing 1 AP with range 1–3, `archetypeTag: 'ROGUE'`, `targetType: 'SINGLE_TARGET'`, `defenseTarget: 'RESOLVE'`, `attackModifierAttribute: 'focus'`, and `damageType: 'MAGICAL'`.
- Executing `Distributive Proof` SHALL deal a baseline `1d4 + Focus` magical damage vs `Resolve` to the primary target and evaluate whether the primary target has any living adjacent same-faction allies (distance 1 from target).
- **Isolated Branch (0 adjacent allies of the target):** Applies the `EXPOSED` condition for 1 turn on Solid Hit or Critical Hit (`HIT_OR_CRIT`).
- **Clustered Branch (1+ adjacent allies of the target):** Distributes `1d4` magical splash damage (mitigated by Ward, contesting the unified spellcast d20 roll against each adjacent unit's Resolve, labeled `'DISTRIBUTE'`) to every living unit adjacent (distance 1) to the primary target (excluding the caster, and sparing friendly units of the caster when the caster possesses `excludeFriendlyAoE`).

#### Scenario: Distributive Proof punishes an isolated enemy with Exposed
- **WHEN** a unit executes `Distributive Proof` against an enemy who has 0 living same-faction allies adjacent to them and rolls a Solid Hit or Critical Hit
- **THEN** the primary attack rolls `1d4 + Focus` magical damage mitigated by Ward
- **THEN** the target receives the `EXPOSED` condition for 1 turn
- **THEN** no adjacent splash damage is emitted

#### Scenario: Distributive Proof splashes adjacent units against a clustered enemy while respecting Exclusion Matrix
- **WHEN** an Arcanist (with `Exclusion Matrix`) executes `Distributive Proof` against Enemy A who is adjacent to both Enemy B and an allied Knight, rolling a spellcast total meeting Enemy B's Resolve
- **THEN** Enemy A takes baseline `1d4 + Focus` magical damage and does not receive `EXPOSED`
- **THEN** Enemy B contests the spellcast roll against Resolve and takes `1d4` magical splash damage labeled `DISTRIBUTE`
- **THEN** the allied Knight is spared and takes 0 damage

#### Scenario: Distributive Proof equipped as a wildcard without Exclusion Matrix inflicts friendly splash
- **WHEN** a non-Arcanist unit without `excludeFriendlyAoE` executes `Distributive Proof` against a clustered Enemy A adjacent to both Enemy B and a friendly unit
- **THEN** both Enemy B and the adjacent friendly unit contest the spellcast roll against their Resolve for `1d4` magical splash damage

### Requirement: Arcanist Package Registration and Wildcard Integration
The system SHALL register the Arcanist package in the global class package catalog, whitelist the `96_human_male` pixel token identifier, configure the class badge palette with Deep Arcane Violet (`#5b21b6`) and Geometric Emerald (`#10b981`), include `arcanist` in Stage 6+ Tier-4 enemy encounter generation, and allow eligible units to equip the package or equip `Adaptive Formula` and `Distributive Proof` as wildcard abilities and `Exclusion Matrix` as a wildcard passive.

#### Scenario: Equipping Arcanist domain abilities and passive as wildcards
- **WHEN** a unit has unlocked the Arcanist node in their celestial constellation
- **THEN** the unit can equip `Adaptive Formula` or `Distributive Proof` into active wildcard ability slots and `Exclusion Matrix` into an active wildcard passive slot
- **THEN** combat validation confirms the loadout as valid
