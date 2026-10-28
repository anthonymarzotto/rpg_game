# Spec Delta

## ADDED Requirements

### Requirement: Post-Trial Harvest XP Allocation Interface
The system SHALL present a post-trial XP distribution interface for deployed squad units that displays each unit's progression status, provides aligned non-negative integer steppers, previews advancement thresholds, and validates full pool allocation.

#### Scenario: Clean stepper display without sign prefix
- **WHEN** a player views the harvest allocation modal
- **THEN** stepper values display plain integers without a leading `+` prefix (e.g. `0`, `1`, `2`), with horizontal spacing separating decrement and increment buttons from labels and total badges

#### Scenario: Unit level requirement display
- **WHEN** a deployed unit is displayed in the allocation grid
- **THEN** the unit card header displays their current level and required archetype XP threshold for their next level (e.g. `Level 0 (Req: 5 XP)`) if below maximum level, or indicates maximum level without a requirement if at max level

#### Scenario: Archetype milestone readiness indicator
- **WHEN** points are allocated such that a unit's projected archetype XP (`baseVal + currentAlloc`) meets or exceeds the required level threshold
- **THEN** that archetype's total badge updates to highlight milestone readiness with distinctive styling and a `★` indicator

#### Scenario: Confirmation action tooltip validation
- **WHEN** unallocated XP remains in the retained party pool
- **THEN** the confirmation button to proceed to Camp is disabled, the footer status warning text is omitted, and hovering the confirmation button displays a tooltip stating `"Allocate all remaining XP to continue"`
