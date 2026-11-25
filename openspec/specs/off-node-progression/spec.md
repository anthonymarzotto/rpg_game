# Off-Node Progression Specification

## Purpose
Establishes the progression, calculation, and visual mechanics for the 39 off-node coordinates in the 100-class lattice, awarding Harmonization Stat Surges, a choice between Domain Skill Drafts and Ability Overclocks, Luminous Waypoints on the star chart, and Wayfarer Hero Titles.

## Requirements

### Requirement: Wayfarer Attunements & Choice Milestone
When a unit advances to an off-node level (a coordinate in the 100-class lattice with no canonical catalog class node), the system SHALL present an interactive two-step modal in Camp:
1. **Step 1: Wayfarer Attunement**: The player SHALL select one balanced defensive attunement to add to the unit's permanent derived vitals:
   - **Wayfarer's Bastion** (Force): $+6$ Max HP and $+1$ Armor.
   - **Wayfarer's Stride** (Finesse): $+2$ Evasion and $+2$ Speed.
   - **Wayfarer's Ward** (Focus): $+2$ Resolve and $+1$ Ward.
   - **Wayfarer's Zenith** (Tri-Centroid at Levels 3 & 6): $+4$ Max HP, $+1$ Armor, $+1$ Ward, $+1$ Speed, $+1$ Evasion, $+1$ Resolve.
2. **Step 2: Milestone Specialization**: The player SHALL select one of two strategic advancements:
   - **Domain Skill Unlock**: Deterministically select 1 unlearned domain ability from the advancing archetype's domain pool where $\text{Tier} \le \text{Current Unit Level}$, adding it to the hero's permanent Wildcard ability pool.
   - **Astral Augment Shard**: Select 1 socketable `AstralAugmentShard` module (e.g. *Starlight Lens*, *Astral Reach*, *Supernova Flare*, *Impact Shard*, *Venom Shard*, or *Static Shard*). Shards are assigned to compatible **Ability Slots** (0..4) in the hero's combat loadout, up to a maximum of **2 shards per slot**, augmenting whichever compatible ability occupies that slot.

The system SHALL record the player's choices as a first-class provenance entry in `milestoneSelections[coordKey]` on the unit's progression record, capturing `attunementId` and the chosen `reward` (`ABILITY` with `abilityId` or `SHARD` with `shardId`).

When a unit's equipped ability in a slot changes in Camp (via switching active class or swapping a wildcard ability), any socketed shard that remains compatible with the newly equipped ability SHALL remain bound to that slot, while any socketed shard that is incompatible with the newly equipped ability (or left in an empty wildcard slot) SHALL automatically be unsocketed back into the unit's unassigned shard inventory.

#### Scenario: Selecting a Wayfarer Attunement on off-node level-up
- **WHEN** a Level 1 Warrior `(1, 0, 0)` advances with Rogue XP to Level 2 `(1, 1, 0)` and the player selects *Wayfarer's Stride*
- **THEN** their derived vitals gain +2 Evasion and +2 Speed on top of standard attribute scaling, and the modal proceeds to Milestone Specialization

#### Scenario: Storing milestone selection provenance on progression record
- **WHEN** a player completes Step 1 and Step 2 of the Off-Node Choice Modal for coordinate `(1, 1, 0)` with *Wayfarer's Stride* and *Starlight Lens*
- **THEN** the unit's `progression.milestoneSelections['1,1,0']` records `{ attunementId: 'wayfarer_stride', reward: { type: 'SHARD', shardId: 'starlight_lens' } }`

#### Scenario: Tri-centroid Wayfarer's Zenith option
- **WHEN** a unit advances from `(1, 1, 0)` with Mage XP to Level 3 `(1, 1, 1)`
- **THEN** the attunement selection includes *Wayfarer's Zenith*, granting +4 Max HP and +1 to all secondary defenses upon selection

#### Scenario: Unlocking an eligible tier-gated domain skill in step 2
- **WHEN** a Level 2 hero completes Step 1 with Rogue advancement and chooses Domain Skill Unlock
- **THEN** the system presents all unlearned Rogue domain abilities of Tier $\le 2$ (excluding Tier 3+), and adds the selected skill to the hero's permanent wildcard pool and milestone selection record

#### Scenario: Earning and socketing an Astral Augment Shard to an ability slot
- **WHEN** a player completes Step 1 and chooses the Astral Augment Shard option
- **THEN** the player selects an augment shard, adding it to the hero's loadout inventory, which can be socketed into any compatible ability slot (0..4, max 2 shards per slot)

#### Scenario: Swapping an ability in an augmented slot preserves socketed shards
- **WHEN** an ability slot holding an *Astral Reach* shard has its equipped ability changed in Camp to another compatible ability (with `range >= 1` and non-cone)
- **THEN** the socketed shard remains bound to that slot and dynamically applies its +1 Range modifier to the newly equipped ability

