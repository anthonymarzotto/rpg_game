# tier-4-theurge Specification

## Purpose

Defines the complete class package, combat abilities, single-vessel divine ascension and mortal recovery lifecycle (`HENOSIS` and `MORTAL_EBB`), negative status condition purification (`Absolution`), elevation-ignoring vertical solar judgment (`Empyrean Pillar`), vessel-projected radiant pulse passive (`Theurgic Synergy`), and token integration for the Tier 4 Theurge (1 Fighter, 0 Rogue, 3 Mage) in the celestial constellation progression.

## ADDED Requirements

### Requirement: Theurge Class Package Resolution
The system SHALL provide a bespoke class package for the Theurge `(1 Fighter, 0 Rogue, 3 Mage)` consisting of signature ability `Henosis`, domain pool abilities `Absolution` and `Empyrean Pillar`, innate passive trait `Theurgic Synergy`, and default AI tactical profile `SUPPORT`.

#### Scenario: Theurge package resolution
- **WHEN** a unit equips the Theurge active class
- **THEN** their core combat abilities resolve to `Henosis`, `Absolution`, and `Empyrean Pillar`
- **THEN** their innate passive trait resolves to `Theurgic Synergy`
- **THEN** their default AI tactical profile resolves to `SUPPORT`

### Requirement: Henosis Signature Vessel Ascension and Mortal Ebb Aftermath
The system SHALL provide a signature combat ability `Henosis` costing 2 AP with range 0–3 targeting a friendly unit or self (`targetType: 'ALLY'`, `defenseTarget: 'NONE'`, `damageType: 'NONE'`).
- Executing `Henosis` SHALL apply the `HENOSIS` condition for 2 turns to the target unit (`sourceUnitId: actorUnitId`).
- While afflicted with `HENOSIS`, a unit SHALL receive `+2 Attack Roll`, `+2 Armor`, `+2 Ward`, `+1 Move`, and `+1 Speed`.
- **Strict Single-Vessel Exclusivity**: A unit SHALL NOT be allowed to execute `Henosis` while any living unit on the battlefield currently holds an active `HENOSIS` condition whose `sourceUnitId` matches the acting unit. If the unit holding `HENOSIS` is defeated, the exclusivity lockout SHALL clear immediately.
- **Mortal Ebb Transition and Target Lockout**: `HENOSIS` SHALL decrement its duration at the end of the bearer's turn. When `HENOSIS` expires at the end of the bearer's second turn (`durationTurns` reaches 0), the system SHALL automatically apply the `MORTAL_EBB` condition for 1 turn (`sourceUnitId: condition.sourceUnitId`).
- While afflicted with `MORTAL_EBB`, a unit SHALL suffer `-1 Attack Roll`, `-1 Armor`, `-1 Ward`, `-1 Move`, and `-1 Speed` (respecting standard stat floors: Armor and Ward floor at 0; Move and Speed floor at 1), and SHALL NOT be a valid target for `Henosis`. A Theurge MAY cast `Henosis` on a different eligible unit while a prior vessel is in `MORTAL_EBB`. `MORTAL_EBB` SHALL decrement and expire at the end of the bearer's recovery turn.

#### Scenario: Henosis elevates target ally or self for 2 turns
- **WHEN** a unit executes `Henosis` targeting an ally within 3 hexes (or self at distance 0)
- **THEN** the action consumes 2 AP
- **THEN** the target receives the `HENOSIS` condition for 2 turns granting `+2 Attack Roll`, `+2 Armor`, `+2 Ward`, `+1 Move`, and `+1 Speed`

#### Scenario: Strict single-vessel lockout rejects recasting while vessel is active
- **WHEN** a Theurge attempts to execute `Henosis` while any living unit on the arena already possesses `HENOSIS` applied by that Theurge
- **THEN** ability validation rejects the execution with a descriptive reason stating that a divine vessel is already active

#### Scenario: Defeat of active Henosis vessel frees the lockout
- **WHEN** the unit holding `HENOSIS` from a Theurge is defeated before `HENOSIS` expires
- **THEN** the Theurge can execute `Henosis` again on a subsequent turn

#### Scenario: Henosis expiration transitions vessel into 1-turn Mortal Ebb
- **WHEN** a unit with `HENOSIS` completes its second turn with the condition active
- **THEN** `HENOSIS` expires and is removed
- **THEN** the unit automatically receives `MORTAL_EBB` for 1 turn, applying `-1 Attack Roll`, `-1 Armor`, `-1 Ward`, `-1 Move`, and `-1 Speed` until the end of its next turn

#### Scenario: Mortal Ebb prevents re-targeting that unit with Henosis while allowing another unit
- **WHEN** Unit A is currently afflicted with `MORTAL_EBB` and no living unit currently holds `HENOSIS` from the Theurge
- **THEN** ability validation rejects targeting Unit A with `Henosis`
- **THEN** ability validation permits targeting a different friendly Unit B (or self, if not afflicted with `MORTAL_EBB`) with `Henosis`

### Requirement: Absolution Status Purification and Turn Acceleration
The system SHALL provide a domain combat ability `Absolution` costing 1 AP with range 0–3 targeting a friendly unit or self (`targetType: 'ALLY'`, `defenseTarget: 'NONE'`, `damageType: 'NONE'`). Executing `Absolution` SHALL purge all active negative status conditions (`POISON`, `BURN`, `EXPOSED`, `BLINDED`, `CHALLENGED`, `TELEMETRY`) from the target unit—preserving `HENOSIS`, `MORTAL_EBB`, and `STEALTH`—and SHALL boost the target unit's CTB initiative gauge by `+20` ticks (`INITIATIVE_BOOST`, `magnitude: 20`).

