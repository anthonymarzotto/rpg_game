# tier-4-philanderer Specification

## Purpose

Defines the complete class package, combat abilities, temporary faction-flip charm, positional luring, myopic dazzling, directional front-arc presence aura, and token integration for the Tier 4 Philanderer (0 Fighter, 3 Rogue, 1 Mage) in the celestial constellation progression.

## Requirements

### Requirement: Philanderer Class Package Resolution
The system SHALL provide a bespoke class package for the Philanderer `(0 Fighter, 3 Rogue, 1 Mage)` consisting of signature ability `Billet-Doux`, domain pool abilities `Beckoning Glance` and `Looking-Glass Glare`, innate passive trait `Captivating Presence`, and default AI tactical profile `SUPPORT`.

#### Scenario: Philanderer package resolution
- **WHEN** a unit equips the Philanderer active class
- **THEN** their core combat abilities resolve to `Billet-Doux`, `Beckoning Glance`, and `Looking-Glass Glare`
- **THEN** their innate passive trait resolves to `Captivating Presence`
- **THEN** their default AI tactical profile resolves to `SUPPORT`

### Requirement: Billet-Doux Signature Charm Execution
The system SHALL provide a signature combat ability `Billet-Doux` costing 2 AP with range 3 targeting a single hostile unit (`SINGLE_TARGET`), resolving a contested Finesse check (`attackModifierAttribute: 'finesse'`) against `RESOLVE` with `damageType: 'NONE'`.
- On a **Critical Hit** (`CRIT_ONLY`), `Billet-Doux` SHALL apply the `CHARMED` condition for 2 turns.
- On a **Solid Hit** (`HIT_ONLY`), `Billet-Doux` SHALL apply the `CHARMED` condition for 1 turn.
- On a **Graze** (`GRAZE_ONLY`), `Billet-Doux` SHALL apply the `EXPOSED` condition for 1 turn.
- On a **Miss**, `Billet-Doux` SHALL apply no condition or damage.

#### Scenario: Billet-Doux Solid Hit charms target for 1 turn
- **WHEN** a unit executes `Billet-Doux` against an enemy within 3 hexes and rolls a Solid Hit against the target's Resolve
- **THEN** the action consumes 2 AP and deals 0 damage
- **THEN** the target receives the `CHARMED` condition for 1 turn, temporarily switching the target's active combat faction to the actor's faction

#### Scenario: Billet-Doux Critical Hit charms target for 2 turns
- **WHEN** a unit executes `Billet-Doux` against an enemy within 3 hexes and rolls a Critical Hit
- **THEN** the target receives the `CHARMED` condition for 2 turns, temporarily switching the target's active combat faction to the actor's faction for 2 turns

#### Scenario: Billet-Doux Graze flusters target with Exposed
- **WHEN** a unit executes `Billet-Doux` against an enemy within 3 hexes and the roll results in a Graze
- **THEN** the target does not receive `CHARMED`
- **THEN** the target receives the `EXPOSED` condition for 1 turn

#### Scenario: Billet-Doux Miss applies no effect
- **WHEN** a unit executes `Billet-Doux` against an enemy within 3 hexes and the roll results in a Miss
- **THEN** neither `CHARMED` nor `EXPOSED` is applied

### Requirement: Beckoning Glance Positional Pull and Expose
The system SHALL provide a domain combat ability `Beckoning Glance` costing 1 AP with range 3 targeting a single hostile unit (`SINGLE_TARGET`), resolving a contested Finesse check (`attackModifierAttribute: 'finesse'`) against `RESOLVE` with `damageType: 'NONE'`. On a Solid Hit or Critical Hit (`HIT_OR_CRIT`), `Beckoning Glance` SHALL pull the target 1 hex toward the actor (`PULL`, `magnitude: 1`), rotate the target's facing directly toward the actor (`FORCE_FACING`), and apply the `EXPOSED` condition for 1 turn.

