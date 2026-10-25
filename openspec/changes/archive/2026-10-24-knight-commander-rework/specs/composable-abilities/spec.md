# Spec Delta

## MODIFIED Requirements

### Requirement: Composable Ability Effects Pipeline
The combat engine SHALL model abilities as an execution envelope containing an array of atomic `AbilityEffect` objects rather than a single monolithic damage profile and secondary effect. Each effect SHALL declare its type, execution payload, optional `targetScope` (`'TARGET' | 'SELF' | 'ALLIES'`), optional `applyOn` trigger condition (`'ALWAYS' | 'HIT_OR_CRIT' | 'CRIT_ONLY'`), optional tactical execution condition (`condition: 'FLANK_OR_REAR' | 'TARGET_CHALLENGED'`), optional `bonusDamage` dice profile evaluated when the condition is satisfied, and optional to-hit modifiers including `grantsAdvantage`, `grantsDisadvantage`, `attackRollBonus`, and `attackRollPenalty`.

#### Scenario: Multi-effect execution on hit
- **WHEN** an ability with both a physical damage effect and a knockback effect scores a solid hit against an enemy
- **THEN** both the damage and the knockback displacement are dispatched and resolved against the target

#### Scenario: Unconditional self-buff executes regardless of hit outcome
- **WHEN** an ability declares an attack damage effect with `applyOn: 'HIT_OR_CRIT'` and an armor buff effect on self with `applyOn: 'ALWAYS'`
- **THEN** missing the attack roll negates the damage against the target while still applying the armor buff to the caster

#### Scenario: Secondary effects negated on graze
- **WHEN** an attack with `applyOn: 'HIT_OR_CRIT'` secondary effects (e.g. poison condition or knockback) scores a Graze outcome
- **THEN** the damage effect resolves at half value and all secondary effects are negated

#### Scenario: Ability effect imposes disadvantage on attack roll
- **WHEN** an attack ability effect specifies `grantsDisadvantage: true`
- **THEN** the attack roll evaluates with Disadvantage unless canceled by an Advantage source

#### Scenario: Tactical condition TARGET_CHALLENGED applies bonus damage
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that has an active `CHALLENGED` condition
- **THEN** the bonus damage dice are rolled and added to the attack's damage payload before armor/ward mitigation

#### Scenario: Tactical condition TARGET_CHALLENGED omitted when target is not challenged
- **WHEN** an ability declaring an effect with `condition: 'TARGET_CHALLENGED'` and `bonusDamage` strikes a target that does not possess `CHALLENGED`
- **THEN** the bonus damage dice are not rolled and only the baseline damage profile resolves
