# Unit Naming & Customization Specification

## Purpose

Provides procedural astral enemy titling, modular player recruit naming with titles and epithets from an easily extensible data catalog, and in-game hero renaming in the progression drawer.

## Requirements

### Requirement: Extensible Centralized Name Catalog
The system SHALL provide a centralized, zero-dependency data catalog exporting modular, typed collections of male fantasy first names, surnames and noble houses, compound astral epithets, and enemy astral adjectives. Adding new naming entries SHALL require editing only these static data collections without altering generation algorithms or UI logic.

#### Scenario: Appending new name entries
- **WHEN** a contributor adds new entries to the exported name arrays
- **THEN** all downstream recruit generators and encounter builders immediately incorporate the new entries without code changes or schema migrations

#### Scenario: Typed catalog structure
- **WHEN** the name catalog is imported
- **THEN** it exposes distinct readonly string arrays for male first names, surnames/houses, compound astral epithets, and enemy astral adjectives

### Requirement: Procedural Astral Enemy Titling and Disambiguation
The combat encounter generator SHALL assign procedural astral adjective titles to enemy combatants, selecting adjectives without replacement per trial squad to ensure every hostile unit has a distinct, readable name.

#### Scenario: Multiple enemies of the same class receive distinct titles
- **WHEN** an encounter is generated containing multiple enemies of the same class (e.g., three Novices)
- **THEN** each enemy is assigned a distinct astral adjective from the catalog (e.g., `Ash Novice`, `Dusk Novice`, `Umbral Novice`)
- **AND** no two enemies in the same encounter share an identical name unless the adjective pool is exhausted

#### Scenario: Battlefield and ribbon visibility for enemy titles
- **WHEN** enemy combatants are rendered on the hex arena and timeline ribbon
- **THEN** the standee name plate, timeline chip, combat action log, and status card display the full two-word enemy title without string truncation

### Requirement: Procedural Player Recruit Name Generation
The campaign initialization and recruit hiring systems SHALL generate player recruits using a compound naming convention that pairs a masculine fantasy first name with an astral surname, house, or compound epithet.

#### Scenario: Procedural recruit generation
- **WHEN** a new campaign is started or a novice is recruited in camp
- **THEN** the recruit's full name is generated as `[First Name] [Surname/Epithet]` using the deterministic PRNG seed
- **AND** the chosen first name is unique among active squad members

#### Scenario: Scaled combat presentation of player names
- **WHEN** a player unit is rendered in combat
- **THEN** the standee name plate and timeline chip display their primary first name for clean, uncluttered layout
- **AND** the unit status card, progression drawer, camp hub, and combat action log display their full compound title

### Requirement: In-Game Hero Renaming Lifecycle
The `HeroProgressionDrawer` SHALL provide an inline renaming interface allowing the player to customize any hero's name at any time in camp.

#### Scenario: Activating rename edit mode
- **WHEN** the player clicks the edit pencil button `[✎]` beside the hero's name in the drawer header
- **THEN** the name displays as an editable inline text input with autofocus and the current name pre-selected

#### Scenario: Committing valid hero name
- **WHEN** the player enters a valid name (2 to 24 characters, non-empty after trimming) and presses `Enter` or clicks the confirm button `[✓]`
- **THEN** the hero's name is updated across `campaign.roster` and saved immediately to persistent storage
- **AND** the new name is immediately reflected across all camp views and subsequent trials

#### Scenario: Canceling rename reverts to previous name
- **WHEN** the player presses `Escape` or clicks the cancel button `[✕]`
- **THEN** the inline input closes and the hero's name reverts to its previous value without updating state or storage
