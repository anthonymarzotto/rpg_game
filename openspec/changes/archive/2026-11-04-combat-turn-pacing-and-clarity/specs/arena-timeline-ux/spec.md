# Spec Delta: Arena & Timeline UX

## ADDED Requirements

### Requirement: Circular Gauge Progress Rings and Paced Clock Advancement
The CTB initiative ribbon SHALL render dynamic circular progress rings on unit chips that fill clockwise as initiative gauge ticks accumulate, and pace clock advancement when ticks are required.

#### Scenario: Chip circular progress ring fills proportionally to initiative gauge
- **WHEN** an initiative chip is rendered or updated on the CTB initiative ribbon
- **THEN** the chip avatar wrap SHALL render a circular progress border (cyan for player faction, rose for hostile faction) filling clockwise from 0% to 100% proportional to the unit's initiative gauge relative to the turn threshold

#### Scenario: Paced clock advancement when ticks are required
- **WHEN** a unit concludes their turn and the CTB clock must advance by one or more ticks to bring the next unit to the turn threshold
- **THEN** the combat arena UI SHALL pace the visual clock stepping over approximately 1.0 second, updating chip circular progress rings at each tick step

#### Scenario: Immediate transition when subsequent unit is already ready
- **WHEN** a unit concludes their turn and another combatant is already at or above the turn threshold (zero ticks required)
- **THEN** the combat arena UI SHALL transition immediately to the next ready unit without stepping delay

### Requirement: Active Unit Beacon Pulse and Turn Cadence Feedback
The combat arena SHALL emit visual and floating text feedback indicating turn start and turn end boundaries for both player and hostile combatants.

#### Scenario: Active unit emits expanding beacon pulse on turn start
- **WHEN** any combatant becomes the active unit at the start of a turn
- **THEN** an expanding beacon pulse ripple SHALL radiate outward from the unit's hex pedestal over approximately 400ms before fading

#### Scenario: Turn start call-out floating text
- **WHEN** a player unit becomes the active unit at turn start
- **THEN** floating combat text displaying `My Turn!` SHALL render above the unit's standee
- **AND** when a hostile unit becomes active, floating combat text displaying the unit's name SHALL render above their standee

#### Scenario: Turn end feedback with banked AP
- **WHEN** a combatant concludes their turn with one or more unspent action points
- **THEN** floating combat text displaying `+<amount> Initiative` SHALL render above the unit indicating refunded CTB gauge

#### Scenario: Turn end feedback with zero unspent AP
- **WHEN** a combatant concludes their turn with zero unspent action points
- **THEN** floating combat text displaying `Turn End` SHALL render above the unit, and `+0 Initiative` SHALL NOT be displayed

### Requirement: Combat Chronicle Turn Demarcation Headers
The combat log panel SHALL render distinct visual turn dividers separating action cards into clearly partitioned turns.

#### Scenario: Turn divider banner renders at turn boundaries
- **WHEN** the combat log panel renders action cards spanning multiple turns
- **THEN** a prominent horizontal turn header divider SHALL render at the boundary of each turn, displaying the turn number and the active unit's name

#### Scenario: Existing rich action cards remain fully intact within turn groups
- **WHEN** action cards are rendered under a turn header divider
- **THEN** all existing card information, roll breakdowns, hover tooltips, target HP chips, and damage breakdown details SHALL be preserved without summarization or truncation
