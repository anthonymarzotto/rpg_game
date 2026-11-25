# Hero Progression Drawer Specification

## Purpose
Provides a focused slide-over drawer in Camp for deep hero inspection, constellation pyramid exploration, archetype level advancement, and wildcard loadout customization.

## Requirements

### Requirement: Hero Progression Drawer Overlay
The system SHALL present a slide-over drawer overlay when the player clicks to inspect or level up any hero from the active vanguard or reserve barracks without unmounting or leaving the Camp Hub context.

#### Scenario: Opening hero progression drawer
- **WHEN** the player clicks `[ Inspect & Loadout ]` or `[ Level Up ]` on any hero card
- **THEN** the hero progression drawer slides into view displaying the selected hero's name, class, attributes, and constellation

#### Scenario: Dismissing progression drawer
- **WHEN** the player clicks the close button or clicks outside the drawer overlay
- **THEN** the drawer dismisses, returning focus to the Camp Hub with all hero adjustments preserved

### Requirement: In-Camp Level Advancement
The system SHALL allow players to spend accumulated archetype XP within the progression drawer to level up the inspected unit. When leveling into a canonical class coordinate, the class unlocks in the constellation. When leveling into an off-node coordinate, the unit unlocks a Starlight Waypoint in their constellation path and triggers the Off-Node Choice Modal (Wayfarer Attunement & Milestone Specialization). Advancement buttons in the drawer SHALL preview whether the upcoming level leads to a new Class unlock or an Off-Node Wayfarer Milestone, and SHALL format discipline spend actions using canonical Force, Finesse, and Focus terminology.

#### Scenario: Advancing level in Camp
- **WHEN** the player clicks an available archetype advancement option for a hero whose accumulated XP meets the requirement and matches a class node in the catalog
- **THEN** the unit's level advances, threshold XP is deducted, the class unlocks in their constellation, and the roster immediately updates

#### Scenario: Advancing level in Camp to an off-node coordinate
- **WHEN** the player clicks an available archetype advancement option for a hero whose next level leads to an off-node coordinate
- **THEN** the unit's level advances, threshold XP is deducted, their base attributes are awarded, their Starlight Waypoint is recorded, and the Off-Node Choice Modal (Wayfarer Attunement & Specialization) is presented to the player

#### Scenario: Previewing off-node rewards on spend buttons
- **WHEN** inspecting a hero in the progression drawer who has enough XP to advance into an off-node coordinate
- **THEN** the advancement button displays the impending off-node milestone preview (e.g. `🗡️ Ascend: Finesse (+1 Finesse) • ✦ Wayfarer Milestone`)

### Requirement: In-Camp Wildcard Loadout Customization
The system SHALL allow players to select and equip unlocked wildcard abilities and passive mastery traits for the inspected hero within the progression drawer.

#### Scenario: Configuring wildcard abilities
- **WHEN** the player selects an unlocked ability for a wildcard slot on the inspected unit
- **THEN** the unit's equipped loadout is updated and validated against their unlocked class constellation

### Requirement: Persistent Node & Waypoint Inspector Panel
The system SHALL render a persistent Inspector panel at the bottom of the Constellation section in the Hero Progression Drawer that dynamically toggles between Class Inspection and Waypoint Milestone Inspection based on the player's active selection:
1. **Class Inspection**: When a class node is selected, the panel SHALL display the class name, tier, attribute requirements, status, signature ability, domain abilities, passive trait, and attunement action button.
2. **Attuned Waypoint Inspection**: When an attuned Starlight Waypoint is selected, the panel SHALL display the waypoint coordinate, level reached, harmonization requirements, status, the specific defensive attunement chosen with its active stat bonuses, and the specific specialization chosen (unlocked domain ability with cost/domain or astral augment shard with socketing behavior).
3. **Potential Waypoint Inspection**: When an eligible un-attuned waypoint is selected, the panel SHALL display the waypoint coordinate, harmonization requirements, status, and an abbreviated overview of upcoming choices (defensive attunement triad and domain skill draft vs augment shard forge).

#### Scenario: Inspecting an attuned Starlight Waypoint in bottom panel
- **WHEN** a player clicks an attuned Starlight Waypoint `(1, 1, 0)` that was unlocked with *Wayfarer's Stride* and *Starlight Lens*
- **THEN** the bottom Inspector panel displays *Wayfarer's Stride* (+2 Evasion, +2 Speed) and *Starlight Lens* (+1 Range shard augment)

#### Scenario: Inspecting an eligible potential waypoint in bottom panel
- **WHEN** a player clicks an eligible un-attuned waypoint `(1, 1, 0)` on the star chart
- **THEN** the bottom Inspector panel displays the abbreviated milestone overview with the defensive attunement options (*Bastion*, *Stride*, *Ward*) and the choice between unlocking a domain skill or forging an augment shard

#### Scenario: Switching selection between class node and waypoint
- **WHEN** a player clicks a waypoint while a class node is currently pinned, or clicks a class node while a waypoint is pinned
- **THEN** the star chart highlights the newly selected node with an active halo and the bottom Inspector panel immediately swaps to the corresponding inspection mode

### Requirement: Node Scanner Discipline Indicators
The system SHALL render requirement and harmonization summaries in the Constellation Node Scanner using standard three-letter discipline abbreviations (`FRC`, `FIN`, `FOC`) to prevent single-letter ambiguity among the Force, Finesse, and Focus disciplines.