#### Scenario: Swapping an ability in an augmented slot auto-unsockets incompatible shards
- **WHEN** an ability slot holding both *Shadow Shard* (universal) and *Keen Shard* (requires damaging attack) has its equipped ability changed from `Sneak Attack` to `Lead the Charge` (`SELF` non-damaging aura)
- **THEN** *Shadow Shard* remains socketed in that slot and applies to `Lead the Charge`
- **THEN** *Keen Shard* is automatically unsocketed from that slot and returned to the unit's unassigned shard inventory

### Requirement: Luminous Waypoint Constellation Integration
The Constellation Star Chart SHALL calculate and render illuminated **Starlight Waypoints** at the exact barycentric coordinates for off-node points along triangle facet edges. When unlocked, the constellation laser path SHALL route through the waypoint.

The Star Chart and Node Scanner HUD SHALL provide two levels of inspection for Starlight Waypoints:
1. **Floating Hover Scanner**: Hovering over any visible waypoint SHALL display a compact, minimal 3-line readout containing Node Title & Tier (`★ Waypoint (F,R,M) Tier T`), Harmonization attributes, and status (`★ Milestone Attuned` or `✦ Next Waypoint • +1 <Archetype>`). It SHALL NOT display wrapped multi-line titles or wrapped option lists.
2. **Interactive Waypoint Pinning**: Clicking any visible waypoint SHALL select the waypoint, pin its visual marker with an active diamond halo, and populate the bottom persistent Inspector panel with its milestone details.

#### Scenario: Routing constellation laser line through an off-node waypoint
- **WHEN** a unit with an unlocked path `Warrior (1, 0, 0)` $\rightarrow$ `(1, 1, 0)` $\rightarrow$ `Cavalier (2, 1, 0)` is inspected in the Constellation
- **THEN** the glowing laser polyline connects from the Warrior star node, through the (1,1,0) Starlight Waypoint, to the Cavalier star node

#### Scenario: Hovering over a Starlight Waypoint
- **WHEN** a player hovers over an off-node waypoint on the constellation
- **THEN** the Node Scanner HUD displays a compact 3-line card with single-line Title/Tier, Harmonization requirements, and single-line status without multi-line wrapping or an option list

#### Scenario: Clicking a waypoint pins it for bottom panel inspection
- **WHEN** a player clicks a waypoint on the Constellation Star Chart
- **THEN** the waypoint is marked as selected on the chart and the bottom persistent Inspector panel updates to display that waypoint's milestone details

### Requirement: Wayfarer Hero Titles
The progression system SHALL compute a dynamic "Wayfarer Rank" based on the total number of off-node milestones the hero has achieved. The hero's active title SHALL append their Wayfarer rank (e.g. `Warrior • Wayfarer I` through `Wayfarer VI`) on Camp cards and combat status frames.

#### Scenario: Computing hero title with off-node rank
- **WHEN** a hero with an active Warrior class reaches Level 2 at `(1, 1, 0)` (1 off-node milestone)
- **THEN** their display title updates to `Warrior • Wayfarer I`

### Requirement: Declarative Astral Augment Shard Compatibility & Strict Validation
Every registered `AstralAugmentShard` SHALL declare structural ability compatibility criteria evaluated by a deterministic pure compatibility check against the base `Ability` occupying a loadout slot, returning both a boolean result and a concise human-readable incompatibility reason when ineligible:
- **Damage Scaling** (`starlight_lens`, `force_shard`, `keen_shard`, `momentum_shard`, `bloodbound_shard`, `fury_shard`): requires a damaging attack (`damageType !== 'NONE'`).
- **Arcane Conversion** (`aether_shard`): requires a physical damaging attack (`damageType === 'PHYSICAL'`).
- **Range Geometry** (`astral_reach`): requires a non-cone ability with `range >= 1`.
- **Hostile AoE Geometry** (`supernova_flare`): requires a non-cone hostile AoE ability (`aoeRadius >= 1` and either `damageType !== 'NONE'` or hostile `targetType === 'HEX'` utility such as `Flash Powder` or `Shrapnel Canister`, excluding friendly `SELF` auras).
- **Hostile Infusions** (`impact_shard`, `venom_shard`, `pyre_shard`, `static_shard`, `mire_shard`, `vanguard_shard`, `confrontation_shard`, `hex_shard`, `toll_shard`, `repelling_shard`, `concussion_shard`, `holdup_shard`): requires a hostile-targeting ability (damaging attacks, single-target hostile utilities, hostile AoE utilities that target units, and delayed bombardments; excludes `SELF`, `ALLY`, `TELEPORT`, and `SHRAPNEL_RUBBLE`).
- **Melee Geometry** (`cleave_shard`, `trample_shard`): requires a melee single-target damaging attack (`damageType !== 'NONE'`, `targetType === 'SINGLE_TARGET'`, `range === 1`, no `aoeRadius`, no `coneTemplate`).
- **Single-Target Recoil Geometry** (`recoil_shard`, `buckshot_shard`): requires a single-target damaging attack (`damageType !== 'NONE'`, `targetType === 'SINGLE_TARGET'`, no `aoeRadius`, no `coneTemplate`), permitting both melee and ranged attacks.
- **Unit Swap** (`interchange_shard`): requires a single-unit ability (`targetType === 'SINGLE_TARGET'` or `targetType === 'ALLY'`, no `aoeRadius`, no `coneTemplate`).
- **Hit-Triggered Self-Buffs** (`aegis_shard`, `warding_shard`, `flourish_shard`, `carapace_shard`): requires a damaging attack (`damageType !== 'NONE'`).
- **Universal Self-Buffs** (`shadow_shard`, `bastion_shard`, `anchorite_shard`): compatible with any ability.

