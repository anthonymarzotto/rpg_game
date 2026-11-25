# Spec Delta: Off-Node Progression

## MODIFIED Requirements

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

## ADDED Requirements

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
