# Spec: Visual Dice Tumbler Tray

## Purpose

Provides a tactile 2.5D visual dice tumbler tray that animates d20 attack checks and damage rolls during player actions, offering tabletop suspense, advantage die selection, click-to-skip pacing controls, and persistent user toggle.

## Requirements

### Requirement: Attack Roll Dice Breakdown in Combat Resolution
The combat engine SHALL generate and expose a structured dice breakdown record on `AttackResolution` for all executed attack abilities, providing the raw d20 roll(s), the active advantage mode (`NORMAL`, `ADVANTAGE`, or `DISADVANTAGE`), the selected kept d20 value, net modifier, target defense, hit outcome, and individual damage dice rolls with modifiers.

#### Scenario: Normal single-die attack breakdown
- **WHEN** an attack ability executes with `NORMAL` advantage
- **THEN** the resolution contains a dice breakdown with exactly one d20 roll, matching the kept d20 and final attack score.

#### Scenario: Advantage roll selects higher die
- **WHEN** an attack ability executes with `ADVANTAGE`
- **THEN** the resolution contains a dice breakdown with two d20 rolls, and the kept value equals `Math.max(roll1, roll2)`.

#### Scenario: Disadvantage roll selects lower die
- **WHEN** an attack ability executes with `DISADVANTAGE`
- **THEN** the resolution contains a dice breakdown with two d20 rolls, and the kept value equals `Math.min(roll1, roll2)`.

#### Scenario: Damage dice breakdown on successful hit
- **WHEN** an attack ability hits or grazes a target
- **THEN** the resolution includes a damage dice breakdown listing each individual die roll, count, sides, attribute modifier, and final damage total.

### Requirement: Visual Dice Tumbler Tray Presentation
When an active player unit executes an attack ability and the dice tray setting is enabled, the combat interface SHALL display a floating top-center visual dice tumbler banner animating the attack check and subsequent damage dice.

#### Scenario: Attack check tumble and outcome display
- **WHEN** a player attack ability executes with the tray enabled
- **THEN** the tray appears, displays the attacker and target names, tumbles the d20 die (or dual dice under Advantage/Disadvantage), highlights the kept die, and displays the net modifier comparison against target defense with the hit outcome badge (`CRITICAL HIT!`, `SOLID HIT`, `GRAZE`, or `MISS`).

#### Scenario: Damage dice tumble on hit
- **WHEN** the attack check completes with a `CRITICAL_HIT`, `SOLID_HIT`, or `GRAZE`
- **THEN** the tray animates the damage dice roll, calculates the attribute bonus, and displays the total damage dealt before fading into target floating combat text.

#### Scenario: Miss skips damage dice stage
- **WHEN** the attack check completes with a `MISS`
- **THEN** the tray displays a deflected/evaded badge and dismisses without initiating the damage dice stage.

### Requirement: Interactive Skip and Quick Dismissal
The combat interface SHALL allow the player to bypass the remaining dice tumble and clash animations at any moment during the roll sequence.

#### Scenario: Player clicks or presses Space to skip
- **WHEN** the player clicks the mouse anywhere or presses the Spacebar while the dice tray is actively tumbling
- **THEN** the animation immediately fast-forwards to the final numbers and dismisses the tray, applying floating combat text and damage state without delay.

### Requirement: Persistent Tray Enablement Toggle
The combat interface SHALL provide a prominent, accessible toggle button in the combat header allowing the player to turn the visual dice tray on or off.

#### Scenario: Toggling tray off enables instant resolution
- **WHEN** the player toggles the dice tray to OFF and executes an attack ability
- **THEN** the action resolves immediately with standard floating combat text and zero tray animation delay.

#### Scenario: Tray preference persists across reloads
- **WHEN** the player toggles the dice tray setting and refreshes or restarts the session
- **THEN** the preference is restored from `localStorage`.

### Requirement: Non-Interference with Hostile Turn Sequencing
The visual dice tumbler tray SHALL only trigger on player actions and SHALL NOT alter hostile AI action execution pacing.

#### Scenario: Hostile AI attacks execute without player tray
- **WHEN** an enemy unit takes their turn and executes an attack ability
- **THEN** the action resolves through the hostile turn sequencer without rendering or waiting for the player dice tumbler tray.
