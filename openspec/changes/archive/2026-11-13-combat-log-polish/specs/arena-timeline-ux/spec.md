# Spec Delta: arena-timeline-ux

## MODIFIED Requirements

### Requirement: Combat Log Attack and Damage Presentation
The combat chronicle SHALL format attack check rolls with single spaced operators in roll logs and tooltips, present critical hit damage breakdowns with explicit labels distinguishing the maximized base value from the rolled dice, order the attack roll chip ahead of the damage outcome chip on attack cards, and keep attack-card chips concise with full breakdowns revealed on hover.

The combat log attack cards and the visual dice tumbler tray SHALL render interactive, in-engine glassmorphic hover tooltips on both:
1. The attack roll chip (`🎲 <totalScore> vs DC <dc>` for targeted attacks, or `🎲 <totalScore>` for area/hex rolls without a single defender DC) and tray attack modifier element, displaying the itemized breakdown of the net attack modifier (contributing base attribute, elevation high/low ground modifiers, aura penalties, and active conditions) together with the resolved equation.
2. The damage impact chip (`💥 N dmg`) and tray damage equation modifier/soak elements, displaying the itemized breakdown of the damage calculation (rolled dice, critical maximized dice, bonus dice, base attribute bonus, flat/shard bonus, triggered passive bonuses, Armor/Ward mitigation soak, and Graze/Cover multipliers or minimum damage floor) together with the resolved damage formula.

#### Scenario: Attack card impact line orders roll chip before damage chip
- **WHEN** the combat log renders an attack card with an attack roll and impact outcome
- **THEN** the attack roll chip (`🎲 ...`) SHALL appear before the damage chip (`💥 N dmg`) or `Missed` indicator within the impact line

#### Scenario: Attack roll and damage chips display final resolved results when hover breakdowns exist
- **WHEN** an attack log entry includes structured breakdown components (`attackRollBreakdown` / `damageBreakdownComponents`)
- **THEN** the attack roll chip SHALL display the concise final result (`🎲 <totalScore> vs DC <dc>` for targeted attacks, or `🎲 <totalScore>` when targeting an unoccupied hex for an area attack) without inline `d20 + mod` or `(Score N)` labels
- **AND** the damage chip SHALL display the concise final damage (`💥 <damageTotal> dmg`, plus `(Total)` for area attacks) without an inline formula summary string
- **WHEN** an attack log entry lacks structured breakdown components (fallback/legacy entry)
- **THEN** the chips SHALL retain inline roll/formula text so calculation details remain inspectable

#### Scenario: Ground-targeted HEX abilities render AttackRollTooltip and cone Burn details
- **WHEN** a combatant executes a ground-targeted `HEX` attack or cone ability (such as `Wyrmflame Breath` or empty-hex `Arcane Blast`) with no unit on the targeted hex
- **THEN** the combat log entry SHALL populate `attackRollBreakdown` with the actor's Focus/attribute and contextual modifiers
- **AND** the attack roll chip SHALL render `🎲 <totalScore>` with the in-engine `AttackRollTooltip` on hover instead of a `"Spellcast Roll & Score"` fallback title
- **AND** when a cone ability with a secondary condition (such as `Wyrmflame Breath` inflicting `BURN`) hits targets in the cone, the secondary target log details SHALL record both the damage/DC contest and the applied condition

#### Scenario: Attack roll d20 modifier formatting
- **WHEN** an attack check roll is recorded in the combat log message or displayed in roll breakdowns
- **THEN** both positive and negative modifiers SHALL use single spaced operators (e.g. `16 + 1` or `20 - 2`)
- **AND** double sign notations such as `20+-2` SHALL NOT be displayed

#### Scenario: Critical hit damage breakdown notation
- **WHEN** a damaging attack scores a critical hit
- **THEN** the damage breakdown string SHALL format the dice section with explicit labels as `[Crit: <maxVal> max + <rolledDice> roll]`
- **AND** append attribute modifiers with spaced signs (e.g. `+ 3`) before mitigation subtraction

#### Scenario: Hovering attack roll chip displays modifier breakdown tooltip
- **WHEN** the player hovers over an attack roll chip in a combat log attack card
- **THEN** an in-engine styled tooltip renders adjacent to the chip displaying each component of the attack modifier (e.g. Base Attribute, Elevation, Aura) and the complete resolution formula

#### Scenario: Dice tumbler tray displays attack modifier breakdown tooltip
- **WHEN** the player hovers over the attack roll modifier in the visual dice tumbler tray during attack resolution
- **THEN** an in-engine styled tooltip displays detailing the constituent components contributing to the displayed net modifier

#### Scenario: Hovering combat log damage chip displays itemized damage breakdown tooltip
- **WHEN** the player hovers over the damage chip (`💥 N dmg`) in a combat log attack card for a non-missed attack
- **THEN** an in-engine styled tooltip renders on top of the chip inside the combat log displaying each non-zero itemized component of the damage calculation (dice roll, attribute modifier, flat/passive bonuses, Armor/Ward soak, and multipliers) and the resolved total

#### Scenario: Dice tumbler tray displays itemized damage breakdown tooltip
- **WHEN** the player hovers over the damage modifier, soak, or total damage terms in the visual dice tumbler tray once the damage roll has settled
- **THEN** an in-engine styled tooltip displays detailing the non-zero constituent components contributing to the damage bonus, mitigation soak, and final damage dealt

## ADDED Requirements

### Requirement: Structured Status Defeat, Zone of Control, and Fallback Cards
The combat logging pipeline SHALL emit dedicated structured log cards for status-condition defeats and Zone of Control movement halts, and SHALL apply faction theming and structured card layout to any `GENERIC` fallback entry.

#### Scenario: Status condition defeat renders a dedicated DEFEATED card naming the lethal condition
- **WHEN** a combatant is reduced to `0` HP by turn-start damage-over-time status ticks (such as `BURN` or `POISON`)
- **THEN** the combat log SHALL emit a structured `DEFEATED` card themed to the defeated unit's faction
- **AND** the card SHALL display a `💀 DEFEATED` badge, the unit's name, and the specific lethal status condition (e.g., `Defeated by Burn` rather than generic status condition text)

#### Scenario: Zone of Control movement halt renders a dedicated ZONE_OF_CONTROL card
- **WHEN** a moving unit's advance is interrupted by an enemy's Phalanx Front Zone of Control
- **THEN** the combat log SHALL emit a structured `ZONE_OF_CONTROL` card themed to the moving unit's faction
- **AND** the entry's `affectedUnitIds` SHALL include both the halted unit and the Zone of Control guardian so unit filtering displays the event for either combatant
- **AND** the card SHALL display a `🛡️ ZONE OF CONTROL` badge and identify both the halted unit and the blocking guardian's Phalanx Front

#### Scenario: Generic fallback log cards inherit faction styling and header framing
- **WHEN** a combat log entry falls through to the `GENERIC` card renderer
- **THEN** the card SHALL apply the entry's faction card class (`.faction-player`, `.faction-enemy`, or `.faction-neutral`), turn pill, and structured message presentation rather than unstyled plain text
