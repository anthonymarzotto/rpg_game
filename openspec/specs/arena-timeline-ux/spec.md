# Arena & Timeline UX Specification

## Purpose

Provides interactive bidirectional hover highlighting between initiative queue chips and hex battlefield combatants, transient unit status card inspection, and an optimized, spaced timeline ribbon layout with prominent turn order indicators.

## Requirements

### Requirement: Bidirectional Hover Highlight
The system SHALL support bidirectional hover highlighting between the CTB initiative ribbon and units on the hex battlefield.

#### Scenario: Hovering timeline chip highlights battlefield combatant
- **WHEN** the player hovers their cursor over an initiative chip on the timeline ribbon
- **THEN** the corresponding unit on the hex battlefield SHALL display an astral hover highlight halo (cyan for allies, crimson for hostiles) around their pedestal base and token standee
- **AND** the combatant name plate SHALL be highlighted in bright white

#### Scenario: Hovering battlefield combatant highlights all corresponding timeline chips
- **WHEN** the player hovers their cursor over a combatant's tile or standee on the hex battlefield
- **THEN** all projected turn chips belonging to that combatant across the lookahead queue SHALL display the highlighted state with an animated spring lift and a glowing aura

#### Scenario: Camera viewport remains stationary on hover
- **WHEN** a player hovers over any timeline chip or battlefield unit
- **THEN** the camera viewport SHALL NOT automatically pan or re-center, maintaining stable visual anchoring

### Requirement: Transient Unit Status Preview on Hover
The combat status overlay card SHALL temporarily preview the vitals, defenses, and conditions of any hovered combatant, and support locking the preview into a persistent pinned inspection card upon selection, optionally centering the camera on the selected combatant.

When a combatant is pinned, each skill in the `EQUIPPED ABILITIES` list SHALL be evaluated through `getEffectiveAbility` against the unit's active `abilityModifiers`, rendering a concise **Compact Mechanical 1-Liner** directly on the skill row (with `Normal -> Shard -> In-Trial` provenance color highlights) and displaying the full **Hybrid Ability Tooltip** (flavor text, Stat Strip pills, Effect Clauses, and active augments footer) when hovered.

#### Scenario: Hovering timeline chip previews unit in status card
- **WHEN** the player hovers over an initiative chip on the timeline ribbon
- **THEN** the `UnitStatusCard` SHALL display the hovered unit's current HP, maximum HP, defense attributes (EVA, RES, ARM, WRD, MOV, SPD), CTB gauge, and active conditions

#### Scenario: Hover ends and view reverts to active or pinned unit
- **WHEN** the cursor leaves the timeline chip or battlefield unit
- **THEN** the `UnitStatusCard` SHALL immediately revert to displaying the pinned unit if one is selected, or the currently active unit otherwise

#### Scenario: Clicking unit or timeline chip in IDLE mode pins inspection card
- **WHEN** the player clicks any allied or hostile combatant on the hex battlefield or their chip in the timeline ribbon while in `IDLE` action mode
- **THEN** the system SHALL set that combatant as the pinned unit
- **AND** the inspection card SHALL remain persistently displayed under the active unit card even as the cursor moves across the screen
- **AND** the pinned unit on the battlefield SHALL display a distinct selection ring
- **AND** clicking a timeline chip SHALL center the camera viewport on the combatant's hex position

#### Scenario: Dismissing pinned unit card
- **WHEN** the player clicks an empty tile on the battlefield, clicks the active unit, presses the `Escape` key, or clicks the close button on the pinned card
- **THEN** the system SHALL clear the pinned unit and unpin the inspection card

#### Scenario: Pinned inspection card displays active skill loadout and AP
- **WHEN** a combatant is pinned in the inspection card
- **THEN** the card SHALL display the combatant's remaining AP and CTB gauge
- **AND** the card SHALL evaluate each equipped ability with the unit's active modifiers and display the ability name, effective AP/HP cost, and a compact mechanical 1-liner reflecting any shard or in-trial modifications
- **AND** hovering over any equipped ability row on the pinned card SHALL display the full Hybrid Ability Tooltip with flavor text, Stat Strip pills, Effect Clauses, and active augments

#### Scenario: Entering an action mode clears or suspends pinned card
- **WHEN** the player initiates a `MOVE` action or selects an `ABILITY` to enter targeting mode
- **THEN** the pinned inspector card SHALL yield the secondary card slot to the targeting or movement preview

