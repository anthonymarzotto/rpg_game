# Spec Delta

## Purpose

Provides an interactive pre-combat tactical deployment phase in the Combat Arena where players can inspect the generated terrain and enemy formation, reposition or swap their pre-placed units across the West deployment zone, remember formations by arena radius across encounters, and confirm deployment to trigger opening initiative and start Turn 1.

## ADDED Requirements

### Requirement: Pre-Combat Tactical Deployment Phase
When an interactive encounter begins without a pre-assigned active combatant, the Combat Arena SHALL enter a `DEPLOYMENT` phase prior to rolling opening initiative or advancing the Turn 1 clock. During the `DEPLOYMENT` phase, all player units and enemy units SHALL be visible on the battlefield, all walkable West deployment zone hexes SHALL be visually highlighted, and a Deployment HUD Bar SHALL be displayed with instructions, an `[ 🔀 Auto-Arrange ]` action, and a `[ ⚔️ Begin Trial ]` confirmation action.

#### Scenario: Entering deployment phase on trial mount
- **WHEN** the player deploys their squad from Camp (or starts an interactive trial without a forced active turn unit)
- **THEN** the Combat Arena starts in the `DEPLOYMENT` phase with `turnNumber` at `0`, all player units pre-placed on West deployment zone hexes facing East (`HEX_DIRECTIONS.EAST`), and all walkable West deployment hexes highlighted on the grid
- **AND** opening initiative rolls (`🎲 <roll>` floaters and Turn 0 initiative log card) and hostile AI turns are deferred until deployment is confirmed

#### Scenario: Skipping deployment phase when initialActiveUnitId is pre-set
- **WHEN** an encounter definition specifies `initialActiveUnitId` (or `startInDeployment` is explicitly set to `false`)
- **THEN** the simulation bypasses the `DEPLOYMENT` phase and initializes combat immediately on Turn 1

### Requirement: Click-to-Select, Move, and Swap Unit Repositioning
During the `DEPLOYMENT` phase, the player SHALL be able to select any friendly unit and reposition it to any empty walkable West deployment hex or swap its position with another friendly unit in the West deployment zone.

#### Scenario: Moving a selected player unit to an empty deployment hex
- **WHEN** a player unit is selected during the `DEPLOYMENT` phase and the player clicks an unoccupied walkable hex inside the West deployment zone
- **THEN** the selected unit moves immediately to that deployment hex, retains East facing (`HEX_DIRECTIONS.EAST`), and clears or updates the deployment selection cleanly

#### Scenario: Swapping two player units in the deployment zone
- **WHEN** Player Unit A is selected during the `DEPLOYMENT` phase and the player clicks Player Unit B occupying another West deployment hex
- **THEN** Player Unit A and Player Unit B swap hex coordinates, both face East (`HEX_DIRECTIONS.EAST`), and the active deployment selection clears so the next click can select any unit

#### Scenario: Clicking the already-selected player unit deselects it
- **WHEN** Player Unit A is selected during the `DEPLOYMENT` phase and the player clicks Player Unit A's hex again
- **THEN** Player Unit A is deselected

#### Scenario: Inspecting enemy units or clicking outside the deployment zone during deployment
- **WHEN** the player clicks an enemy combatant during the `DEPLOYMENT` phase
- **THEN** the enemy combatant is pinned in the `UnitStatusCard` for inspection without moving any player unit
- **AND** clicking an unoccupied hex outside the West deployment zone does not move the selected player unit

### Requirement: Auto-Arrange and Per-Radius Formation Memory
The system SHALL persist the player's confirmed deployment coordinates keyed by arena radius and unit ID, automatically restoring remembered coordinates on subsequent trials of the same arena radius and providing an `[ 🔀 Auto-Arrange ]` control to reset unit positions to the role-aware tactical formation.

#### Scenario: Remembering and restoring player formation across trials
- **WHEN** the player confirms deployment via `[ ⚔️ Begin Trial ]` on an arena of radius $R$
- **THEN** the system saves each deployed player unit's coordinate for radius $R$
- **AND** when a subsequent encounter of radius $R$ enters the `DEPLOYMENT` phase (or when the current trial is reset), any deployed player unit with a valid, unoccupied walkable remembered coordinate in the West deployment zone is pre-placed on that remembered coordinate, while any remaining units are placed via the role-aware tactical formation placer

#### Scenario: Resetting formation via Auto-Arrange
- **WHEN** the player clicks `[ 🔀 Auto-Arrange ]` during the `DEPLOYMENT` phase
- **THEN** all player units are repositioned onto the West deployment zone according to the role-aware tactical formation placer (frontline Brawlers forward-center, Skirmishers on wings, Snipers/Supports on elevated or screened backline hexes)

### Requirement: Confirming Deployment Initiates Initiative Rolling and Turn 1
When the player confirms their formation via `[ ⚔️ Begin Trial ]`, the system SHALL lock in the deployed unit coordinates, roll opening 1d20 initiative for all combatants, trigger `BATTLE_START` passives, emit staggered `🎲 <roll>` floating badges and the Turn 0 initiative combat log entry, and advance the CTB clock to Turn 1.

#### Scenario: Clicking Begin Trial transitions from DEPLOYMENT to active combat
- **WHEN** the player clicks `[ ⚔️ Begin Trial ]` during the `DEPLOYMENT` phase
- **THEN** all player units lock in their current deployment coordinates facing East
- **AND** the combat state rolls opening initiative (with anti-alpha-strike guardrail), triggers `BATTLE_START` passives, logs the Turn 0 initiative rolls, launches the staggered `🎲 <roll>` floating text sequence, and transitions `phase` to `PLAYER_ACTION` or `HOSTILE_TURN` for Turn 1
