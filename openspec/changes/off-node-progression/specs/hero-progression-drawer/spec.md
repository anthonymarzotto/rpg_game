# Spec Delta

## MODIFIED Requirements

### Requirement: In-Camp Level Advancement
The system SHALL allow players to spend accumulated archetype XP within the progression drawer to level up the inspected unit. When leveling into a canonical class coordinate, the class unlocks in the constellation. When leveling into an off-node coordinate, the unit unlocks a Starlight Waypoint in their constellation path and triggers the Off-Node Choice Modal (Wayfarer Attunement & Milestone Specialization). Advancement buttons in the drawer SHALL preview whether the upcoming level leads to a new Class unlock or an Off-Node Wayfarer Milestone.

#### Scenario: Advancing level in Camp
- **WHEN** the player clicks an available archetype advancement option for a hero whose accumulated XP meets the requirement and matches a class node in the catalog
- **THEN** the unit's level advances, threshold XP is deducted, the class unlocks in their constellation, and the roster immediately updates

#### Scenario: Advancing level in Camp to an off-node coordinate
- **WHEN** the player clicks an available archetype advancement option for a hero whose next level leads to an off-node coordinate
- **THEN** the unit's level advances, threshold XP is deducted, their base attributes are awarded, their Starlight Waypoint is recorded, and the Off-Node Choice Modal (Wayfarer Attunement & Specialization) is presented to the player

#### Scenario: Previewing off-node rewards on spend buttons
- **WHEN** inspecting a hero in the progression drawer who has enough XP to advance into an off-node coordinate
- **THEN** the advancement button displays the impending off-node milestone preview (e.g. `🗡️ Ascend: Rogue (+1 Finesse) • ✦ Wayfarer Milestone`)
