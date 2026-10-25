# Spec Delta: hybrid-ai-heuristics

## ADDED Requirements

### Requirement: Target Threat Priority Evaluation
The AI decision system SHALL evaluate target threat weighting during candidate action scoring to prioritize dangerous high-threat combatants (such as backline glass cannons and curse disrupters) even when low-ground vertical penalties or Disadvantage reduce base hit probability and raw expected damage. The system SHALL resolve the target's archetype via `resolveAIProfile` and award threat priority score bonuses: highest priority for `SNIPER` combatants (+8 to +10), high priority for `SUPPORT` combatants (+6 to +8), and moderate priority for `SKIRMISHER` combatants (+4), while maintaining `BRAWLER` combatants at baseline (0 bonus).

#### Scenario: AI attacks high-threat Warlock sniper despite low-ground Disadvantage
- **WHEN** an AI-controlled actor on low ground faces an enemy Warlock (`SNIPER`) holding high ground (imposing Disadvantage) and an enemy Warrior (`BRAWLER`) on equal ground
- **THEN** the target threat weighting bonus applied to the Warlock offsets the expected damage reduction from Disadvantage
- **THEN** the AI prioritizes targeting the Warlock over the durable Warrior

#### Scenario: AI prioritizes Witch support curse disrupter over durable frontline
- **WHEN** an AI actor evaluates candidate attacks between a Witch (`SUPPORT`) and a frontline Cavalier (`BRAWLER`)
- **THEN** the AI awards threat priority score bonus to targeting the Witch to disrupt debuff and tempo utility

### Requirement: Knockback Cliff Plunge and High Ground Disruption
The AI decision system SHALL evaluate kinetic displacement abilities (`KNOCKBACK`) against arena topography using authoritative collision and knockback calculation (`calculateKnockback`). When a knockback trajectory plunges an enemy unit down a ledge resulting in fall impact damage ($\Delta h \le -2$), the AI SHALL award substantial fall damage utility. Furthermore, when the target currently occupies an elevated hex holding high-ground advantage and the knockback pushes them down to lower ground, the AI SHALL award vantage disruption utility for stripping high-ground superiority.

#### Scenario: AI shoves perched sniper off high-ground ledge
- **WHEN** an active combatant with a knockback ability (such as `Eldritch Blast`) targets an elevated enemy perched on a cliff edge ($\Delta h \ge 1$)
- **THEN** the AI scores high utility for pushing the target over the ledge, factoring in calculated fall impact damage and removal of high-ground vantage

#### Scenario: Flat ground knockback without hazards receives standard spacing
- **WHEN** an active combatant evaluates a knockback ability against a target on level ground with no wall obstacles or cliffs behind them
- **THEN** the AI awards standard kinetic spacing utility without cliff-plunge or vantage disruption bonuses

### Requirement: Hostile Movement Denial and Kiting Utility
The AI decision system SHALL evaluate hostile abilities applying the `SLOW` effect during turn decision scoring in `scoreDebuffAndUtility`. The AI SHALL award positive utility for reducing movement against enemies possessing effective Move $\ge 2$, and SHALL award additional kiting utility when the target is a melee-oriented threat (`BRAWLER` or melee-only loadout) that is not currently adjacent to the actor or threatened friendly combatants. The AI SHALL assign zero utility to `SLOW` effects if the target already has an active negative movement modifier (`stat === 'move' && value < 0`).

#### Scenario: Frostbite scored for movement denial against advancing melee threat
- **WHEN** an active caster unit evaluates `Frostbite` against an advancing enemy Warrior (`BRAWLER` with Move $\ge 2$) located at distance 2
- **THEN** the AI awards utility for inflicting `SLOW`, recognizing that -1 Move impedes the melee threat from closing distance on their subsequent turn

#### Scenario: Duplicate SLOW suppressed on already slowed target
- **WHEN** an enemy combatant already has an active negative movement modifier (`stat === 'move' && value < 0`)
- **THEN** the AI assigns zero utility to the `SLOW` component of hostile abilities against that target

#### Scenario: Non-damaging movement debuff suppressed under non-redundancy guard
- **WHEN** an enemy combatant already has an active negative movement modifier and a candidate ability dealing no damage applies `SLOW`
- **THEN** the non-redundancy guard returns zero total score, preventing duplicate movement debuff spam
