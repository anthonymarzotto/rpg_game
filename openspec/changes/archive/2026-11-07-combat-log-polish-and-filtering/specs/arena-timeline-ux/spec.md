# Spec Delta

## ADDED Requirements

### Requirement: Faction-Themed Combat Log Event Cards
The combat log panel SHALL format and color every event card according to the acting combatant's faction allegiance, supporting player, enemy, and neutral entities.

#### Scenario: Player action cards receive starlight cyan theming
- **WHEN** an event is logged where the acting combatant belongs to the `PLAYER` faction
- **THEN** the combat card SHALL render with player-thematic borders and background accents (`.faction-player`)
- **AND** the actor's display name SHALL render in high-contrast cyan (`#7dd3fc`)

#### Scenario: Enemy action cards receive void crimson theming
- **WHEN** an event is logged where the acting combatant belongs to the `ENEMY` faction
- **THEN** the combat card SHALL render with enemy-thematic borders and background accents (`.faction-enemy`)
- **AND** the actor's display name SHALL render in high-contrast rose/crimson (`#fca5a5`)

#### Scenario: Neutral and ambient entity action cards receive celestial amber theming
- **WHEN** an event is logged where the acting entity belongs to the `NEUTRAL` faction or an ambient arena hazard
- **THEN** the combat card SHALL render with neutral amber borders and accents (`.faction-neutral`)
- **AND** the actor's display name SHALL render in warm amber (`#fcd34d`)

### Requirement: Structured Passive and Environmental Hazard Cards
The combat logging pipeline SHALL emit structured, first-class event cards for passive trait activations and environmental hazard outcomes rather than falling back to unstyled generic text.

#### Scenario: Feline Grace negating ledge fall damage renders styled passive card
- **WHEN** a combatant with fall damage immunity plunges from a ledge of two or more elevation tiers
- **THEN** the combat log SHALL emit a structured `PASSIVE` card with badge `⚡ PASSIVE`
- **AND** the card header SHALL display the passive name `Feline Grace` and actor name with appropriate faction theming
- **AND** the card body SHALL explicitly state that fall impact damage was negated

#### Scenario: Direct ledge plunge inflicting fall damage renders styled environment hazard card
- **WHEN** a combatant without fall damage immunity plunges from a ledge of two or more elevation tiers and suffers fall impact damage
- **THEN** the combat log SHALL emit a structured `ENVIRONMENT` card with badge `⚠️ HAZARD`
- **AND** the card SHALL display the actor name, fall impact damage dealt, and remaining target HP

### Requirement: Interactive Combat Log Unit Filtering
The combat log panel SHALL provide an interactive unit filter selector in the chronicle header, allowing players to view actions focused on a specific combatant.

#### Scenario: All Units view displays full sequential chronicle
- **WHEN** the unit filter is set to `All Units`
- **THEN** all logged actions across all combatants SHALL be rendered in reverse chronological order according to active type filters

#### Scenario: Selecting a unit filters to relevant actions
- **WHEN** a player selects a specific unit from the unit filter selector
- **THEN** the combat log SHALL only display event cards where the selected unit was:
  - the primary actor of the action, OR
  - the primary targeted combatant, OR
  - caught within secondary, splash, or area effect damage
- **AND** unrelated actions SHALL be hidden from view

#### Scenario: Empty state for filtered unit with no events
- **WHEN** a unit is selected that has participated in zero actions matching the current filter criteria
- **THEN** the combat log SHALL display an empty state hint confirming no actions have been logged for that unit yet
