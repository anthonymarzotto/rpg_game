# Spec Delta: Camp Hub

## ADDED Requirements

### Requirement: In-Camp Trial Reroll Control
The system SHALL provide a trial re-roll action ("Re-roll Trial" / "Astral Re-scry") within the Expedition War Room panel in Camp that regenerates the pending stage encounter using a new random seed, immediately updating detected hostile recon and arena layout without altering campaign progression or active squad assignments.

#### Scenario: Re-rolling pending trial encounter
- **WHEN** the player clicks `[ Re-roll Trial ]` in the Expedition War Room
- **THEN** the pending stage encounter is regenerated with a new random seed, refreshing the detected hostile roster and token cards in the War Room
