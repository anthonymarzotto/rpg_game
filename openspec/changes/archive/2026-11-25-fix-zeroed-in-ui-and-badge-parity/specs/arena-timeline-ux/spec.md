# Spec Delta

## ADDED Requirements

### Requirement: Zeroed In Calibration Visual Feedback
When a combatant has accumulated `Zeroed In` stationary calibration stacks (`zeroedInStacks > 0`), the combat arena and HUD SHALL provide consistent visual feedback matching `Coiled Apex` across the Character Card, Action Bar passives tray, battlefield standee status bubble and hover tooltip, Target Preview, and turn-end floating combat text.

#### Scenario: Active Zeroed In stacks display on Character Card passive chip and status badges
- **WHEN** an active, hovered, or pinned combatant has `zeroedInStacks > 0` (1 to 3 stacks)
- **THEN** the `Zeroed In` chip in the `PASSIVES` row SHALL display the telescope icon `🔭` in its tooltip, a ready-glow state, and a `(<stacks>/3)` counter
- **AND** the unit's active status badges row SHALL display a `Zeroed In (<stacks>/3)` buff badge with a rich hover tooltip detailing `+N Range`, `+N Attack Roll`, `-N Evasion`, the 3-stack `+1 AoE Radius` capstone bonus, and that moving, teleporting, or displacement clears all stacks

#### Scenario: Battlefield standee status bubble shows Zeroed In hover tooltip
- **WHEN** a living combatant on the hex battlefield has `zeroedInStacks > 0`
- **THEN** the unit's overhead standee status bubble SHALL display the `🔭` icon
- **AND** hovering the standee status bubble SHALL render the rich `Zeroed In` calibration tooltip detailing the current stack count and active bonuses rather than an empty tooltip

#### Scenario: Action Bar passives tray displays shared stack and readiness counters
- **WHEN** the active player unit has `Zeroed In`, `Coiled Apex`, or `Momentum` in the Action Bar passives tray
- **THEN** the Action Bar passives tray SHALL render consistent live counter and ready-glow state matching the Character Card (`<stacks>/3` for `Zeroed In`, `+1 Height` for armed `Coiled Apex`, and `<moved>/2` for `Momentum`)

#### Scenario: Zeroed In displays Target Preview badge and turn-end accumulation floater
- **WHEN** a player unit with `Zeroed In` ends their turn without having moved, teleported, or been displaced while below 3 stacks
- **THEN** floating combat text indicating `Zeroed In (<nextStacks>/3)` SHALL render above the unit
- **WHEN** a unit with `zeroedInStacks > 0` hovers a valid attack target
- **THEN** the Target Preview header SHALL display an active `🔭 Zeroed In` indicator badge summarizing its current hit, range, and (at 3 stacks) AoE bonuses
