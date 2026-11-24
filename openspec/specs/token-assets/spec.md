# Token Assets Specification

## Purpose
Provides centralized resolution, preloading, and display styling for unit pixel tokens, multi-directional sprites, and class badge palettes across tactical combat and camp UI surfaces.

## Requirements

### Requirement: Pixel Token Asset Whitelist and Resolution
The system SHALL resolve pixel sprite token paths for all authored classes across Novice, Tier-1, Tier-2, Tier-3, and Tier-4 classes (Warrior, Cavalier, Knight, Berserker, Highwayman, Warlock, Thief, Infiltrator, Cat-burglar, Witch, Sorcerer, Wizard, Shield-bearer, Dragoon, Ballistician, Philanderer, Theurge, and Arcanist) using 8-directional idle rotation assets, falling back to male variant or vector fallback when specific sprite sets are unavailable.

#### Scenario: Resolving Tier-4 Shield-bearer pixel tokens
- **WHEN** `resolveTokenAssetPath` is called for a unit whose active class is Shield-bearer
- **THEN** the system resolves the corresponding pixel sprite URL from `/assets/tokens/pixel/05_human_male` matching the unit's facing direction

#### Scenario: Resolving Tier-4 Arcanist pixel tokens
- **WHEN** `resolveTokenAssetPath` is called for a unit whose active class is Arcanist
- **THEN** the system resolves the corresponding pixel sprite URL from `/assets/tokens/pixel/96_human_male/Idle/rotations/<direction>.png` matching the unit's facing direction

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

#### Scenario: Resolving badge palette for Tier-4 Arcanist
- **WHEN** `getClassBadgePalette` is requested for `arcanist`
- **THEN** the system returns the class's dedicated Deep Arcane Violet primary (`#5b21b6`) and Geometric Emerald border (`#10b981`) hex colors

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

### Requirement: Exact-Case Pixel Token Asset Parity
Every pixel token identifier registered in `AVAILABLE_PIXEL_TOKENS` (including Tier-4 Theurge `79_human_male`) SHALL have matching exact-case asset directories and rotation PNG files on disk at `public/assets/tokens/pixel/<tokenId>/Idle/rotations/<direction>.png` for all 8 standard directions (`east`, `north-east`, `north`, `north-west`, `west`, `south-west`, `south-east`, `south`), ensuring consistent rendering across both Windows development servers and case-sensitive production hosts.

#### Scenario: Theurge pixel token resolves to exact-case Idle asset files on disk
- **WHEN** `resolveTokenAssetPath` is called for a unit whose active class is Theurge
- **THEN** the resolved URL `/assets/tokens/pixel/79_human_male/Idle/rotations/<direction>.png` matches an exact-case `Idle` subdirectory and existing PNG file on disk

#### Scenario: All whitelisted pixel tokens pass exact-case disk parity validation
- **WHEN** the pixel token asset test suite inspects every entry in `AVAILABLE_PIXEL_TOKENS`
- **THEN** every token folder contains an exact-case `Idle` directory (not lowercase `idle`) with all 8 rotation PNG files present
