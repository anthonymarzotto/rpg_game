# Spec Delta: Campaign Progression

## MODIFIED Requirements

### Requirement: Battle Victory Reconciliation
Upon resolving a combat victory, the system SHALL retain 100% of the accumulated in-battle party XP pool for player distribution, restore all roster units to full maximum HP, credit the player's allocated XP shares to each squad unit's `accumulatedXp`, increment the campaign stage index by 1, generate the next stage encounter calibrated to the squad's single-step projected threat (accounting for pending ascensions), and log the victory in campaign history.

#### Scenario: Victory transition
- **WHEN** `resolveCampaignVictory` is invoked with a completed combat result and unit XP allocations distributed from the 100% retained party pool
- **THEN** squad HP is fully restored, each squad unit's `accumulatedXp` increases by their allocated share, the campaign stage increments by 1, the next encounter is pre-generated using single-step projected threat across the squad, and history records the win

#### Scenario: Victory transition with projected threat generation
- **WHEN** `resolveCampaignVictory` is invoked for a victorious squad containing units with pending level ascensions
- **THEN** the generated next stage encounter is calibrated using projected unit threat rather than unpromoted levels

### Requirement: Camp Roster and Loadout Management
In Camp, the system SHALL allow players to change a unit's active class from their unlocked constellation, configure wildcard ability and passive slots, and assign which roster units are deployed in the active combat squad.
The system SHALL validate active combat squad deployment against a stage-scaled deployment threat point budget, allowing players to deploy as many units as fit within the budget without an arbitrary squad size ceiling.
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
- **WHEN** a player attempts to deploy units whose combined threat points exceed the stage deployment point budget
- **THEN** the deployment is rejected with an error indicating the budget limit has been exceeded

#### Scenario: Stable incursion recon on squad swap
- **WHEN** a player swaps a deployed unit for a reserve recruit in Camp
- **THEN** the enemy hostiles, enemy count, and arena terrain in the War Room recon remain identical, with only the player's deployed units updated
