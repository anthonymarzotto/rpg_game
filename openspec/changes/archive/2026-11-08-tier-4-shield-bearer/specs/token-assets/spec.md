# Token Assets Delta Specification

## MODIFIED Requirements

### Requirement: Pixel Token Asset Whitelist and Resolution
The system SHALL resolve pixel sprite token paths for all authored classes across Novice, Tier-1, Tier-2, Tier-3, and Tier-4 classes (Warrior, Cavalier, Knight, Berserker, Highwayman, Warlock, Thief, Infiltrator, Cat-burglar, Witch, Sorcerer, Wizard, and Shield-bearer) using 8-directional idle rotation assets, falling back to male variant or vector fallback when specific sprite sets are unavailable.

#### Scenario: Resolving Tier-4 Shield-bearer pixel tokens
- **WHEN** `resolveTokenAssetPath` is called for a unit whose active class is Shield-bearer
- **THEN** the system resolves the corresponding pixel sprite URL from `/assets/tokens/pixel/05_human_male` matching the unit's facing direction

#### Scenario: Resolving Tier-3 hybrid pixel tokens
- **WHEN** `resolveTokenAssetPath` is called for a unit whose active class is Cavalier, Berserker, Highwayman, Warlock, or Witch
- **THEN** the system resolves the corresponding pixel sprite URL from `/assets/tokens/pixel/` matching the unit's facing direction

#### Scenario: Graceful fallback for ungenerated sprites
- **WHEN** `resolveTokenAssetPath` is called for a class without generated pixel assets
- **THEN** the system returns null, allowing the UI to render the procedural vector token fallback

### Requirement: Class Badge Color Palettes
The system SHALL provide distinct, accessible primary and border color palettes for all authored classes and export a lookup helper that resolves the appropriate palette with a graceful fallback for unmapped classes.

#### Scenario: Resolving badge palette for Tier-4 Shield-bearer
- **WHEN** `getClassBadgePalette` is requested for `shield-bearer`
- **THEN** the system returns the class's dedicated Slate Iron primary (`#334155`) and Emerald border (`#10b981`) hex colors

#### Scenario: Resolving badge palette for Tier-3 classes
- **WHEN** `getClassBadgePalette` is requested for `cavalier`, `berserker`, `highwayman`, `warlock`, or `witch`
- **THEN** the system returns the class's dedicated primary and border hex colors

#### Scenario: Resolving badge palette for Tier-2 classes
- **WHEN** `getClassBadgePalette` is requested for `knight`, `infiltrator`, or `sorcerer`
- **THEN** the system returns distinct primary and border hex colors tailored to their archetypes

#### Scenario: Fallback for unknown class
- **WHEN** `getClassBadgePalette` is requested for an unknown or undefined class ID
- **THEN** the system returns a neutral slate fallback palette without error
