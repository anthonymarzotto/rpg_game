# Token Assets Specification

## Purpose
Provides centralized resolution, preloading, and display styling for unit pixel tokens, multi-directional sprites, and class badge palettes across tactical combat and camp UI surfaces.

## Requirements

### Requirement: Pixel Token Asset Whitelist and Resolution
The system SHALL resolve pixel sprite token paths for all authored classes across Novice, Tier-1, Tier-2, and Tier-3 hybrid classes (Warrior, Cavalier, Knight, Berserker, Highwayman, Warlock, Thief, Infiltrator, Cat-burglar, Witch, Sorcerer, Wizard) using 8-directional idle rotation assets, falling back to male variant or vector fallback when specific sprite sets are unavailable.

#### Scenario: Resolving Tier-3 hybrid pixel tokens
- **WHEN** `resolveTokenAssetPath` is called for a unit whose active class is Cavalier, Berserker, Highwayman, Warlock, or Witch
- **THEN** the system resolves the corresponding pixel sprite URL from `/assets/tokens/pixel/` matching the unit's facing direction

#### Scenario: Graceful fallback for ungenerated sprites
- **WHEN** `resolveTokenAssetPath` is called for a class without generated pixel assets
- **THEN** the system returns null, allowing the UI to render the procedural vector token fallback

### Requirement: Class Badge Color Palettes
The system SHALL provide distinct, accessible primary and border color palettes for all authored classes and export a lookup helper that resolves the appropriate palette with a graceful fallback for unmapped classes.

#### Scenario: Resolving badge palette for Tier-3 classes
- **WHEN** `getClassBadgePalette` is requested for `cavalier`, `berserker`, `highwayman`, `warlock`, or `witch`
- **THEN** the system returns the class's dedicated primary and border hex colors

#### Scenario: Resolving badge palette for Tier-2 classes
- **WHEN** `getClassBadgePalette` is requested for `knight`, `infiltrator`, or `sorcerer`
- **THEN** the system returns distinct primary and border hex colors tailored to their archetypes

#### Scenario: Fallback for unknown class
- **WHEN** `getClassBadgePalette` is requested for an unknown or undefined class ID
- **THEN** the system returns a neutral slate fallback palette without error

### Requirement: Unit Status Card Badge Theming
The combat status overlay SHALL render unit class badges styled dynamically according to the unit's active class badge palette.

#### Scenario: Displaying active unit status card
- **WHEN** an active combatant's unit card is displayed in `UnitStatusCard`
- **THEN** the class role badge displays the unit's current level and class name with styling derived from the unit's class badge palette
