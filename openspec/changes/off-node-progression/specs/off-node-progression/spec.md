# Spec Delta

## Purpose

Establishes the progression, calculation, and visual mechanics for the 39 off-node coordinates in the 100-class lattice, awarding Harmonization Stat Surges, a choice between Domain Skill Drafts and Ability Overclocks, Luminous Waypoints on the star chart, and Wayfarer Hero Titles.

## ADDED Requirements

### Requirement: Archetype-Pair Harmonization Surges
The campaign progression engine SHALL automatically calculate and award a Harmonization Stat Surge to a unit whenever their allocated archetype points match an off-node coordinate (a coordinate with no canonical class node in the catalog). The surge values SHALL be deterministically derived from the blended archetypes and added to derived vitals:
- Fighter + Rogue ($F > 0, R > 0, M = 0$): $+6$ Max HP and $+1$ Speed.
- Fighter + Mage ($F > 0, M > 0, R = 0$): $+1$ Armor and $+1$ Ward.
- Rogue + Mage ($R > 0, M > 0, F = 0$): $+1$ Move and $+1$ Evasion.
- Tri-Hybrid ($F > 0, R > 0, M > 0$): $+5$ Max HP and $+1$ to all secondary defenses (Speed, Move, Evasion, Resolve, Armor, Ward).

#### Scenario: Advancing to an off-node hybrid coordinate
- **WHEN** a Level 1 Warrior `(1, 0, 0)` advances with Rogue XP to Level 2 `(1, 1, 0)`
- **THEN** their derived vitals automatically gain the Fighter/Rogue Harmonization bonus (+6 Max HP and +1 Speed) on top of standard attribute scaling

#### Scenario: Advancing to a tri-hybrid centroid coordinate
- **WHEN** a unit advances from `(1, 1, 0)` with Mage XP to Level 3 `(1, 1, 1)`
- **THEN** their derived vitals gain the Tri-Hybrid Harmonization bonus (+5 Max HP and +1 to all secondary vitals)

### Requirement: Off-Node Choice Milestone
When a unit advances to an off-node level in Camp, the system SHALL prompt the player with a choice modal offering two distinct advancement options:
1. **Domain Skill Draft**: Select 1 domain ability from the advancing archetype's domain pool that is not yet unlocked, adding it to the hero's permanent Wildcard ability pool.
2. **Ability Overclock**: Select 1 currently equipped ability and attach a permanent `AbilityModifier` (e.g. +1 damage die tier, +1 range, -10 CTB cost, or append an effect).

#### Scenario: Drafting a domain skill
- **WHEN** a player advances a Warrior to `(1, 1, 0)` and chooses the Domain Skill Draft option for Rogue
- **THEN** the system presents available Rogue domain skills (e.g. *Smoke Veil*, *Toxic Shiv*, *Shadow Step*) and adds the selected skill to the hero's unlocked wildcard ability pool

#### Scenario: Overclocking an equipped ability
- **WHEN** a player advances to an off-node coordinate and chooses the Ability Overclock option
- **THEN** the player selects an equipped ability and an overclock modifier, permanently binding the modifier to that ability on the hero

### Requirement: Luminous Waypoint Constellation Integration
The Constellation Star Chart SHALL calculate and render illuminated **Starlight Waypoints** at the exact barycentric coordinates for off-node points along triangle facet edges. When unlocked, the constellation laser path SHALL route through the waypoint.

#### Scenario: Routing constellation laser line through an off-node waypoint
- **WHEN** a unit with an unlocked path `Warrior (1, 0, 0)` $\rightarrow$ `(1, 1, 0)` $\rightarrow$ `Cavalier (2, 1, 0)` is inspected in the Constellation
- **THEN** the glowing laser polyline connects from the Warrior star node, through the (1,1,0) Starlight Waypoint, to the Cavalier star node

#### Scenario: Hovering over a Starlight Waypoint
- **WHEN** a player hovers over an off-node waypoint on the constellation
- **THEN** the Node Scanner HUD displays the waypoint coordinate, archetype blend, harmonization bonus summary, and current unlock status

### Requirement: Wayfarer Hero Titles
The progression system SHALL compute a dynamic "Wayfarer Rank" based on the total number of off-node milestones the hero has achieved. The hero's active title SHALL append their Wayfarer rank (e.g. `Warrior • Wayfarer I` through `Wayfarer VI`) on Camp cards and combat status frames.

#### Scenario: Computing hero title with off-node rank
- **WHEN** a hero with an active Warrior class reaches Level 2 at `(1, 1, 0)` (1 off-node milestone)
- **THEN** their display title updates to `Warrior • Wayfarer I`
