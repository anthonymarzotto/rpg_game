# Spec Delta: Campaign Progression (Signature Exclusivity)

## MODIFIED Requirements

### Requirement: Camp Roster and Loadout Management
In Camp, the system SHALL allow players to change a unit's active class from their unlocked constellation, configure wildcard ability and passive slots, and assign which roster units are deployed in the active combat squad.
The system SHALL strictly restrict wildcard ability slots to Domain Pool abilities from unlocked constellation classes and off-node milestone unlocked abilities. Signature Abilities of any class SHALL be exclusive to that class when active, and SHALL NOT be equipable in wildcard or resonant slots.

#### Scenario: Updating equipped class and wildcards
- **WHEN** a player configures a unit's loadout with an unlocked active class and valid wildcard abilities
- **THEN** the unit's loadout is updated in the campaign roster and validated against constellation constraints, successfully accepting valid domain abilities and rejecting any class's signature ability with a validation error

#### Scenario: Setting active combat squad
- **WHEN** a player assigns up to 3 units from the roster to `activeSquadIds`
- **THEN** the campaign state updates its active squad for the next battle deployment
