# Spec Delta

## MODIFIED Requirements

### Requirement: Combat start announces initiative rolls via floating text and combat log
The system SHALL announce opening initiative rolls without blocking user control or pausing gameplay once active combat begins. When an interactive encounter begins in the pre-combat `DEPLOYMENT` phase, opening initiative rolls, `BATTLE_START` passive triggers, the Turn 0 initiative combat log entry, and floating `🎲 <roll>` badges SHALL be deferred until the player confirms deployment via `[ ⚔️ Begin Trial ]`.

#### Scenario: Floating combat text displays initiative roll on battlefield mount
- **WHEN** the combat arena begins Turn 0 (upon confirming deployment via `[ ⚔️ Begin Trial ]` in interactive trials, or immediately on mount when the deployment phase is bypassed)
- **THEN** a transient floating text item displaying `🎲 <roll>` SHALL float above each combatant's confirmed hex position
- **AND** the floating text SHALL auto-dismiss smoothly without blocking input or delaying turn actions

#### Scenario: Opening combat log registers battle initiation and initiative rolls
- **WHEN** combat initialization completes (upon clicking `[ ⚔️ Begin Trial ]` in interactive trials, or immediately in headless `createCombatState` calls)
- **THEN** the combat log SHALL contain a Turn 0 entry announcing battle initiation and listing each combatant's name and rolled initiative value
- **AND** during the pre-combat `DEPLOYMENT` phase prior to confirmation, no Turn 0 initiative entry or `🎲 <roll>` floating badges SHALL be emitted
