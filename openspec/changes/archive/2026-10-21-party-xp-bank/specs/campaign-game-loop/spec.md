# Spec Delta

## MODIFIED Requirements

### Requirement: Combat Victory Transition Hand-off
The system SHALL provide a transition from the Combat Arena victory screen back to Camp that routes through the Harvest Distribution modal, applies campaign victory reconciliation with the distributed party XP allocations, advances the campaign stage index, and generates the next stage encounter.

#### Scenario: Returning to Camp on victory
- **WHEN** the player completes an encounter with all enemies defeated, distributes 100% of the earned party XP pool to deployed squad members in the harvest dialog, and clicks `[ Proceed to Camp ]`
- **THEN** allocated XP is credited to unit `accumulatedXp`, squad HP is fully restored, the stage index advances by 1, and the view switches to Camp Hub

### Requirement: Combat Defeat Transition Hand-off
The system SHALL provide a transition from the Combat Arena defeat screen back to Camp that routes through the Harvest Distribution modal with 50% retained party XP, applies campaign defeat reconciliation with the distributed party XP allocations, fully restores squad HP, and preserves the current stage index.

#### Scenario: Retreating to Camp on defeat
- **WHEN** the player's active squad is wiped, distributes the 50% retained party XP pool to deployed squad members in the harvest dialog, and clicks `[ Retreat to Camp ]`
- **THEN** allocated XP is credited to unit `accumulatedXp`, squad HP is restored to maximum, the stage index does not change, and the view switches to Camp Hub
