# Hybrid AI Profiles and Tactical Primer Heuristics Specification

## Purpose

Defines autonomous AI decision heuristics, behavioral archetype mappings, tactical primer coordination, and composite move-and-act evaluation for Tier 3 hybrid classes (Cavalier, Berserker, Highwayman, Warlock, Witch).

## Requirements

### Requirement: Hybrid AI Profile Resolution
The AI decision system SHALL resolve the authoritative `AIProfile` for any combat unit from its active class package: Cavalier to `BRAWLER`, Berserker to `BRAWLER`, Highwayman to `SKIRMISHER`, Warlock to `SNIPER`, and Witch to `SUPPORT`.

#### Scenario: Authoritative profile resolution from hybrid class packages
- **WHEN** an AI-controlled combatant has an active class package of Cavalier, Berserker, Highwayman, Warlock, or Witch
- **THEN** `resolveAIProfile` returns the package's declared profile (`BRAWLER`, `SKIRMISHER`, `SNIPER`, or `SUPPORT`)

### Requirement: Ally Buff and Tempo Evaluation
The AI decision system SHALL evaluate ally-targeted abilities (`targetType: 'ALLY'`) during turn decision scoring, assigning utility bonuses to CTB initiative boosts and speed modifiers (`Witch's Talisman`) when targeting allied combatants engaged in melee or lagging on the CTB initiative track.

#### Scenario: Witch casts Witch's Talisman on frontline ally
- **WHEN** an active Witch unit has 1 AP and an allied combatant within range 2 engaged in melee with an enemy
- **THEN** the AI evaluates `Witch's Talisman` with positive utility and prioritizes granting the ally CTB acceleration and speed

#### Scenario: Composite move-and-buff candidate generation
- **WHEN** an active support unit has sufficient AP (>= 2) and movement to reach an ally out of base ability range
- **THEN** the AI generates and scores composite move-then-buff candidate actions

### Requirement: Skirmisher Flank and Armor-Shred Coordination
The AI decision system SHALL prioritize using armor-reducing and CTB-delaying hold-up abilities (`Stand and Deliver!`) on high-armor enemies before executing follow-up physical attacks (`Point-Blank Buckshot`).

#### Scenario: Highwayman shreds armor before follow-up attack
- **WHEN** an active Highwayman with 3 AP faces an enemy with positive Armor (> 0)
- **THEN** the AI selects `Stand and Deliver!` to strip target armor and delay their initiative gauge before spending subsequent AP on `Point-Blank Buckshot`

#### Scenario: Skirmisher flank position seeking
- **WHEN** an active Highwayman has available movement AP and can flank an enemy
- **THEN** the AI move evaluation awards high utility bonus to repositioning into the target's Flank or Rear arc

### Requirement: Sniper Standoff and Knockback Spacing
The AI decision system SHALL direct `SNIPER` units equipped with ranged kinetic abilities (`Eldritch Blast`) to maintain standoff distance 2–3 and score knockback against approaching melee threats.

#### Scenario: Warlock repels adjacent enemy with Eldritch Blast
- **WHEN** an enemy is adjacent (range 1) to an active Warlock unit with 2 AP
- **THEN** the AI scores `Eldritch Blast` with high priority to deal damage and push the target 1 hex away into standoff range

#### Scenario: Warlock retreats to maintain preferred standoff distance
- **WHEN** a Warlock unit has movement AP and an enemy is within range 1
- **THEN** the AI prioritizes repositioning to standoff distance 2 before firing ranged spells

### Requirement: Sniper Melee Contingency Adaptation
The AI decision system SHALL direct `SNIPER` units engaged in close melee (distance 1) against high-armor targets to execute armor-bypassing melee strikes (`Pact Blade`) when displacement is blocked or unavailable.

#### Scenario: Warlock strikes armored target with Pact Blade
- **WHEN** a Warlock is adjacent to a target with high Armor where knockback is obstructed
- **THEN** the AI selects `Pact Blade` to bypass physical Armor rather than casting disadvantaged or blocked ranged spells

### Requirement: Brawler Shock Charge and Engagement Control
The AI decision system SHALL direct `BRAWLER` units equipped with rush charges (`Lance Charge`) or taunts (`Flamboyant Flourish`) to initiate straight-line shock engagements into enemy clusters and impose disadvantage on priority targets.

#### Scenario: Cavalier executes straight-line Lance Charge
- **WHEN** an active Cavalier has 2 AP and an enemy target in a clear straight line 2–3 hexes away
- **THEN** the AI selects `Lance Charge` to initiate combat, close distance, and push the target

#### Scenario: Cavalier taunts high-threat target
- **WHEN** a Cavalier is engaged in melee and has 1 AP remaining
- **THEN** the AI selects `Flamboyant Flourish` to inflict `CHALLENGED` on the enemy and boost self Evasion

### Requirement: Support Hex Sabotage and Facing Manipulation
The AI decision system SHALL direct `SUPPORT` units equipped with curses (`Baleful Hex`) and effigy manipulation (`Poppet Needle`) to debuff priority enemy targets and rotate melee enemies away from friendly lines.

#### Scenario: Witch executes Poppet Needle to force facing reversal
- **WHEN** an enemy combatant is threatening an ally and within range 1–3 of an active Witch
- **THEN** the AI scores `Poppet Needle` to inflict damage, shred Resolve, and rotate the target's facing 180° away from the front line