### Requirement: Streamlined Initiative Ribbon Layout and Turn Order Display
The CTB initiative ribbon SHALL present a minimalist queue anchor, spaced turn chips, and prominent turn order numerals.

#### Scenario: Minimalist queue anchor
- **WHEN** the combat arena renders the initiative ribbon
- **THEN** the ribbon SHALL display a compact hourglass icon anchor `⏳` with tooltip rather than a verbose text header, maximizing available horizontal layout width

#### Scenario: Expanded chip spacing and label width
- **WHEN** initiative chips are rendered in the queue track
- **THEN** chips SHALL be spaced with at least `14px` gap and unit labels SHALL have a minimum width of `56px` to prevent truncation of character names

#### Scenario: Prominent turn order badges
- **WHEN** turn order chips are displayed along the ribbon
- **THEN** the currently active unit SHALL display a `NOW` badge
- **AND** all subsequent upcoming turns SHALL display their ordinal turn order number (`2`, `3`, `4`...) in prominent, high-contrast badges

### Requirement: In-Combat Character Card XP Gain Tracker
The combat status overlay card SHALL display an inline XP progression tracker for player units showing projected totals, current battle gains, next level threshold, and ascension readiness across Force, Finesse, and Focus attributes.

#### Scenario: Active player unit displays projected totals and inline gains
- **WHEN** the combat status overlay renders the active player combatant card
- **THEN** the card SHALL display the unit's projected XP for Force, Finesse, and Focus attributes using compact abbreviations (`FRC`, `FIN`, `FOC`), calculated as baseline accumulated XP plus current in-battle XP
- **AND** any attribute with in-battle XP greater than zero SHALL display an inline battle gain badge formatted as `(+N)`
- **AND** any attribute with zero in-battle XP SHALL omit the `(+0)` indicator

#### Scenario: Display next level XP threshold
- **WHEN** the XP progression tracker renders for a unit below the maximum level cap
- **THEN** the section header SHALL display the required XP threshold for the unit's next level
- **AND** when the unit has reached the maximum level cap, the header SHALL display `MAX` with no numeric threshold

#### Scenario: Ascension threshold reached highlight
- **WHEN** a unit's projected total XP in an attribute meets or exceeds the required threshold for their next level
- **THEN** the attribute entry SHALL display an astral gold highlight and an ascension ready glyph `✦`
- **AND** provide tooltip text confirming the attribute qualifies for ascension in Camp

#### Scenario: Inspected allied unit displays XP tracker
- **WHEN** the player hovers over an allied combatant on the hex battlefield or CTB initiative ribbon
- **THEN** the inspected unit card SHALL display the allied unit's XP progression tracker with their projected totals, battle gains, and threshold readiness

#### Scenario: Hostile and non-player units omit XP tracker
- **WHEN** the active unit or inspected unit belongs to an enemy or non-player faction
- **THEN** the status card SHALL NOT render the XP progression tracker

### Requirement: Smart Condition Badges and Rich Tooltips
The system SHALL present active condition badges with clear source attribution and rule mnemonics, and provide instant rich in-engine tooltips on hover.

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

### Requirement: Tactical Targeting Cancellation via Right-Click
The system SHALL allow players to cancel ability targeting and return to neutral idle mode via secondary mouse interaction when not performing a camera pan drag.

#### Scenario: Right-clicking cancels ability targeting mode
- **WHEN** the player taps the right mouse button without dragging (movement <= 5px) anywhere within the hex arena viewport while in `ABILITY` targeting mode
- **THEN** the system SHALL cancel targeting and revert the action mode to `IDLE`
- **AND** suppress the default browser context menu

#### Scenario: Right-drag pans without canceling targeting
- **WHEN** the player right-clicks and drags across the arena viewport while in `ABILITY` targeting mode
- **THEN** the camera viewport SHALL pan to follow the drag
- **AND** the active `ABILITY` targeting mode SHALL remain active without cancellation

### Requirement: Interactive Movement Path Preview and Hazard Segmentation
When an active player unit is in `MOVE` action mode, the combat arena SHALL render a visible movement path connecting the active unit's coordinate to the hovered destination hex along the calculated traversal path.

#### Scenario: Hovering reachable tile renders lifted movement path stepping stones
- **WHEN** the player enters `MOVE` mode and hovers over any reachable hex tile
- **THEN** the arena SHALL physically lift each sequential path hex by 5px above its elevation base with a 3D dark under-lip shadow
- **AND** each path hex step SHALL display a sequential step number badge (`1`, `2`, `3`...) centered on its lifted face
- **AND** the destination hex SHALL render an outer pulsating dashed ring

