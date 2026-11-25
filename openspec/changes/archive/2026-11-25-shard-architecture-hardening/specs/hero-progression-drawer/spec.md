# Spec Delta: Hero Progression Drawer

## ADDED Requirements

### Requirement: Loadout Update Rejection Feedback and Domain-Delegated Pruning
The Hero Progression Drawer SHALL delegate automatic pruning of incompatible socketed shards to the campaign loadout update transition on every loadout update rather than duplicating conditional pruning logic inside the UI component.

When a loadout update is rejected by validation, the Hero Progression Drawer SHALL render a visible inline error message explaining the rejection reason (and clear it on the next successful edit or dismissal) instead of failing silently in the browser console.

#### Scenario: Editing passives on a hero with a legacy incompatible shard does not deadlock the drawer
- **WHEN** a player opens the Hero Progression Drawer for a hero whose saved loadout contains an incompatible socketed shard and changes their wildcard passive
- **THEN** the campaign transition prunes the incompatible shard automatically and commits the passive change cleanly

#### Scenario: Rejected loadout update displays visible inline feedback
- **WHEN** a loadout update submitted from the Hero Progression Drawer is rejected by validation
- **THEN** the drawer displays an inline error notice containing the rejection reason
- **THEN** a subsequent valid loadout update clears the error notice
