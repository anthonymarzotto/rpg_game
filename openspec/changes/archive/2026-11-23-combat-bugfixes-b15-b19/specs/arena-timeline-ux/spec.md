# arena-timeline-ux Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
