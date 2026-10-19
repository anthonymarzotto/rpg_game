# Spec Delta: Hero Progression Drawer

## ADDED Requirements

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
