# Spec Delta

## MODIFIED Requirements

### Requirement: Transient Unit Status Preview on Hover
The combat status overlay card SHALL temporarily preview the vitals, defenses, and conditions of any hovered combatant, and support locking the preview into a persistent pinned inspection card upon selection, optionally centering the camera on the selected combatant.

When a combatant is pinned, each skill in the `EQUIPPED ABILITIES` list SHALL be evaluated through `getEffectiveAbility` against the unit's active `abilityModifiers`, rendering a concise **Compact Mechanical 1-Liner** directly on the skill row (with `Normal -> Shard -> In-Trial` provenance color highlights) and displaying the full **Hybrid Ability Tooltip** (flavor text, Stat Strip pills, Effect Clauses, and active augments footer) when hovered.

#### Scenario: Hovering timeline chip previews unit in status card
- **WHEN** the player hovers over an initiative chip on the timeline ribbon
- **THEN** the `UnitStatusCard` SHALL display the hovered unit's current HP, maximum HP, defense attributes (EVA, RES, ARM, WRD, MOV, SPD), CTB gauge, and active conditions

#### Scenario: Hover ends and view reverts to active or pinned unit
- **WHEN** the cursor leaves the timeline chip or battlefield unit
- **THEN** the `UnitStatusCard` SHALL immediately revert to displaying the pinned unit if one is selected, or the currently active unit otherwise

#### Scenario: Clicking unit or timeline chip in IDLE mode pins inspection card
- **WHEN** the player clicks any allied or hostile combatant on the hex battlefield or their chip in the timeline ribbon while in `IDLE` action mode
- **THEN** the system SHALL set that combatant as the pinned unit
- **AND** the inspection card SHALL remain persistently displayed under the active unit card even as the cursor moves across the screen
- **AND** the pinned unit on the battlefield SHALL display a distinct selection ring
- **AND** clicking a timeline chip SHALL center the camera viewport on the combatant's hex position

#### Scenario: Dismissing pinned unit card
- **WHEN** the player clicks an empty tile on the battlefield, clicks the active unit, presses the `Escape` key, or clicks the close button on the pinned card
- **THEN** the system SHALL clear the pinned unit and unpin the inspection card

#### Scenario: Pinned inspection card displays active skill loadout and AP
- **WHEN** a combatant is pinned in the inspection card
- **THEN** the card SHALL display the combatant's remaining AP and CTB gauge
- **AND** the card SHALL evaluate each equipped ability with the unit's active modifiers and display the ability name, effective AP/HP cost, and a compact mechanical 1-liner reflecting any shard or in-trial modifications
- **AND** hovering over any equipped ability row on the pinned card SHALL display the full Hybrid Ability Tooltip with flavor text, Stat Strip pills, Effect Clauses, and active augments

#### Scenario: Entering an action mode clears or suspends pinned card
- **WHEN** the player initiates a `MOVE` action or selects an `ABILITY` to enter targeting mode
- **THEN** the pinned inspector card SHALL yield the secondary card slot to the targeting or movement preview
