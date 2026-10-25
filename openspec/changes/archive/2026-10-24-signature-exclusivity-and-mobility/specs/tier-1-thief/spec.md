# Spec Delta: Tier 1 Thief (Shadow Step Flat Phase)

## ADDED Requirements

### Requirement: Shadow Step Domain Ability Execution
The system SHALL provide a domain combat ability `Shadow Step` costing 1 AP with range 2 targeting an unoccupied walkable hex (`targetType: 'HEX'`) that teleports the user across flat terrain, strictly restricted to destination hexes at the exact same elevation as the caster ($\Delta h = 0$). The ability execution SHALL fail validation if the destination elevation is higher or lower than the caster's current elevation.

#### Scenario: Phasing through intervening obstacles at same elevation
- **WHEN** a unit executes `Shadow Step` targeting an unoccupied walkable hex 2 hexes away where an intervening hex contains an obstacle or unit, and the destination elevation equals the caster's elevation ($\Delta h = 0$)
- **THEN** the unit teleports to the destination hex without collision or path obstruction, consuming 1 AP

#### Scenario: Rejecting upward cliff ascent
- **WHEN** a unit attempts to execute `Shadow Step` targeting a hex at a higher elevation ($\Delta h > 0$)
- **THEN** ability validation fails and returns an error indicating that Shadow Step cannot change elevation

#### Scenario: Rejecting downward ledge descent
- **WHEN** a unit attempts to execute `Shadow Step` targeting a hex at a lower elevation ($\Delta h < 0$)
- **THEN** ability validation fails and returns an error indicating that Shadow Step cannot change elevation
