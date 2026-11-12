# Spec Delta: Visual Dice Tumbler Tray

## ADDED Requirements

### Requirement: Clash Duel Stage and Combatant Token Micro-Animations
The visual dice tumbler tray SHALL present a Clash Duel stage header displaying the attacker and target directional unit tokens, target vitals before and after impact, and stage-synchronized micro-animations for attack wind-up/lunge, evasion sidestep, damage hit impact, and combatant defeat.

#### Scenario: Directional attacker and target tokens face off in the tray header
- **WHEN** the visual dice tumbler tray opens for an attack ability
- **THEN** the tray header renders the attacker and target pixel tokens together in the center flanking the versus emblem (attacker oriented right `SOUTHEAST` on the left, target oriented left `SOUTHWEST` on the right, or a fallback badge when targeting an unoccupied hex or ungenerated token) with token borders colored according to each combatant's faction (`PLAYER`, `ENEMY`, or `NEUTRAL`).

#### Scenario: Attacker lunge and target reaction on attack check settle
- **WHEN** Stage 1 (`STAGE1_TUMBLE`) transitions to `STAGE1_SETTLE`
- **THEN** the attacker token performs a forward lunge animation
- **AND** if the outcome is `MISS`, the target token performs an evasive sidestep animation.

#### Scenario: Target hit flash, shake, and HP transition on damage settle
- **WHEN** Stage 2 (`STAGE2_TUMBLE`) transitions to `STAGE2_SETTLE` on a damaging hit
- **THEN** the target token plays a hit-flash and shake animation (amplified on `CRITICAL_HIT`)
- **AND** the target HP indicator in the tray transitions from its pre-attack HP to its post-attack HP.

#### Scenario: Target defeat visual state in clash tray and deferred battlefield removal
- **WHEN** an attack reduces the target combatant to `0 HP` while the dice tray is active
- **THEN** the target token in the tray remains normal during rolling and transitions to a dimmed defeated visual state with a skull icon (`💀`) overlaid on the token only upon `STAGE2_SETTLE`
- **AND** the target combatant on the hex battlefield is not removed from the arena view until the dice tray completes or is dismissed.

## MODIFIED Requirements

### Requirement: Attack Roll Dice Breakdown in Combat Resolution
The combat engine SHALL generate and expose a structured dice breakdown record on `AttackResolution` for all executed attack abilities, providing the raw d20 roll(s), the active advantage mode (`NORMAL`, `ADVANTAGE`, or `DISADVANTAGE`), the selected kept d20 value, net modifier, target defense, hit outcome, individual damage dice rolls with modifiers, target mitigation soak (`Armor` or `Ward`), and an itemized array of damage breakdown components.

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
- **THEN** the resolution includes a damage dice breakdown listing each individual die roll, count, sides, attribute modifier, target mitigation amount and mitigation type (`Armor` or `Ward`), itemized damage breakdown components (dice, critical maximization, attribute bonus, flat/shard bonus, passive bonuses, mitigation, and multipliers/floors), and final damage total.

### Requirement: Visual Dice Tumbler Tray Presentation
When an attack ability executes under an active dice tray mode, the combat interface SHALL display a floating top-center visual dice tumbler banner animating the attack check and subsequent damage dice without spoiling roll totals prior to die settlement.

#### Scenario: Attack check tumble and outcome display
- **WHEN** an attack ability executes with the tray enabled
- **THEN** the tray appears, displays the attacker and target names, tumbles the d20 die (or dual dice under Advantage/Disadvantage) while withholding the resolved score equation until `STAGE1_SETTLE`, and upon settling highlights the kept die, displays the net modifier comparison against target defense, and slams in the hit outcome badge (`CRITICAL HIT!`, `SOLID HIT!`, `GRAZE (50%)`, or `MISS`).

#### Scenario: Damage dice tumble on hit
- **WHEN** the attack check completes with a `CRITICAL_HIT`, `SOLID_HIT`, or `GRAZE`
- **THEN** the tray animates the damage dice roll while withholding the resolved damage equation during `STAGE2_TUMBLE`, and upon `STAGE2_SETTLE` displays the rolled dice total, damage modifier, Armor/Ward soak subtraction (when mitigation is non-zero), and total damage dealt before fading into target floating combat text.

#### Scenario: Miss skips damage dice stage
- **WHEN** the attack check completes with a `MISS`
- **THEN** the tray displays a concise `MISS` badge and dismisses without initiating the damage dice stage.

### Requirement: Persistent Tray Enablement Toggle
The combat interface SHALL provide a prominent, accessible tri-state toggle button in the combat header allowing the player to cycle the visual dice tray mode between `ALL` (both player and hostile attacks), `PLAYER_ONLY` (player attacks only), and `OFF` (instant resolution).

#### Scenario: Cycling tri-state tray mode
- **WHEN** the player clicks the dice tray toggle button in the combat header
- **THEN** the tray mode cycles through `ALL` -> `PLAYER_ONLY` -> `OFF` -> `ALL` and updates the button label accordingly.

#### Scenario: Toggling tray off enables instant resolution
- **WHEN** the dice tray mode is set to `OFF` and an attack ability executes
- **THEN** the action resolves immediately with standard floating combat text and zero tray animation delay.

#### Scenario: Tray preference persists across reloads
- **WHEN** the player toggles the dice tray setting and refreshes or restarts the session
- **THEN** the selected mode (`ALL`, `PLAYER_ONLY`, or `OFF`) is restored from `localStorage`.

### Requirement: Non-Interference with Hostile Turn Sequencing
The visual dice tumbler tray SHALL respect the active dice tray mode during hostile AI turns, presenting the clash dice tray on hostile attack abilities when set to `ALL` (and AI speed is not `INSTANT`), and bypassing the tray on hostile turns when set to `PLAYER_ONLY` or `OFF`.

#### Scenario: Hostile AI attacks present clash dice tray in ALL mode
- **WHEN** an enemy unit executes an attack ability while the dice tray mode is `ALL` and AI speed is not `INSTANT`
- **THEN** the hostile turn sequencer pauses on the attack action, presents the visual dice tumbler tray for the enemy attack, and resumes turn progression once the tray completes or is skipped by the player.

#### Scenario: Hostile AI attacks execute without player tray
- **WHEN** an enemy unit takes their turn and executes an attack ability while the dice tray mode is `PLAYER_ONLY` or `OFF`
- **THEN** the action resolves through the hostile turn sequencer without rendering or waiting for the visual dice tumbler tray.