#### Scenario: Absolution purges multiple negative conditions and boosts CTB
- **WHEN** a unit executes `Absolution` on an ally (or self) within 3 hexes that is afflicted with `POISON` and `BLINDED`
- **THEN** the action consumes 1 AP
- **THEN** both `POISON` and `BLINDED` are immediately removed from the target
- **THEN** the target's CTB initiative gauge increases by 20 ticks

#### Scenario: Absolution does not purge Mortal Ebb
- **WHEN** a unit executes `Absolution` on an ally (or self) afflicted with `MORTAL_EBB`
- **THEN** the target receives the `+20` CTB initiative gauge boost
- **THEN** the `MORTAL_EBB` condition remains active on the target

### Requirement: Empyrean Pillar Elevation-Ignoring Solar Judgment and CTB Delay
The system SHALL provide a domain combat ability `Empyrean Pillar` costing 1 AP with range 1–3 targeting a single hostile unit (`targetType: 'SINGLE_TARGET'`), resolving a magical spellcast roll (`attackModifierAttribute: 'focus'`) against `RESOLVE` with `damageType: 'MAGICAL'` and `ignoresElevationPenalty: true`. On hit, `Empyrean Pillar` SHALL deal `1d4 + Focus` magical damage (half on Graze), ignoring upward low-ground attack roll penalties and disadvantage. On a Solid Hit or Critical Hit (`HIT_OR_CRIT`), `Empyrean Pillar` SHALL delay the target's CTB initiative gauge by `20` ticks (`CTB_DELAY`, `magnitude: 20`, floored at 0).

#### Scenario: Empyrean Pillar damages and delays enemy on Solid Hit from low ground
- **WHEN** a unit at elevation 0 executes `Empyrean Pillar` against an enemy at elevation 2 within range 3 and rolls a Solid Hit or Critical Hit
- **THEN** the attack roll suffers no low-ground penalty or disadvantage
- **THEN** the target takes `1d4 + Focus` magical damage mitigated by Ward
- **THEN** the target's CTB initiative gauge is reduced by 20 ticks (floored at 0)

#### Scenario: Empyrean Pillar Graze deals half damage without CTB delay
- **WHEN** a unit executes `Empyrean Pillar` and the attack roll results in a Graze
- **THEN** the target suffers grazed magical damage
- **THEN** the target's CTB initiative gauge is not delayed

### Requirement: Theurgic Synergy Vessel-Projected Radiant Pulse Passive
The system SHALL provide an innate passive trait `Theurgic Synergy`. Whenever a unit equipped with `Theurgic Synergy` scores a **Solid Hit** or **Critical Hit** with a `MAGICAL` attack ability (excluding Graze and Miss), the system SHALL emit a 1-hex radiant pulse around the bearer's active living `HENOSIS` vessel (a living unit on the arena holding `HENOSIS` with `sourceUnitId === actorUnitId`), or around the bearer themselves if no such active living `HENOSIS` vessel exists. Every hostile unit occupying a hex adjacent (distance 1) to that conduit unit SHALL suffer `1` unmitigated magical damage (`reason: 'PASSIVE'`, `label: 'SYNERGY'`).

#### Scenario: Theurgic Synergy pulses from active Henosis vessel on magical Solid Hit
- **WHEN** a Theurge equipped with `Theurgic Synergy` has an active living `HENOSIS` vessel across the arena and scores a Solid Hit or Critical Hit with `Empyrean Pillar`
- **THEN** each enemy unit positioned adjacent (distance 1) to the `HENOSIS` vessel suffers `1` unmitigated magical damage

#### Scenario: Theurgic Synergy falls back to pulsing from self when no Henosis vessel is active
- **WHEN** a unit equipped with `Theurgic Synergy` has no active living `HENOSIS` vessel on the arena and scores a Solid Hit or Critical Hit with a magical attack
- **THEN** each enemy unit positioned adjacent (distance 1) to the attacking unit itself suffers `1` unmitigated magical damage

#### Scenario: Theurgic Synergy does not trigger on Graze or Miss
- **WHEN** a unit equipped with `Theurgic Synergy` executes a magical attack that results in a Graze or Miss
- **THEN** no `Theurgic Synergy` radiant pulse damage is emitted

### Requirement: Theurge Package Registration and Wildcard Integration
The system SHALL register the Theurge package in the global class package catalog, whitelist the `79_human_male` pixel token identifier, configure the class badge palette with Empyrean Azure (`#1e3a8a`) and Celestial Gold (`#f59e0b`), include `theurge` in Stage 6+ Tier-4 enemy encounter generation, and allow eligible units to equip the package or equip `Absolution` and `Empyrean Pillar` as wildcard abilities and `Theurgic Synergy` as a wildcard passive.

#### Scenario: Equipping Theurge domain abilities and passive as wildcards
- **WHEN** a unit has unlocked the Theurge node in their celestial constellation
- **THEN** the unit can equip `Absolution` or `Empyrean Pillar` into active wildcard ability slots and `Theurgic Synergy` into an active wildcard passive slot
- **THEN** combat validation confirms the loadout as valid
