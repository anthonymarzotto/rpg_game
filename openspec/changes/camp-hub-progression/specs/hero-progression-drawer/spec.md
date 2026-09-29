# Spec Delta

## Purpose
Provides a focused slide-over drawer in Camp for deep hero inspection, constellation pyramid exploration, archetype level advancement, and wildcard loadout customization.

## ADDED Requirements

### Requirement: Hero Progression Drawer Overlay
The system SHALL present a slide-over drawer overlay when the player clicks to inspect or level up any hero from the active vanguard or reserve barracks without unmounting or leaving the Camp Hub context.

#### Scenario: Opening hero progression drawer
- **WHEN** the player clicks `[ Inspect & Loadout ]` or `[ Level Up ]` on any hero card
- **THEN** the hero progression drawer slides into view displaying the selected hero's name, class, attributes, and constellation

#### Scenario: Dismissing progression drawer
- **WHEN** the player clicks the close button or clicks outside the drawer overlay
- **THEN** the drawer dismisses, returning focus to the Camp Hub with all hero adjustments preserved

### Requirement: In-Camp Level Advancement
The system SHALL allow players to spend accumulated archetype XP within the progression drawer to level up the inspected unit, unlocking the appropriate class node in their constellation and updating their stats according to campaign progression rules.

#### Scenario: Advancing level in Camp
- **WHEN** the player clicks an available archetype advancement option for a hero whose accumulated XP meets the requirement
- **THEN** the unit's level advances, the threshold XP is deducted from that archetype, their class unlocks in the constellation, and the changes immediately update the campaign roster

### Requirement: In-Camp Wildcard Loadout Customization
The system SHALL allow players to select and equip unlocked wildcard abilities and passive mastery traits for the inspected hero within the progression drawer.

#### Scenario: Configuring wildcard abilities
- **WHEN** the player selects an unlocked ability for a wildcard slot on the inspected unit
- **THEN** the unit's equipped loadout is updated and validated against their unlocked class constellation
