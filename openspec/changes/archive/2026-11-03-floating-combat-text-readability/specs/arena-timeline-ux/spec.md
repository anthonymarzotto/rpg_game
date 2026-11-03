# Spec Delta

## ADDED Requirements

### Requirement: Battlefield Floating Combat Text Legibility and Stacking
The combat system SHALL render high-contrast, scalable floating combat text over combatants with elevated spawn positioning, tiered event sizing, and anti-overlap vertical stacking.

#### Scenario: Floating combat text renders with high-contrast silhouette stroke
- **WHEN** any floating combat text item (damage, crit, miss, graze, slam, displacement, condition, xp, or initiative) is rendered in the arena viewport
- **THEN** the text SHALL be rendered with a heavy dark silhouette stroke (`paint-order: stroke fill`) ensuring full readability over all underlying tile terrain, spell effects, and elevation heights

#### Scenario: Elevated spawn anchor clears unit standees
- **WHEN** a floating combat text item appears above a combatant's grid coordinate
- **THEN** the initial vertical spawn coordinate SHALL be positioned at least 36px above the projected tile center (`y - 36`), preventing occlusion of unit tokens, standees, and status bubbles

#### Scenario: Tiered event sizing hierarchy
- **WHEN** floating combat text renders in the combat arena
- **THEN** major impact events (`CRITICAL!`, `SLAM!`, `BLAST!`, `COLLISION!`, `KNOCKBACK!`, `FALL!`) SHALL render at large emphasis size (26px–28px in SVG space)
- **AND** standard attack damage numbers, `MISS`, `RESIST!`, `RETREAT!`, `TELEPORT!`, and `🎲 <initiative>` SHALL render at medium size (20px–22px)
- **AND** secondary utility notifications (`+N XP`, `+N STAT`, `POISON`, `BURN`) SHALL render at compact size (16px–18px)

#### Scenario: Anti-collision vertical stacking for concurrent floaters
- **WHEN** multiple floating combat text items are active on the same battlefield coordinate at the same time
- **THEN** each subsequent floating item SHALL be displaced vertically above preceding active items by a dynamic offset (at least 18px per stacked item)
- **AND** multiple concurrent text items SHALL NOT overlap or occlude each other
