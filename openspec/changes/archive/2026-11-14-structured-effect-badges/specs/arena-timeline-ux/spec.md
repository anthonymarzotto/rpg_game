# Spec Delta

## ADDED Requirements

### Requirement: Structured Combat Log Effect Pills and Hover Tooltips
The combat log panel SHALL render structured `effects` metadata on `ATTACK`, `UTILITY`, `BUFF`, and `PASSIVE` cards as a wrapped row of compact, category-styled visual pills rather than raw bracketed text strings or regex-parsed passive strings.

Each compact pill SHALL display a concise icon and summary label appropriate to its outcome category (such as condition name and duration, displacement kind/target coordinate, collision/fall impact, buff/stat delta, CTB gauge shift, collateral/splash hit summary, or roll context modifier) and apply semantic tone styling (`buff`, `debuff`, `damage`, `displacement`, `context`, or `neutral`).

Hovering any compact pill that carries additional detail SHALL render an instant, scroll-safe portal tooltip (`EffectBadgeTooltip`) adjacent to the pill displaying full mechanical details (such as DoT damage per turn, duration, collision obstacle/bystander HP, splash roll vs. defense and applied splash conditions, or modifier breakdown).

#### Scenario: Attack card renders secondary effects as compact color-coded pills
- **WHEN** an `ATTACK` combat log entry includes structured `effects` such as elevation bonus, applied `BURN` condition, and `KNOCKBACK` displacement
- **THEN** the combat log card SHALL render each outcome as an individual compact pill inside the card's effect pill row rather than a single concatenated bracketed text string
- **AND** each pill SHALL apply tone styling matching its category (e.g., debuff styling for `BURN`, displacement styling for `KNOCKBACK`, context styling for elevation)

#### Scenario: Hovering a compact effect pill reveals full structured breakdown in portal tooltip
- **WHEN** the player hovers over a compact effect pill (such as `🔥 Burn 2t` or a `SPLASH` hit pill) in the combat log panel
- **THEN** an in-engine portal tooltip (`EffectBadgeTooltip`) SHALL appear adjacent to the pill without being clipped by the combat log scroll container
- **AND** the tooltip SHALL display the full outcome details (such as `1 dmg/turn · 2 turns`, or splash damage, defense DC, remaining HP, and splash conditions)

#### Scenario: Buff and Passive cards render structured effect pills without regex bracket stripping
- **WHEN** a `BUFF` or `PASSIVE` combat log entry includes structured `effects` (such as `+2 Armor (2t)`, `+15 CTB`, or `Fall Damage Negated`)
- **THEN** the combat log card SHALL render those effects directly as compact pills from the structured metadata without running regex string parsing over `effectDetail`
- **AND** `UTILITY` cards with non-zero collision or fall damage SHALL display their structured collision/displacement pills alongside the damage impact line

#### Scenario: Splash area spell merges hit outcome and applied splash conditions cleanly
- **WHEN** a ground-targeted or AoE attack (`Wyrmflame Breath`, `Arcane Blast`) hits or misses secondary targets within its radius
- **THEN** each affected secondary target SHALL render as a compact collateral/splash pill showing the target name and damage or `Miss`
- **AND** hovering the splash pill SHALL show the splash contest (`vs DC`), remaining HP, and any secondary conditions applied to that target (such as `Burn`)