#### Scenario: Path clears when not hovering a reachable tile
- **WHEN** the cursor leaves the reachable tile area or hovers an unreachable/obstacle tile
- **THEN** the lifted stepping stones and step badges SHALL NOT be displayed

#### Scenario: Normal terrain steps display warm amber styling
- **WHEN** a movement path step traverses flat terrain ($\Delta h = 0$), climbs terraces ($\Delta h > 0$), or steps down a single tier ($\Delta h = -1$)
- **THEN** the path hex SHALL display warm amber/gold highlighting with soft glow to contrast against reachable cyan tiles

#### Scenario: Hazardous cliff drops highlight with warning styling
- **WHEN** a movement path step drops off a cliff ledge ($\Delta h \le -2$) inflicting fall impact damage
- **THEN** the specific step plunging off the ledge SHALL display warning crimson styling
- **AND** a hazard warning badge (`⚠️` + step number) SHALL be displayed on that step

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

### Requirement: Chronological Causal Logging and Challenge Defiance Cards
The combat log SHALL log actor attack actions prior to reactive condition triggers, render challenge defiance as a distinct `⚔️ CHALLENGE DEFIED` card, and render source-defeat condition removals (`reason: 'source_defeated'`) with condition-specific cleared badges (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, `✨ HENOSIS CLEARED`) rather than conflating them with challenge defiance.

#### Scenario: Attack actions precede reactive condition defiance
- **WHEN** an attacker with an active `CHALLENGED` condition attacks a unit other than its designated challenger
- **THEN** the attack execution log entry SHALL be recorded before the condition defiance entry in the combat log

#### Scenario: Challenge defiance card rendering
- **WHEN** a combat log entry records that a unit defied a challenge and became `EXPOSED` (`reason: 'defied'`)
- **THEN** the log panel SHALL render a dedicated card displaying a `⚔️ CHALLENGE DEFIED` badge and warning context note

#### Scenario: Source-defeated condition cleared card rendering
- **WHEN** a `CONDITION_BROKEN` log entry records `reason: 'source_defeated'` for `CHALLENGED`, `CHARMED`, or `HENOSIS`
- **THEN** the log panel SHALL render a cleared badge matching the condition (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, or `✨ HENOSIS CLEARED`) and a footer note explaining the source unit was defeated

### Requirement: Battlefield Floating Combat Text Legibility and Stacking
The combat system SHALL render high-contrast, scalable floating combat text over combatants with elevated spawn positioning, tiered event sizing, and anti-overlap vertical stacking.

#### Scenario: Floating combat text renders with high-contrast silhouette stroke
- **WHEN** any floating combat text item (damage, crit, miss, graze, slam, displacement, condition, xp, or initiative) is rendered in the arena viewport
- **THEN** the text SHALL be rendered with a heavy dark silhouette stroke (`paint-order: stroke fill`) ensuring full readability over all underlying tile terrain, spell effects, and elevation heights

#### Scenario: Elevated spawn anchor clears unit standees
- **WHEN** a floating combat text item appears above a combatant's grid coordinate
- **THEN** the initial vertical spawn coordinate SHALL be positioned at least 36px above the projected tile center (`y - 36`), preventing occlusion of unit tokens, standees, and status bubbles

#### Scenario: Tiered event sizing hierarchy
- **WHEN** floating combat text renders in the combat arena
- **THEN** major impact events (`CRITICAL!`, `SLAM!`, `BLAST!`, `COLLISION!`, `KNOCKBACK!`, `FALL!`) SHALL render at large emphasis size (26px–28px in SVG space)
- **AND** standard attack damage numbers, `MISS`, `RESIST!`, `RETREAT!`, `TELEPORT!`, custom non-knockback displacement shouts (such as `INTERCEPT!` or `VAULT!`), and `🎲 <initiative>` SHALL render at medium size (20px–22px)
- **AND** secondary utility notifications (`+N XP`, `+N STAT`, `POISON`, `BURN`, and custom `CTB_DELAY` shouts) SHALL render at compact size (16px–18px)

#### Scenario: Suppressed effect events produce no floating text
- **WHEN** a `DISPLACEMENT` or utility `CombatEvent` carries `label: null` (or resolves via `DisplacementKind` default to `null`, such as `'CHARGE'`)
- **THEN** the floating combat text system SHALL emit no floater for that event