#### Scenario: Inspecting node requirements in scanner
- **WHEN** hovering over a constellation node or starlight waypoint in the star chart
- **THEN** the scanner renders requirements formatted with three-letter discipline tags (e.g. `2 FRC / 1 FIN / 0 FOC`)

### Requirement: Combat Manifest Ability Archetype Presentation
The Hero Progression Drawer SHALL render standard archetype discipline badges (`FORCE`, `FINESSE`, `FOCUS`) on class core abilities and resonant wildcard abilities in the Combat Manifest, and SHALL present every ability across the Combat Manifest, Class Inspector, Waypoint Inspector, and Off-Node Domain Skill Draft modal using the unified Hybrid Ability Description layout (thematic flavor sentence, scannable Stat Strip pills, and generated human-readable Effect Clauses).

When Astral Augment Shards are socketed into an ability slot in the Combat Manifest, the slot card SHALL immediately reflect the modified stats and any appended shard effects in the Stat Strip pills and Effect Clauses, highlighted in Shard provenance styling.

#### Scenario: Core abilities display archetype tags in Combat Manifest
- **WHEN** a player inspects any hero in the progression drawer
- **THEN** each core class ability card in the Combat Manifest displays an archetype badge (`FORCE`, `FINESSE`, or `FOCUS`) matching its declared discipline tag

#### Scenario: Visual consistency across core and wildcard ability mini cards
- **WHEN** viewing the Combat Manifest section of the progression drawer
- **THEN** core class abilities and resonant wildcard abilities utilize matching font, styling, and color coding for discipline badges, flavor text, Stat Strip pills, and Effect Clauses

#### Scenario: Socketing an Astral Augment Shard dynamically updates and highlights Combat Manifest ability stats
- **WHEN** a player sockets an Astral Augment Shard (such as *Bloodbound Shard*, *Starlight Lens*, or *Venom Shard*) into a core or wildcard ability slot in the Combat Manifest
- **THEN** the ability card's Stat Strip pills, cost badges, and Effect Clauses immediately update to display the augmented values (e.g., upgraded die tier, flat damage bonus, HP cost, or appended Poison effect) highlighted in Shard provenance color

### Requirement: Shard Compatibility Feedback & Automatic Unsocketing
When rendering the Astral Augment Shard selector dropdown for an ability slot in the Hero Progression Drawer Combat Manifest, the drawer SHALL evaluate every unassigned earned shard against the base ability currently occupying that slot:
- Compatible shards SHALL be selectable normally.
- Incompatible shards SHALL still be displayed in the dropdown as disabled options accompanied by a concise incompatibility reason (e.g., `Requires damaging attack`, `Requires hostile AoE`, `Requires melee attack`) so players understand why they cannot be socketed into that slot.

When the player changes a hero's active class or swaps/clears a wildcard ability in the Hero Progression Drawer, the drawer SHALL automatically unsocket any shard that is incompatible with the newly occupying ability in that slot (or left on an empty wildcard slot) before committing the updated loadout, returning those shards to the hero's unassigned shard inventory while keeping compatible shards socketed.

#### Scenario: Incompatible earned shards appear disabled with reason in slot dropdown
- **WHEN** a hero who owns `Starlight Lens` (requires damaging attack) and `Shadow Shard` (universal) inspects the shard selector for `Smoke Veil` (`SELF`, `damageType: 'NONE'`)
- **THEN** `Shadow Shard` appears as an enabled selectable option
- **THEN** `Starlight Lens` appears in the dropdown as a disabled option displaying its incompatibility reason

#### Scenario: Switching active class auto-unsockets incompatible shards and keeps compatible ones
- **WHEN** a hero with `Shadow Shard` and `Bloodbound Shard` socketed in core slot 0 (`Sneak Attack`) switches active class to `Knight` (putting `Lead the Charge`, a `SELF` non-damaging aura, in slot 0)
- **THEN** `Bloodbound Shard` is automatically removed from slot 0 and becomes available in the unassigned shard inventory
- **THEN** `Shadow Shard` remains socketed in slot 0 and augments `Lead the Charge`
- **THEN** the loadout update succeeds without validation error

### Requirement: Loadout Update Rejection Feedback and Domain-Delegated Pruning
The Hero Progression Drawer SHALL delegate automatic pruning of incompatible socketed shards to the campaign loadout update transition on every loadout update rather than duplicating conditional pruning logic inside the UI component.

When a loadout update is rejected by validation, the Hero Progression Drawer SHALL render a visible inline error message explaining the rejection reason (and clear it on the next successful edit or dismissal) instead of failing silently in the browser console.

#### Scenario: Editing passives on a hero with a legacy incompatible shard does not deadlock the drawer
- **WHEN** a player opens the Hero Progression Drawer for a hero whose saved loadout contains an incompatible socketed shard and changes their wildcard passive
- **THEN** the campaign transition prunes the incompatible shard automatically and commits the passive change cleanly

#### Scenario: Rejected loadout update displays visible inline feedback
- **WHEN** a loadout update submitted from the Hero Progression Drawer is rejected by validation
- **THEN** the drawer displays an inline error notice containing the rejection reason
- **THEN** a subsequent valid loadout update clears the error notice
