# composable-abilities Specification Delta

## MODIFIED Requirements

### Requirement: Composable Ability Effects Pipeline
The combat engine SHALL model abilities as an execution envelope containing an array of atomic `AbilityEffect` objects rather than a single monolithic damage profile and secondary effect. Each effect SHALL declare its type, execution payload, optional `targetScope` (`'TARGET' | 'SELF' | 'ALLIES'`), optional `applyOn` trigger condition (`'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY' | 'HIT_ONLY' | 'GRAZE_ONLY'`), optional tactical execution condition (`condition: 'FLANK_OR_REAR' | 'TARGET_CHALLENGED'`), optional `bonusDamage` dice profile evaluated when the condition is satisfied, and optional to-hit modifiers including `grantsAdvantage`, `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty`.

Displacement effects that move a unit across grid tiles—including `KNOCKBACK`, `PULL`, and `RETREAT_STEP`—SHALL evaluate the elevation delta between origin and destination tiles. When displacement plunges off an elevated ledge ($\Delta h \le -2$), the system SHALL calculate raw fall impact damage ($|\Delta h| \times 4$) and resolve unmitigated fall damage against the displaced unit, dispatching a `DAMAGE` event with `reason: 'FALL'`. When a `PULL` effect resolves against a target at distance 2 or greater, the system SHALL step the target 1 hex along the line toward the actor (`getHexLine`) provided that destination hex is walkable, unoccupied, and does not exceed standard climb elevation ($\Delta h \le \text{maxClimbElevation}$), unless the target possesses displacement immunity. If a retreat step encounters an impassable elevation climb ($\Delta h > \text{maxClimbElevation}$) or an unwalkable obstacle, displacement SHALL be aborted unless the unit possesses a trait granting `canVaultOnRetreat`. Units with `canVaultOnRetreat` SHALL vault up onto the cliff top when the landing tile is walkable and unoccupied, or vault over an adjacent 1-hex obstacle onto the far-side hex if open.

#### Scenario: Multi-effect execution on hit
- **WHEN** an ability with both a physical damage effect and a knockback effect scores a solid hit against an enemy
- **THEN** both the damage and the knockback displacement are dispatched and resolved against the target

#### Scenario: Unconditional self-buff executes regardless of hit outcome
- **WHEN** an ability declares an attack damage effect with `applyOn: 'HIT_OR_CRIT'` and an armor buff effect on self with `applyOn: 'ALWAYS'`
- **THEN** missing the attack roll negates the damage against the target while still applying the armor buff to the caster

#### Scenario: Secondary effects negated on graze
- **WHEN** an attack with `applyOn: 'HIT_OR_CRIT'` secondary effects (e.g. poison condition or knockback) scores a Graze outcome
- **THEN** the damage effect resolves at half value and all secondary effects are negated

#### Scenario: Graze-only effect triggers exclusively on Graze outcome
- **WHEN** a contested ability declares an effect with `applyOn: 'GRAZE_ONLY'` (such as `Billet-Doux` applying `EXPOSED` on a Graze) and the roll results in a `GRAZE`
- **THEN** the `GRAZE_ONLY` effect is executed while `HIT_ONLY`, `HIT_OR_CRIT`, and `CRIT_ONLY` effects are skipped

#### Scenario: Pull effect draws target 1 hex toward actor and evaluates fall damage
- **WHEN** an ability with a `PULL` effect (`magnitude: 1`) hits a target at distance 2 or 3 whose next step along the line toward the actor is walkable and unoccupied
- **THEN** the target is displaced 1 hex toward the actor and a `DISPLACEMENT` event with `kind: 'PULL'` is emitted
- **THEN** if the pulled step drops down a ledge with $\Delta h \le -2$, the target suffers Fall Impact Damage unless immune to fall damage

#### Scenario: Ability effect imposes disadvantage on attack roll
- **WHEN** an attack ability effect specifies `grantsDisadvantage: true`
- **THEN** the attack roll evaluates with Disadvantage unless canceled by an Advantage source

#### Scenario: Tactical condition TARGET_CHALLENGED applies bonus damage
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that has an active `CHALLENGED` condition
- **THEN** the bonus damage dice are rolled and added to the attack's damage payload before armor/ward mitigation

#### Scenario: Tactical condition TARGET_CHALLENGED omitted when target is not challenged
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that does not possess `CHALLENGED`
- **THEN** the bonus damage dice are not rolled and only the baseline damage profile resolves

#### Scenario: Retreat step down cliff ledge inflicts fall damage
- **WHEN** a unit on elevation 2 executes `Skirmish` or an ability with `RETREAT_STEP` and steps backward onto a tile at elevation 0 ($\Delta h = -2$)
- **THEN** the unit is displaced to the lower tile and suffers 8 direct Fall Impact Damage (`reason: 'FALL'`) unless protected by fall damage immunity

#### Scenario: Retreat step blocked by impassable cliff climb
- **WHEN** a unit without vaulting passives executes `Skirmish` with a retreat destination tile that is vertically higher than the actor's tile by more than `maxClimbElevation` ($\Delta h > 2$)
- **THEN** the retreat displacement is aborted and the unit remains on their starting tile

#### Scenario: Retreat step vaults up high cliff when unit has canVaultOnRetreat
- **WHEN** a unit possessing `canVaultOnRetreat` (e.g. equipped with `Feline Grace`) executes `Skirmish` with a retreat destination tile at $\Delta h = 3$ that is walkable and unoccupied
- **THEN** the unit vaults up onto the cliff top destination hex rather than being blocked

#### Scenario: Retreat step vaults over obstacle when unit has canVaultOnRetreat
- **WHEN** a unit possessing `canVaultOnRetreat` executes `Skirmish` with an adjacent unwalkable 1-hex obstacle in the retreat direction, and the far-side hex is walkable and unoccupied
- **THEN** the unit vaults over the obstacle to the far-side hex