#### Scenario: Anti-collision vertical stacking for concurrent floaters
- **WHEN** multiple floating combat text items are active on the same battlefield coordinate at the same time
- **THEN** each subsequent floating item SHALL be displaced vertically above preceding active items by a dynamic offset (at least 18px per stacked item)
- **AND** multiple concurrent text items SHALL NOT overlap or occlude each other

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

### Requirement: Faction-Themed Combat Log Event Cards
The combat log panel SHALL format and color every event card according to the acting combatant's faction allegiance, supporting player, enemy, and neutral entities.

#### Scenario: Player action cards receive starlight cyan theming
- **WHEN** an event is logged where the acting combatant belongs to the `PLAYER` faction
- **THEN** the combat card SHALL render with player-thematic borders and background accents (`.faction-player`)
- **AND** the actor's display name SHALL render in high-contrast cyan (`#7dd3fc`)

#### Scenario: Enemy action cards receive void crimson theming
- **WHEN** an event is logged where the acting combatant belongs to the `ENEMY` faction
- **THEN** the combat card SHALL render with enemy-thematic borders and background accents (`.faction-enemy`)
- **AND** the actor's display name SHALL render in high-contrast rose/crimson (`#fca5a5`)

#### Scenario: Neutral and ambient entity action cards receive celestial amber theming
- **WHEN** an event is logged where the acting entity belongs to the `NEUTRAL` faction or an ambient arena hazard
- **THEN** the combat card SHALL render with neutral amber borders and accents (`.faction-neutral`)
- **AND** the actor's display name SHALL render in warm amber (`#fcd34d`)

### Requirement: Structured Passive and Environmental Hazard Cards
The combat logging pipeline SHALL emit structured, first-class event cards for passive trait activations and environmental hazard outcomes rather than falling back to unstyled generic text.

#### Scenario: Feline Grace negating ledge fall damage renders styled passive card
- **WHEN** a combatant with fall damage immunity plunges from a ledge of two or more elevation tiers
- **THEN** the combat log SHALL emit a structured `PASSIVE` card with badge `⚡ PASSIVE`
- **AND** the card header SHALL display the passive name `Feline Grace` and actor name with appropriate faction theming
- **AND** the card body SHALL explicitly state that fall impact damage was negated

#### Scenario: Direct ledge plunge inflicting fall damage renders styled environment hazard card
- **WHEN** a combatant without fall damage immunity plunges from a ledge of two or more elevation tiers and suffers fall impact damage
- **THEN** the combat log SHALL emit a structured `ENVIRONMENT` card with badge `⚠️ HAZARD`
- **AND** the card SHALL display the actor name, fall impact damage dealt, and remaining target HP

### Requirement: Interactive Combat Log Unit Filtering
The combat log panel SHALL provide an interactive unit filter selector in the chronicle header, allowing players to view actions focused on a specific combatant.

#### Scenario: All Units view displays full sequential chronicle
- **WHEN** the unit filter is set to `All Units`
- **THEN** all logged actions across all combatants SHALL be rendered in reverse chronological order according to active type filters

#### Scenario: Selecting a unit filters to relevant actions
- **WHEN** a player selects a specific unit from the unit filter selector
- **THEN** the combat log SHALL only display event cards where the selected unit was:
  - the primary actor of the action, OR
  - the primary targeted combatant, OR
  - caught within secondary, splash, or area effect damage
- **AND** unrelated actions SHALL be hidden from view

#### Scenario: Empty state for filtered unit with no events
- **WHEN** a unit is selected that has participated in zero actions matching the current filter criteria
- **THEN** the combat log SHALL display an empty state hint confirming no actions have been logged for that unit yet

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

### Requirement: Structured Combat Log Effect Pills and Hover Tooltips
The combat log panel SHALL render structured `effects` metadata on `ATTACK`, `UTILITY`, `BUFF`, and `PASSIVE` cards as a wrapped row of compact, category-styled visual pills rather than raw bracketed text strings or regex-parsed passive strings.

Each compact pill SHALL display a concise icon and summary label appropriate to its outcome category (such as condition name and duration, displacement kind/target coordinate, collision/fall impact, buff/stat delta, CTB gauge shift, collateral/splash hit summary, or roll context modifier) and apply semantic tone styling (`buff`, `debuff`, `damage`, `displacement`, `context`, or `neutral`).

