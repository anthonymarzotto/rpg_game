# Spec Delta

## ADDED Requirements

### Requirement: Secondary Splash and Collateral Damage Labeling
The combat system SHALL support declarative secondary damage labeling across abilities and atomic combat events. Damaging abilities with an area-of-effect blast radius (`aoeRadius > 0`) SHALL support an optional declarative `splashLabel` property. When resolving secondary damage, the system SHALL emit `DAMAGE` events carrying a dedicated `CombatDamageReason` (`'SPLASH'` for blast splash, `'COLLATERAL'` for bystander collision and secondary sweeps) and an explicit presentation `label`. The combat system SHALL record all secondary splash damage targets, damage values, and remaining HP in combat log metadata, and the floating combat text system SHALL display the event's designated presentation label.

#### Scenario: Arcane Blast splash emits custom BLAST label and records secondary log
- **WHEN** an actor executes `Arcane Blast` (configured with `aoeRadius: 1` and `splashLabel: 'BLAST'`) scoring a solid hit or critical hit on a primary target with adjacent living enemies
- **THEN** secondary enemies within 1 hex receive splash damage events with `reason: 'SPLASH'` and `label: 'BLAST'`
- **THEN** the floating combat text on secondary targets renders with prefix `BLAST! `
- **THEN** the action's combat log entry records the secondary targets, damage amounts, and remaining vitals in `secondaryDetail`

#### Scenario: Area-of-effect ability without custom label defaults to SPLASH
- **WHEN** an ability with `aoeRadius > 0` that does NOT define `splashLabel` (such as a spell augmented by `Spell Sculpt`) deals secondary damage to adjacent units
- **THEN** secondary damage events are emitted with `reason: 'SPLASH'` and `label: 'SPLASH'`
- **THEN** the floating combat text on secondary targets renders with prefix `SPLASH! `
- **THEN** the combat log records the secondary targets under a `Splash hit` summary in `secondaryDetail`

#### Scenario: Cleave frontal sweep emits CLEAVE label
- **WHEN** an ability with a `CLEAVE` effect damages secondary units in the frontal arc
- **THEN** secondary damage events are emitted with `label: 'CLEAVE'`
- **THEN** the floating combat text on secondary targets renders with prefix `CLEAVE! `

#### Scenario: Knockback bystander collision emits COLLISION label
- **WHEN** a knocked-back unit collides with another unit, dealing collateral impact damage to the bystander
- **THEN** the collateral damage event is emitted with `reason: 'COLLATERAL'` and `label: 'COLLISION'`
- **THEN** the floating combat text on the bystander renders with prefix `COLLISION! `

#### Scenario: Wild Surge arcane discharge emits SURGE label
- **WHEN** a critical hit triggers a Wild Surge arcane discharge dealing magic damage to a random enemy
- **THEN** the surge damage event is emitted with `label: 'SURGE'`
- **THEN** the floating combat text on the struck enemy renders with prefix `SURGE! `
