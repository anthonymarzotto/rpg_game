# Spec Delta

## Purpose

Establishes the progression, calculation, and visual mechanics for the 39 off-node coordinates in the 100-class lattice, awarding Harmonization Stat Surges, a choice between Domain Skill Drafts and Ability Overclocks, Luminous Waypoints on the star chart, and Wayfarer Hero Titles.

## ADDED Requirements

### Requirement: Wayfarer Attunements & Choice Milestone
When a unit advances to an off-node level (a coordinate in the 100-class lattice with no canonical catalog class node), the system SHALL present an interactive two-step modal in Camp:
1. **Step 1: Wayfarer Attunement**: The player SHALL select one balanced defensive attunement to add to the unit's permanent derived vitals:
   - **Wayfarer's Bastion** (Force): $+6$ Max HP and $+1$ Armor.
   - **Wayfarer's Stride** (Finesse): $+2$ Evasion and $+2$ Speed.
   - **Wayfarer's Ward** (Focus): $+2$ Resolve and $+1$ Ward.
   - **Wayfarer's Zenith** (Tri-Centroid at Levels 3 & 6): $+4$ Max HP, $+1$ Armor, $+1$ Ward, $+1$ Speed, $+1$ Evasion, $+1$ Resolve.
2. **Step 2: Milestone Specialization**: The player SHALL select one of two strategic advancements:
   - **Domain Skill Unlock**: Deterministically select 1 unlearned domain ability from the advancing archetype's domain pool where $\text{Tier} \le \text{Current Unit Level}$, adding it to the hero's permanent Wildcard ability pool.
   - **Astral Augment Shard**: Select 1 socketable `AstralAugmentShard` module (e.g. *Starlight Lens*, *Astral Reach*, *Supernova Flare*, *Impact Shard*, *Venom Shard*, or *Static Shard*). Shards are assigned to an **Ability Slot** (0..4) in the hero's combat loadout, up to a maximum of **2 shards per slot**, augmenting whichever ability occupies that slot.

#### Scenario: Selecting a Wayfarer Attunement on off-node level-up
- **WHEN** a Level 1 Warrior `(1, 0, 0)` advances with Rogue XP to Level 2 `(1, 1, 0)` and the player selects *Wayfarer's Stride*
- **THEN** their derived vitals gain +2 Evasion and +2 Speed on top of standard attribute scaling, and the modal proceeds to Milestone Specialization

#### Scenario: Tri-centroid Wayfarer's Zenith option
- **WHEN** a unit advances from `(1, 1, 0)` with Mage XP to Level 3 `(1, 1, 1)`
- **THEN** the attunement selection includes *Wayfarer's Zenith*, granting +4 Max HP and +1 to all secondary defenses upon selection

#### Scenario: Unlocking an eligible tier-gated domain skill in step 2
- **WHEN** a Level 2 hero completes Step 1 with Rogue advancement and chooses Domain Skill Unlock
- **THEN** the system presents all unlearned Rogue domain abilities of Tier $\le 2$ (excluding Tier 3+), and adds the selected skill to the hero's permanent wildcard pool

#### Scenario: Earning and socketing an Astral Augment Shard to an ability slot
- **WHEN** a player completes Step 1 and chooses the Astral Augment Shard option
- **THEN** the player selects an augment shard, adding it to the hero's loadout inventory, which can be socketed into any ability slot (0..4, max 2 shards per slot)

#### Scenario: Swapping an ability in an augmented slot preserves socketed shards
- **WHEN** an ability slot holding an *Astral Reach* shard has its equipped ability changed in Camp
- **THEN** the socketed shard remains bound to that slot and dynamically applies its +1 Range modifier to the newly equipped ability

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
