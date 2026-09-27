# Spec Delta

## Purpose

Provides domain models, lifecycle state transitions, and persistent hero progression for a multi-stage tactical campaign.

## ADDED Requirements

### Requirement: Campaign Initialization
The system SHALL initialize a new campaign with unique run metadata, an initial stage index of 1, and a roster containing 3 procedurally generated Level-0 Novices with rolled starter kits, unique IDs, and zeroed accumulated XP.

#### Scenario: New campaign creation
- **WHEN** `createCampaign` is called with optional configuration
- **THEN** the returned `CampaignState` has stage 1, an empty history, 3 Novice units in the roster, and all 3 units assigned to `activeSquadIds`

### Requirement: Accumulated XP Persistence
The system SHALL persist accumulated archetype XP (`fighter`, `rogue`, `mage`) on each unit's progression record so that earned progress is retained across encounters and sessions.

#### Scenario: Preserving cross-battle XP
- **WHEN** a unit accumulates XP in one or more archetypes without leveling up
- **THEN** their `accumulatedXp` retains those values indefinitely until spent on level advancement

### Requirement: Battle Victory Reconciliation
Upon resolving a combat victory, the system SHALL restore all roster units to full maximum HP, credit earned in-battle archetype XP to each surviving unit's `accumulatedXp`, increment the campaign stage index by 1, and log the victory in campaign history.

#### Scenario: Victory transition
- **WHEN** `resolveCampaignVictory` is invoked with a completed combat result
- **THEN** squad HP is fully restored, in-battle XP is added to each unit's `accumulatedXp`, the campaign stage increments, and history records the win

### Requirement: Battle Defeat Reconciliation
Upon resolving a combat defeat, the system SHALL restore all roster units to full maximum HP, discard any in-battle XP accumulated during the failed attempt, preserve the current stage index, and log the defeat in campaign history.

#### Scenario: Defeat transition
- **WHEN** `resolveCampaignDefeat` is invoked with a failed combat result
- **THEN** squad HP is fully restored, unit `accumulatedXp` remains unchanged from before the battle, the stage index does not advance, and the defeat is recorded in history

### Requirement: Camp Level Advancement
In Camp, the system SHALL allow players to advance a unit's level by allocating an archetype point if the unit's accumulated XP in that archetype meets or exceeds the required threshold for their current level. The system SHALL deduct the threshold cost from that archetype while preserving all excess and non-selected archetype XP.

#### Scenario: Single archetype level-up
- **WHEN** a Level-0 unit with 6 Fighter XP spends 5 XP to level up in Fighter
- **THEN** the unit advances to Level 1, unlocks the Warrior class in their constellation, increases Force by 1, and retains 1 Fighter XP in `accumulatedXp`

#### Scenario: Multi-qualifying and excess XP retention
- **WHEN** a Level-0 unit with 5 Fighter XP and 5 Rogue XP levels up in Fighter
- **THEN** the unit advances to Level 1 and retains all 5 Rogue XP in `accumulatedXp` for subsequent advancement

### Requirement: Camp Roster and Loadout Management
In Camp, the system SHALL allow players to change a unit's active class from their unlocked constellation, configure wildcard ability and passive slots, and assign which roster units are deployed in the active combat squad.

#### Scenario: Updating equipped class and wildcards
- **WHEN** a player configures a unit's loadout with an unlocked active class and valid wildcard abilities
- **THEN** the unit's loadout is updated in the campaign roster and validated against constellation constraints

#### Scenario: Setting active combat squad
- **WHEN** a player assigns up to 3 units from the roster to `activeSquadIds`
- **THEN** the campaign state updates its active squad for the next battle deployment
