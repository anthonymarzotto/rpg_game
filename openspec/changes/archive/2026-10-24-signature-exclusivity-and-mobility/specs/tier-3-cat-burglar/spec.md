# Spec Delta: Tier 3 Cat-burglar (Rooftop Vault Range 3)

## MODIFIED Requirements

### Requirement: Rooftop Vault Signature Ability
The system SHALL provide a signature combat ability `Rooftop Vault` costing 1 AP with range 3 targeting an unoccupied walkable hex (`targetType: 'HEX'`) that leaps to the destination hex ignoring intervening units, obstacles, and elevation climb barriers ($\Delta h \ge 2$), emitting a displacement event and granting the user +2 Evasion for 1 turn upon landing.

#### Scenario: Vaulting up cliffs onto high ground
- **WHEN** a unit executes `Rooftop Vault` targeting an unoccupied walkable hex at an elevation difference $\Delta h \ge 2$ within 3 hexes
- **THEN** the unit is displaced to the target hex, current AP is reduced by 1, and the unit gains a +2 Evasion modifier for 1 turn

#### Scenario: Vaulting over intervening obstacles
- **WHEN** a unit executes `Rooftop Vault` targeting an unoccupied walkable hex up to 3 hexes away where intermediate hexes contain unwalkable obstacles or other units
- **THEN** the ability execution succeeds and repositions the unit to the target hex without colliding with the obstacle
