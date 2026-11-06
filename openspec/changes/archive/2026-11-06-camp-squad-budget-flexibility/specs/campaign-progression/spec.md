# Spec Delta: Campaign Progression

## MODIFIED Requirements

### Requirement: Camp Roster and Loadout Management
In Camp, the system SHALL allow players to change a unit's active class from their unlocked constellation, configure wildcard ability and passive slots, and assign which roster units are deployed in the active combat squad.
The system SHALL strictly restrict wildcard ability slots to Domain Pool abilities from unlocked constellation classes and off-node milestone unlocked abilities. Signature Abilities of any class SHALL be exclusive to that class when active, and SHALL NOT be equipable in wildcard or resonant slots.
The system SHALL allow players to reconfigure the active combat squad (attuning, withdrawing, or swapping wayfarers) in Camp regardless of whether the intermediate squad threat exceeds the stage deployment point budget.
The system SHALL enforce the stage deployment threat point budget at trial embarkation, deactivating deployment into combat whenever active squad threat exceeds the stage deployment budget or the active squad has fewer than the minimum required units.
When reconfiguring the active combat squad in Camp, the system SHALL preserve the existing generated enemy incursion and arena layout, updating only the deployed player units and their deployment coordinates.

#### Scenario: Updating equipped class and wildcards
- **WHEN** a player configures a unit's loadout with an unlocked active class and valid wildcard abilities
- **THEN** the unit's loadout is updated in the campaign roster and validated against constellation constraints, successfully accepting valid domain abilities and rejecting any class's signature ability with a validation error

#### Scenario: Setting active combat squad
- **WHEN** a player assigns units from the roster to `activeSquadIds` whose combined threat points do not exceed the stage deployment budget
- **THEN** the campaign state updates its active squad for the next battle deployment, synchronizing placed player units in `currentEncounter` while preserving the existing enemy roster and arena topography

#### Scenario: Setting active combat squad within stage deployment budget
- **WHEN** a player assigns units from the roster whose combined threat points do not exceed the stage's deployment point budget (e.g. 115 points deployed under a 120-point cap)
- **THEN** the campaign state updates `activeSquadIds` and updates placed player units in `currentEncounter` while preserving the existing enemy roster and arena topography

#### Scenario: Rejecting active combat squad exceeding stage deployment budget
- **WHEN** a player attempts to embark on a combat trial with an active combat squad whose combined threat points exceed the stage deployment point budget
- **THEN** combat embarkation is rejected with the Expedition War Room deactivating the deployment action, omitting the inline warning text, and displaying the budget overage details via the button's tooltip until the squad is within budget

#### Scenario: Permitting active combat squad configuration exceeding stage deployment budget in Camp
- **WHEN** a player withdraws, swaps, or configures units in Camp such that the resulting active squad threat exceeds the stage deployment point budget
- **THEN** the campaign state successfully updates `activeSquadIds` and placed player units in `currentEncounter` without throwing a budget validation error

#### Scenario: Stable incursion recon on squad swap
- **WHEN** a player swaps a deployed unit for a reserve recruit in Camp
- **THEN** the enemy hostiles, enemy count, and arena terrain in the War Room recon remain identical, with only the player's deployed units updated
