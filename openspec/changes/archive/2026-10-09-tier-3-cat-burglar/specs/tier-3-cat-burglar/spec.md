# Spec Delta

## Purpose

Defines the complete class package, active combat abilities, tempo siphoning, thrown facing disorientation, acrobatic knockback rebound, and skirmisher heuristics for the Tier 3 Cat-burglar class (0 Fighter, 2 Rogue, 1 Mage) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Cat-burglar Class Package Definition
The system SHALL provide a bespoke class package for the Cat-burglar `(0 Fighter, 2 Rogue, 1 Mage)` consisting of signature ability `Rooftop Vault`, domain pool abilities `Pilfer` and `Flash Powder`, innate passive trait `Feline Grace`, and default AI profile `SKIRMISHER`.

#### Scenario: Resolving Cat-burglar class package
- **WHEN** `getClassPackage('cat-burglar')` is queried
- **THEN** it returns a package with signature ability `rooftop_vault`, domain abilities `pilfer` and `flash_powder`, passive trait `feline_grace`, and AI profile `SKIRMISHER`

#### Scenario: Equipping active loadout for Cat-burglar
- **WHEN** a unit equips `cat-burglar` as their active class
- **THEN** their combat abilities include `Rooftop Vault`, `Pilfer`, and `Flash Powder`, and their active passives include `Feline Grace`

### Requirement: Rooftop Vault Signature Ability
The system SHALL provide a signature combat ability `Rooftop Vault` costing 1 AP with range 2 targeting an unoccupied walkable hex (`targetType: 'HEX'`) that leaps to the destination hex ignoring intervening units, obstacles, and elevation climb barriers ($\Delta h \ge 2$), emitting a displacement event and granting the user +2 Evasion for 1 turn upon landing.

#### Scenario: Vaulting up cliffs onto high ground
- **WHEN** a unit executes `Rooftop Vault` targeting an unoccupied walkable hex at an elevation difference $\Delta h = 2$ within 2 hexes
- **THEN** the unit is displaced to the target hex, current AP is reduced by 1, and the unit gains a +2 Evasion modifier for 1 turn

#### Scenario: Vaulting over intervening obstacles
- **WHEN** a unit executes `Rooftop Vault` targeting an unoccupied walkable hex 2 hexes away where the intervening hex contains an unwalkable obstacle or another unit
- **THEN** the ability execution succeeds and repositions the unit to the target hex without colliding with the obstacle

### Requirement: Pilfer Domain Ability
The system SHALL provide a domain combat ability `Pilfer` costing 1 AP with range 1 that deals physical damage against target Evasion using Finesse (1d4 + Finesse), delays the target's CTB initiative gauge by 20 ticks, and boosts the user's CTB initiative gauge by 20 ticks upon a successful hit or critical hit.

#### Scenario: Siphoning CTB initiative on successful hit
- **WHEN** a unit executes `Pilfer` against an enemy within 1 hex and rolls a Solid Hit or Critical Hit
- **THEN** the target suffers rolled physical damage and has their CTB initiative gauge reduced by 20 ticks, while the user has their CTB initiative gauge increased by 20 ticks

#### Scenario: Negating secondary tempo siphon on Graze
- **WHEN** a unit executes `Pilfer` and the attack roll results in a Graze
- **THEN** the target takes halved damage and secondary effects (`CTB_DELAY` and self `INITIATIVE_BOOST`) are negated

### Requirement: Flash Powder Domain Ability
The system SHALL provide a domain combat ability `Flash Powder` costing 1 AP with range 2 targeting a hex (`targetType: 'HEX'`) with an area-of-effect radius of 1 (`aoeRadius: 1`) that forces all enemy units in the affected hexes to face 180° away from the blast center (`FORCE_FACING_AWAY`) and inflicts -2 to Attack Rolls for 1 turn.

#### Scenario: Detonating Flash Powder on an enemy cluster
- **WHEN** a unit casts `Flash Powder` targeting a hex within 2 hexes that encompasses one or more enemy units within a 1-hex radius
- **THEN** each enemy unit in the radius has their facing rotated 180° opposite the blast center and gains an active modifier of -2 Attack Roll for 1 turn

#### Scenario: Friendly units unaffected by Flash Powder
- **WHEN** a unit casts `Flash Powder` targeting an area containing allied units
- **THEN** allied units are not affected by the facing rotation or attack roll penalty

### Requirement: Feline Grace Passive Trait
The system SHALL provide an innate passive trait `Feline Grace` granting complete immunity to Fall Impact Damage (`immuneToFallDamage: true`), cat-like rebound during kinetic displacement, and +2 flat Evasion.

#### Scenario: Negating Fall Impact Damage from plunging ledge drops
- **WHEN** a unit equipped with `Feline Grace` drops down a ledge with $\Delta h \le -2$ during movement or involuntary knockback
- **THEN** the unit suffers 0 Fall Impact Damage and the combat log records safe landing via fall damage immunity

#### Scenario: Vaulting up onto cliffs on knockback
- **WHEN** a unit equipped with `Feline Grace` is displaced by knockback into an adjacent hex with elevation difference $\Delta h \ge 2$ that is walkable and unoccupied
- **THEN** the unit is displaced onto the cliff top instead of colliding with the cliff face, suffering 0 collision damage

#### Scenario: Vaulting over obstacles on knockback
- **WHEN** a unit equipped with `Feline Grace` is displaced by knockback toward an unwalkable 1-hex obstacle whose far-side hex in the knockback trajectory is walkable and unoccupied
- **THEN** the unit vaults over the obstacle to the far-side hex, suffering 0 collision damage

#### Scenario: Negating collision damage at arena boundary walls
- **WHEN** a unit equipped with `Feline Grace` is knocked back into an impassable arena perimeter wall or blocked tile with no open vault destination
- **THEN** the unit halts at the wall and suffers 0 wall-slam collision damage

### Requirement: Global Catalog and Campaign Integration
The system SHALL register the Cat-burglar package in the global class catalog, include Cat-burglar in Stage 5+ enemy generation pools with dynamic threat budgeting, and map pixel token assets (`83_human_male`) with dedicated class badge palette colors.

#### Scenario: Spawning Cat-burglar in campaign encounters
- **WHEN** an encounter is generated at Stage 5 or higher with sufficient threat budget (55+ points)
- **THEN** enemy units can be instantiated as `cat-burglar` with full progression constellation `['thief', 'infiltrator', 'cat-burglar']`

#### Scenario: Resolving Cat-burglar badge styling
- **WHEN** `getClassBadgePalette('cat-burglar')` is resolved
- **THEN** it returns dedicated non-default theme colors matching the Rogue/Mage hybrid aesthetic