#### Scenario: Beckoning Glance pulls, turns, and exposes target on hit
- **WHEN** a unit executes `Beckoning Glance` against an enemy at distance 2 or 3 and rolls a Solid Hit or Critical Hit where the intermediate hex toward the actor is walkable and unoccupied
- **THEN** the target is pulled 1 hex toward the actor
- **THEN** the target's facing is rotated directly toward the actor
- **THEN** the target receives the `EXPOSED` condition for 1 turn

#### Scenario: Beckoning Glance Graze applies no pull or expose
- **WHEN** a unit executes `Beckoning Glance` and the attack roll results in a Graze or Miss
- **THEN** the target is not displaced, does not have its facing rotated, and does not receive `EXPOSED`

### Requirement: Looking-Glass Glare Magical Beam and Blind
The system SHALL provide a domain combat ability `Looking-Glass Glare` costing 1 AP with range 3 targeting a single hostile unit (`SINGLE_TARGET`), resolving a magical spellcast roll (`attackModifierAttribute: 'focus'`) against `RESOLVE` with `damageType: 'MAGICAL'`. On hit, `Looking-Glass Glare` SHALL deal `1d4 + Focus` magical damage (half on Graze), and on a Solid Hit or Critical Hit (`HIT_OR_CRIT`), it SHALL apply the `BLINDED` condition for 1 turn.

#### Scenario: Looking-Glass Glare damages and blinds target on hit
- **WHEN** a unit executes `Looking-Glass Glare` against an enemy within 3 hexes and rolls a Solid Hit or Critical Hit
- **THEN** the target suffers `1d4 + Focus` magical damage mitigated by Ward
- **THEN** the target receives the `BLINDED` condition for 1 turn

#### Scenario: Looking-Glass Glare Graze deals half damage without blinding
- **WHEN** a unit executes `Looking-Glass Glare` and the attack roll results in a Graze
- **THEN** the target suffers grazed magical damage
- **THEN** the `BLINDED` condition is not applied

### Requirement: Captivating Presence Directional Front-Arc Aura
The system SHALL provide an innate passive trait `Captivating Presence` that projects a directional 3-hex forward aura in the bearer's `FRONT` combat arc (forward 180-degree hemisphere). Whenever an enemy unit located within 3 hexes of a living unit with `Captivating Presence` and positioned inside that unit's `FRONT` combat arc executes an attack roll (against the bearer or any ally of the bearer), the attacker SHALL suffer a `-2` penalty to their Attack Roll.

#### Scenario: Enemy inside Philanderer's 3-hex front arc suffers -2 Attack Roll
- **WHEN** an enemy unit positioned at distance 1, 2, or 3 within the Philanderer's `FRONT` combat arc attacks the Philanderer or an ally of the Philanderer
- **THEN** a `-2` aura penalty from `Captivating Presence` is applied to the enemy's attack roll

#### Scenario: Enemy in Philanderer's flank, rear, or beyond 3 hexes is unaffected
- **WHEN** an enemy unit positioned in the Philanderer's `FLANK` or `REAR` combat arc (or at distance 4 or greater) executes an attack
- **THEN** `Captivating Presence` imposes no penalty on the enemy's attack roll

### Requirement: Philanderer Package Registration and Wildcard Integration
The system SHALL register the Philanderer package in the global class package catalog, whitelist the `84_human_male` pixel token identifier, configure the class badge palette with Velvet Rose (`#9f1239` / `#f43f5e`), include `philanderer` in Stage 6+ Tier-4 enemy encounter generation, and allow eligible units to equip the package or equip `Beckoning Glance` and `Looking-Glass Glare` as wildcard abilities and `Captivating Presence` as a wildcard passive.

#### Scenario: Equipping Philanderer domain abilities as wildcards
- **WHEN** a unit has unlocked the Philanderer node in their celestial constellation
- **THEN** the unit can equip `Beckoning Glance` or `Looking-Glass Glare` into active wildcard ability slots and `Captivating Presence` into an active wildcard passive slot
- **THEN** combat validation confirms the loadout as valid
