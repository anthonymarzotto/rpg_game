# Spec Delta

## MODIFIED Requirements

### Requirement: Henosis Signature Vessel Ascension and Mortal Ebb Aftermath
The system SHALL provide a signature combat ability `Henosis` costing 2 AP with range 0–3 targeting a friendly unit or self (`targetType: 'ALLY'`, `defenseTarget: 'NONE'`, `damageType: 'NONE'`).
- Executing `Henosis` SHALL apply the `HENOSIS` condition for 2 turns to the target unit (`sourceUnitId: actorUnitId`).
- While afflicted with `HENOSIS`, a unit SHALL receive `+2 Attack Roll`, `+2 Armor`, `+2 Ward`, `+1 Move`, and `+1 Speed`.
- **Strict Single-Vessel Exclusivity**: A unit SHALL NOT be allowed to execute `Henosis` while any living unit on the battlefield currently holds an active `HENOSIS` condition whose `sourceUnitId` matches the acting unit—including if that vessel is temporarily `CHARMED` to an opposing faction. Each Theurge maintains their own independent single-vessel cap. If the unit holding `HENOSIS` is defeated, the exclusivity lockout SHALL clear immediately.
- **Mortal Ebb Transition and Target Lockout**: `HENOSIS` SHALL decrement its duration at the end of the bearer's turn. When `HENOSIS` expires at the end of the bearer's second turn (`durationTurns` reaches 0), the system SHALL automatically apply the `MORTAL_EBB` condition for 1 turn (`sourceUnitId: condition.sourceUnitId`).
- While afflicted with `MORTAL_EBB`, a unit SHALL suffer `-1 Attack Roll`, `-1 Armor`, `-1 Ward`, `-1 Move`, and `-1 Speed` (respecting standard stat floors: Armor and Ward floor at 0; Move and Speed floor at 1), and SHALL NOT be a valid target for `Henosis`. A Theurge MAY cast `Henosis` on a different eligible unit while a prior vessel is in `MORTAL_EBB`. `MORTAL_EBB` SHALL decrement and expire at the end of the bearer's recovery turn.

#### Scenario: Henosis elevates target ally or self for 2 turns
- **WHEN** a unit executes `Henosis` targeting an ally within 3 hexes (or self at distance 0)
- **THEN** the action consumes 2 AP
- **THEN** the target receives the `HENOSIS` condition for 2 turns granting `+2 Attack Roll`, `+2 Armor`, `+2 Ward`, `+1 Move`, and `+1 Speed`

#### Scenario: Strict single-vessel lockout rejects recasting while vessel is active
- **WHEN** a Theurge attempts to execute `Henosis` while any living unit on the arena already possesses `HENOSIS` applied by that Theurge
- **THEN** ability validation rejects the execution with a descriptive reason stating that a divine vessel is already active

#### Scenario: Charmed Henosis vessel continues to lock out its caster
- **WHEN** a Theurge has an active `HENOSIS` vessel on the arena and that vessel is subsequently afflicted with `CHARMED` by an opposing unit
- **THEN** ability validation continues to reject executing `Henosis` by that Theurge while the charmed vessel remains alive with `HENOSIS`

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
