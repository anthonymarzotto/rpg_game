# Spec Delta

## MODIFIED Requirements

### Requirement: Effective Ability Resolution & Attributions
The engine SHALL evaluate an ability against a collection of active modifiers using a pure resolution function (`getEffectiveAbility`). The resulting `EffectiveAbility` SHALL retain all standard `Ability` properties while tracking a collection of `PropertyAttribution` records documenting every modified property, its source name, its provenance tier (`'SHARD'` for socketed astral augment shards or `'TRIAL'` for in-combat primers and temporary modifiers), and a human-readable change label.

When `getEffectiveAbility` is invoked on an ability that already carries pre-resolved `attributions`, `appliedModifierIds`, or `attackRollBonus` (such as a combat ability hydrated with socketed shards via `resolveUnitLoadout`), it SHALL preserve all existing attributions, modifier IDs, and bonuses even when no additional in-combat modifiers apply (`applicable.length === 0`), and SHALL append new attributions when in-combat modifiers are layered on top. Any `AbilityEffect` appended or patched by a modifier SHALL record its provenance tier and source name so downstream formatters can highlight modified or injected effects.

#### Scenario: Tracking attribution for modified properties
- **WHEN** an ability's range is modified by "Spell Sculpt" from 3 to 4
- **THEN** the resolved `EffectiveAbility` includes a range attribution recording `sourceName: "Spell Sculpt"`, `tier: "TRIAL"`, and `changeLabel: "+1 Range"`

#### Scenario: Preserving pre-resolved shard attributions in combat when no in-trial modifiers are active (B.10)
- **WHEN** a unit enters combat with an ability augmented by a socketed shard (e.g. "Bloodbound Shard" or "Starlight Lens") and `getEffectiveAbility` is evaluated with an empty `abilityModifiers` list
- **THEN** the returned `EffectiveAbility` retains the shard's `attributions`, `appliedModifierIds`, and patched effect provenance rather than resetting `attributions` to an empty array

#### Scenario: Layering in-trial primer on top of pre-resolved shard ability
- **WHEN** an ability already augmented by a `'SHARD'` modifier (e.g. "Starlight Lens" upgrading `1d6 -> 1d8`) is evaluated with an active `'TRIAL'` modifier (e.g. "Blood Frenzy" upgrading `1d8 -> 1d10` and `+2 Attack Roll`)
- **THEN** the resolved `EffectiveAbility` preserves both the `'SHARD'` attribution and the `'TRIAL'` attribution, and resolves the property's display provenance tier to `'TRIAL'` according to `Normal -> Shard -> In-Trial` precedence

#### Scenario: Ephemeral primer consumed on ability execution
- **WHEN** an ability modified by a modifier with `consumesOnUse: true` is executed in combat
- **THEN** the ability resolves with the modified stats and the consumed modifier is removed from the unit's active modifiers list

### Requirement: Combat UI Augment Indicators & Tooltips
The combat interface SHALL reflect active modifications on action bar buttons and in hover tooltips using a unified Hybrid Ability Description model. Action buttons SHALL display an illuminated augment indicator (`✦`) whenever the ability has any `'SHARD'` or `'TRIAL'` attributions, and SHALL color-code altered costs and stats using the 3-tier precedence `Normal -> Shard -> In-Trial`.

Hover tooltips on the Action Bar SHALL render:
1. **Thematic Flavor Line**: The ability's concise, number-free thematic `description`.
2. **Scannable Stat Strip Pills**: Structured pills for Reach/Area (e.g., `Melee 1`, `Range 3 • Blast 1`, `Cone 2`, `Self`), Defense Contest (e.g., `+FIN vs EVA`, `+FOC vs RES`), Primary/Splash Damage (e.g., `1d6 + FRC Physical`, `1d4 Splash`), and any HP sacrifice cost, with each pill colored by its highest active provenance tier (`NORMAL`, `SHARD`, or `TRIAL`).
3. **Generated Effect Clauses**: Human-readable descriptions for every non-primary `AbilityEffect` and conditional damage bonus (never raw enum dumps such as `SINGLE_TARGET` or `Effect: STAT_MODIFIER (Mag: 2)`), colored by provenance tier when injected or modified by a shard or in-trial modifier.
4. **Active Augments Footer**: An itemized summary of all active `'SHARD'` and `'TRIAL'` augment sources and their change labels.

#### Scenario: Action button indicates active modifications
- **WHEN** an active combat unit has shard augments or in-trial modifiers affecting an ability on the action bar
- **THEN** the ability button displays a celestial augment glyph (`✦`) and highlights any modified AP or HP cost in the corresponding provenance tier color

#### Scenario: Hover tooltip displays inline attribution and augment summary
- **WHEN** a player hovers over an ability on the action bar
- **THEN** the tooltip displays the flavor sentence, scannable stat strip pills, human-readable effect clauses for all secondary/utility effects, and the active augments summary footer without exposing raw internal enum strings

#### Scenario: Provenance color precedence highlights Normal vs Shard vs In-Trial changes
- **WHEN** an ability has stats or effects modified by a socketed shard and/or an in-combat primer
- **THEN** untouched stats/effects render in normal styling, shard-modified stats/effects render in Shard styling, and stats/effects modified by an in-combat primer (even if also modified by a shard) render in In-Trial styling

## ADDED Requirements

### Requirement: Deterministic Ability Description & Effect Clause Formatting
The system SHALL provide a deterministic formatting engine that converts any `Ability` or `EffectiveAbility` into structured Stat Strip pills, human-readable Effect Clauses covering all `AbilityEffectType` variants, and a Compact Mechanical 1-Liner. Authored `Ability.description` strings across all Novice and Class packages SHALL contain pure thematic flavor prose without hardcoded dice counts, damage numbers, ranges, or stat deltas that could contradict modified values.

#### Scenario: Formatting stat modifier and condition effects into readable clauses
- **WHEN** an ability contains `STAT_MODIFIER` (e.g., `{ armor: -2, evasion: -2 }` for 2 turns) or `CONDITION` (e.g., `BURN` with `magnitude: 2`, `durationTurns: 2`)
- **THEN** the formatter produces human-readable effect clauses (e.g., `On Hit: Inflicts -2 Armor, -2 Evasion (2 turns)` and `On Hit: Inflicts Burn (2 dmg/turn, 2 turns)`) rather than raw enum/magnitude labels

#### Scenario: Formatting conditional bonus damage and special movement effects
- **WHEN** an ability contains conditional bonus damage (`FLANK_OR_REAR` or `TARGET_CHALLENGED`) or movement/stance effects (`RUSH_CHARGE`, `PENETRATE_STEP`, `RETREAT_STEP`, `TELEPORT`, `POSITION_SWAP`, `AERIAL_VAULT`, `LINE_PIERCE`, `BASTION_STANCE`)
- **THEN** the formatter produces clear tactical clauses describing the trigger condition, bonus dice/attack bonus, and movement or stance behavior

#### Scenario: Generating compact mechanical 1-liner
- **WHEN** the formatter generates a compact 1-liner for an ability
- **THEN** it produces a concise single-line summary combining reach/area, primary damage or defense contest, and key secondary effect keywords reflecting any active shard or in-trial modifications
