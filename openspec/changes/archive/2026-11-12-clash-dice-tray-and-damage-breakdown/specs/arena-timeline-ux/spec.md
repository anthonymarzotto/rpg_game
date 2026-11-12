# Spec Delta: Arena & Timeline UX

## MODIFIED Requirements

### Requirement: Combat Log Attack and Damage Presentation
The combat chronicle SHALL format attack check rolls with single spaced operators and present critical hit damage breakdowns with explicit labels distinguishing the maximized base value from the rolled dice.

The combat log attack cards and the visual dice tumbler tray SHALL render interactive, in-engine glassmorphic hover tooltips on both:
1. The attack roll chip (`🎲 d20 + mod vs DC`) and tray attack modifier element, displaying the itemized breakdown of the net attack modifier (contributing base attribute, elevation high/low ground modifiers, aura penalties, and active conditions) together with the resolved equation.
2. The damage impact chip (`💥 N dmg`) and tray damage equation modifier/soak elements, displaying the itemized breakdown of the damage calculation (rolled dice, critical maximized dice, bonus dice, base attribute bonus, flat/shard bonus, triggered passive bonuses, Armor/Ward mitigation soak, and Graze/Cover multipliers or minimum damage floor) together with the resolved damage formula.

#### Scenario: Attack roll d20 modifier formatting
- **WHEN** an attack check roll is recorded in the combat log or displayed in the attack card roll chip
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