Hovering any compact pill that carries additional detail SHALL render an instant, scroll-safe portal tooltip (`EffectBadgeTooltip`) adjacent to the pill displaying full mechanical details (such as DoT damage per turn, duration, collision obstacle/bystander HP, splash roll vs. defense and applied splash conditions, or modifier breakdown). All prose descriptions, row values, and summary notes inside `EffectBadgeTooltip` SHALL wrap cleanly within the tooltip container's maximum width without horizontal overflow.

#### Scenario: Attack card renders secondary effects as compact color-coded pills
- **WHEN** an `ATTACK` combat log entry includes structured `effects` such as elevation bonus, applied `BURN` condition, and `KNOCKBACK` displacement
- **THEN** the combat log card SHALL render each outcome as an individual compact pill inside the card's effect pill row rather than a single concatenated bracketed text string
- **AND** each pill SHALL apply tone styling matching its category (e.g., debuff styling for `BURN`, displacement styling for `KNOCKBACK`, context styling for elevation)

#### Scenario: Hovering a compact effect pill reveals full structured breakdown in portal tooltip
- **WHEN** the player hovers over a compact effect pill (such as `🔥 Burn 2t` or a `SPLASH` hit pill) in the combat log panel
- **THEN** an in-engine portal tooltip (`EffectBadgeTooltip`) SHALL appear adjacent to the pill without being clipped by the combat log scroll container
- **AND** the tooltip SHALL display the full outcome details (such as `1 dmg/turn · 2 turns`, or splash damage, defense DC, remaining HP, and splash conditions)

#### Scenario: Long context tooltip descriptions wrap cleanly inside the tooltip container
- **WHEN** the player hovers over a `CONTEXT` effect pill with a prose description (such as `Graze Mitigation` / `GRAZE_NEGATED`) or a condition pill with a multi-word summary
- **THEN** the tooltip text SHALL wrap cleanly within the tooltip's `max-width` bounds without overflowing horizontally outside the container border

#### Scenario: Buff and Passive cards render structured effect pills without regex bracket stripping
- **WHEN** a `BUFF` or `PASSIVE` combat log entry includes structured `effects` (such as `+2 Armor (2t)`, `+15 CTB`, or `Fall Damage Negated`)
- **THEN** the combat log card SHALL render those effects directly as compact pills from the structured metadata without running regex string parsing over `effectDetail`
- **AND** `UTILITY` cards with non-zero collision or fall damage SHALL display their structured collision/displacement pills alongside the damage impact line

#### Scenario: Splash area spell merges hit outcome and applied splash conditions cleanly
- **WHEN** a ground-targeted or AoE attack (`Wyrmflame Breath`, `Arcane Blast`) hits or misses secondary targets within its radius
- **THEN** each affected secondary target SHALL render as a compact collateral/splash pill showing the target name and damage or `Miss`
- **AND** hovering the splash pill SHALL show the splash contest (`vs DC`), remaining HP, and any secondary conditions applied to that target (such as `Burn`)

### Requirement: Coiled Apex Virtual Height Visual Feedback
When a combatant has armed `Coiled Apex` Virtual Height (`virtualElevation > 0`), the combat arena and HUD SHALL provide clear visual feedback across the unit status card, hex token status bubble, target preview, and turn-end floating text.

#### Scenario: Armed Coiled Apex displays ready passive chip and buff badge on UnitStatusCard
- **WHEN** an active, hovered, or pinned combatant has `virtualElevation > 0`
- **THEN** the `Coiled Apex` chip in the `PASSIVES` row SHALL display the ready-glow state and a `(+1 Height)` counter
- **AND** the `active-modifiers-row` SHALL display a `Coiled Apex (+1 Height)` buff badge with a hover tooltip explaining `+2 Attack Roll`, `+2 Apex Strike Damage`, and `-2 Incoming Enemy Hit` until the next attack

#### Scenario: Armed Coiled Apex displays overhead status icon on battlefield token
- **WHEN** a living combatant on the hex battlefield has `virtualElevation > 0`
- **THEN** the unit's overhead status icon bubble on `HexGridSvg` SHALL include the Coiled Apex indicator icon

#### Scenario: Armed Coiled Apex displays indicator badge in Target Preview and turn-end floater
- **WHEN** a player unit with `Coiled Apex` ends their turn with 1 or more unspent AP to arm `+1 Virtual Height`
- **THEN** floating combat text indicating `Coiled Apex (+1 Height)` SHALL render above the unit
- **WHEN** that unit subsequently hovers a valid attack target while `virtualElevation > 0`
- **THEN** the Target Preview header SHALL display an active `Coiled Apex` indicator badge
