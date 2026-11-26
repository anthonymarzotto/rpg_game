# Spec Delta

## MODIFIED Requirements

### Requirement: Smart Condition Badges and Rich Tooltips
The system SHALL present active condition badges with clear source attribution and rule mnemonics, and provide instant rich in-engine tooltips on hover. Battlefield standee status bubbles SHALL display each active condition's canonical icon and debuff border tone matching the status card and combat log (`HENOSIS` as `✨` buff, `MORTAL_EBB` as `🕯️` debuff, `CHARMED` as `💘` debuff, `BLINDED` as `🕶️` debuff) rather than falling back to a generic buff glyph.

#### Scenario: Condition badge displays source attribution and effect reminder
- **WHEN** an active condition badge is rendered in a status card or target preview card
- **THEN** the badge SHALL include the condition icon, duration in turns, and attribution indicating the source unit (e.g. `by Garrick`)
- **AND** conditions with tactical penalties or benefits (such as `CHALLENGED` or `EXPOSED`) SHALL display a compact effect reminder (e.g. `Disadv` or `+Adv`)

#### Scenario: Hovering condition badge displays instant rich tooltip
- **WHEN** the player hovers over an active condition badge or stat modifier in the active unit card, pinned card, or timeline ribbon
- **THEN** the system SHALL display an instant, styled in-engine floating tooltip detailing the condition title, duration, source unit, and full mechanical rules without native browser tooltip delay

#### Scenario: Hovering standee status bubble on hex arena displays condition tooltip
- **WHEN** the player hovers their cursor over the status icon bubble above a combatant's standee on the hex battlefield
- **THEN** the system SHALL display the rich condition tooltip directly in the arena viewport adjacent to the combatant

#### Scenario: Standee status bubbles distinguish Mortal Ebb, Charmed, and Blinded from Henosis
- **WHEN** combatants on the hex battlefield hold `MORTAL_EBB`, `CHARMED`, `BLINDED`, or `HENOSIS`
- **THEN** a unit with `MORTAL_EBB` SHALL display the `🕯️` icon with debuff border styling rather than `✨`
- **AND** a unit with `CHARMED` SHALL display the `💘` icon with debuff border styling
- **AND** a unit with `BLINDED` SHALL display the `🕶️` icon with debuff border styling
- **AND** a unit with `HENOSIS` SHALL display the `✨` icon with buff border styling

## ADDED Requirements

### Requirement: Action Bar Ability Lockout Disabling and Tooltip Reasons
The tactical Action Bar SHALL disable any ability button that cannot currently be cast by the active unit due to insufficient AP or a caster-level lockout (including an active per-caster condition cap such as `Henosis` or a once-per-turn ability already used during the current turn). Hovering over any disabled ability button SHALL continue to reveal the ability's full hover tooltip (description, stats, and effects) along with a clear unavailable reason explaining why the ability is disabled.

#### Scenario: Henosis button disables while caster has an active vessel and explains why on hover
- **WHEN** a Theurge is the active player unit and already has a living unit holding `HENOSIS` cast by that Theurge
- **THEN** the `Henosis` button in the Action Bar SHALL be disabled even if the Theurge has sufficient AP
- **AND** hovering the disabled `Henosis` button SHALL display the full ability description alongside an unavailable reason naming the active vessel

#### Scenario: Once-per-turn ability disables after use and explains why on hover
- **WHEN** the active player unit has already executed a once-per-turn ability during the current turn (such as `Blood Frenzy`, `Spell Sculpt`, or `Siege Barrage`)
- **THEN** that ability's button in the Action Bar SHALL be disabled for the remainder of the turn
- **AND** hovering the disabled button SHALL display the full ability description alongside an unavailable reason stating that it can only be used once per turn

#### Scenario: Insufficient AP disables ability button and preserves full tooltip with AP reason
- **WHEN** the active player unit has fewer remaining AP than an ability's effective AP cost
- **THEN** that ability's button in the Action Bar SHALL be disabled
- **AND** hovering the disabled button SHALL display the full ability description alongside an unavailable reason stating the required AP