Loadout validation SHALL strictly reject any loadout containing a shard socketed into an empty slot or into a slot whose resolved base ability fails compatibility evaluation, returning a descriptive validation error without silent legacy fallback shims.

#### Scenario: Rejecting incompatible shard during loadout validation
- **WHEN** loadout validation evaluates a loadout with `Aether Shard` or `Venom Shard` socketed on `Minor Ward` (`ALLY`, `damageType: 'NONE'`) or `Supernova Flare` socketed on `Shadow Step` (`TELEPORT`)
- **THEN** validation fails (`valid: false`) with a reason describing the incompatibility

#### Scenario: Allowing Supernova Flare on damaging AoE attacks and hostile utility AoEs
- **WHEN** shard compatibility evaluates `Supernova Flare` against `Arcane Blast`, `Siege Barrage`, `Flash Powder`, and `Shrapnel Canister`
- **THEN** all four evaluate as compatible
- **WHEN** shard compatibility evaluates `Supernova Flare` against `Sneak Attack`, `Shadow Step`, `Wyrmflame Breath`, and `Lead the Charge`
- **THEN** all four evaluate as incompatible with descriptive reasons

#### Scenario: Allowing Recoil Shard on ranged single-target attacks while restricting Cleave and Trample to melee
- **WHEN** shard compatibility evaluates `Recoil Shard`, `Buckshot Shard`, `Cleave Shard`, and `Trample Shard` against `Sighting Bolt` (`range: 4`, `SINGLE_TARGET`, `PHYSICAL`)
- **THEN** `Recoil Shard` and `Buckshot Shard` evaluate as compatible
- **THEN** `Cleave Shard` and `Trample Shard` evaluate as incompatible (`Requires melee attack`)

### Requirement: Intent-Driven Shard Compatibility and Domain-Boundary Enforcement
Astral Augment Shard compatibility evaluation SHALL determine whether an ability is hostile from an explicit declarative intent contract (`'HOSTILE' | 'FRIENDLY' | 'SELF'`, declared explicitly on non-damaging ground-targeted `HEX` abilities and defaulting safely to non-hostile for unannotated non-damaging `HEX` abilities) and SHALL determine whether an ability supports hostile target infusions from centralized effect metadata capabilities rather than hard-coded effect-type exclusions.

Automatic pruning of incompatible or empty-slot socketed shards SHALL be enforced at the campaign domain boundary (`updateCampUnitLoadout`) on every loadout update before strict loadout validation, returning any removed shards to the unit's unassigned shard inventory.

Combat loadout resolution (`resolveUnitLoadout`) SHALL defensively skip any socketed shard that fails compatibility evaluation against the slot's base ability so legacy or externally modified saves containing incompatible shards never apply illegal modifiers during combat.

#### Scenario: Unannotated friendly ground-targeted AoE rejects hostile infusion shards
- **WHEN** shard compatibility evaluates `Venom Shard` or `Supernova Flare` against a non-damaging ground-targeted `HEX` AoE ability with `intent: 'FRIENDLY'` (or omitted `intent`)
- **THEN** both shards evaluate as incompatible rather than treating every non-teleport `HEX` AoE as hostile

#### Scenario: Campaign loadout transition auto-prunes incompatible shards regardless of caller
- **WHEN** `updateCampUnitLoadout` is called directly to switch a hero's active class, change a wildcard ability, or update a wildcard passive on a unit whose loadout contains an incompatible shard
- **THEN** incompatible shards are automatically pruned back into the unit's unassigned shard inventory before validation
- **THEN** compatible shards remain socketed and the transition succeeds without throwing

#### Scenario: Combat loadout resolution skips incompatible shards from legacy saves
- **WHEN** `resolveUnitLoadout` hydrates combat abilities for a hero loaded from a legacy save that has `Aether Shard` socketed on `Minor Ward` (`ALLY`, `damageType: 'NONE'`) alongside `Shadow Shard` (`ANY`)
- **THEN** `Aether Shard` is skipped and `Minor Ward` retains `damageType: 'NONE'` and `defenseTarget: 'NONE'`
- **THEN** `Shadow Shard` still applies cleanly to `Minor Ward`
