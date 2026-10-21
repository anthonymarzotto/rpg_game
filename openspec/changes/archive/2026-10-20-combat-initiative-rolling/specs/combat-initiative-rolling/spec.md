# Spec Delta: Combat Initiative Rolling

## Purpose

Provides dynamic combat encounter opening rounds by rolling randomized initial initiative gauges (1d20) for each combatant, interleaving squad turns naturally, and presenting rolls via battlefield floating text and combat log announcements.

## ADDED Requirements

### Requirement: Combatants roll randomized initial initiative gauge on encounter initialization
The system SHALL initialize each combat unit's `initiativeGauge` with an integer value rolled from a 1d20 die ($1\text{--}20$) when constructing a new combat state container.

#### Scenario: All combatants receive initial non-zero initiative gauge
- **WHEN** a new combat encounter state is created via `createCombatState`
- **THEN** every participating player and enemy combatant SHALL have an `initiativeGauge` between 1 and 20 (inclusive) prior to initial clock advancement

#### Scenario: Deterministic initiative rolls with seeded roller
- **WHEN** `createCombatState` is invoked with a seeded dice roller
- **THEN** the initial initiative rolls SHALL be completely deterministic and reproducible across retries with the same seed

### Requirement: Equal gauge and speed ties gracefully favor the player
When two combatants simultaneously cross the CTB gauge turn threshold with identical gauge values and identical effective speed values, the clock tiebreaker SHALL award turn priority to the player combatant.

#### Scenario: Exact gauge and speed tie awarded to player
- **WHEN** a player combatant and an enemy combatant cross the 100 gauge threshold on the exact same clock tick with equal gauge and equal effective speed
- **THEN** the system SHALL designate the player combatant as the winning active unit for that turn

### Requirement: Combat start announces initiative rolls via floating text and combat log
The system SHALL announce opening initiative rolls without blocking user control or pausing gameplay.

#### Scenario: Floating combat text displays initiative roll on battlefield mount
- **WHEN** the combat arena mounts and spawns units on the hex battlefield for Turn 0
- **THEN** a transient floating text item displaying `🎲 <roll>` SHALL float above each combatant's hex position
- **AND** the floating text SHALL auto-dismiss smoothly without blocking input or delaying turn actions

#### Scenario: Opening combat log registers battle initiation and initiative rolls
- **WHEN** combat initialization completes
- **THEN** the combat log SHALL contain a Turn 0 entry announcing battle initiation and listing each combatant's name and rolled initiative value

### Requirement: Anti-alpha-strike guardrail limits consecutive opening turns
The encounter initialization system SHALL enforce an anti-blowout guardrail such that no single faction (PLAYER or ENEMY) may occupy more than $\lceil \text{squadSize}/2 \rceil$ consecutive turns at the start of combat.

#### Scenario: Enemy opening turns capped at half squad size rounded up
- **WHEN** all units of a faction roll higher initiative gauges such that more than $\lceil \text{squadSize}/2 \rceil$ consecutive opening turns would be taken by that faction
- **THEN** the system SHALL adjust opening initiative so the highest-initiative unit of the opposing faction is scheduled to act on turn $\lceil \text{squadSize}/2 \rceil + 1$

### Requirement: Staggered initiative roll presentation with click-to-skip
The battlefield UI SHALL reveal initiative rolls sequentially across combatants and pause initial turn actions until the sequence concludes, allowing the player to inspect each roll.

#### Scenario: Staggered sequential pop of initiative badges
- **WHEN** combat begins on Turn 0
- **THEN** floating initiative badges `🎲 <roll>` SHALL appear sequentially ordered from highest to lowest initiative with approximately 250ms spacing between units
- **AND** the active unit SHALL pause actions until the sequence completes or the user clicks to skip
