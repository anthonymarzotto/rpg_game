# Spec Delta: Composable Abilities

## ADDED Requirements

### Requirement: Metadata-Driven Effect Lifecycle Phases and Unified Event Application
The combat engine SHALL classify every effect type through centralized declarative metadata defining its default execution phase (`PRE_ACTION`, `ON_RESOLVE`, or `POST_ACTION`), execution role (roll modifier, primary damage, geometric dispatch, zone deployment, or standard resolution), targeting semantics, and whether it supports target-scoped resolution delivery.

During ability execution:
1. Effects whose resolved phase is `PRE_ACTION` (including `RUSH_CHARGE` and `AERIAL_VAULT`, or any effect explicitly declaring `timing: 'PRE_ACTION'`) SHALL execute exclusively before the attack roll and SHALL NOT be dispatched during `ON_RESOLVE` or `POST_ACTION`.
2. Self-scoped effects SHALL be identified consistently across direct ability resolution and delayed bombardment detonation from declared `targetScope: 'SELF'` data (including `Smoke Veil`) and shared metadata helpers rather than hard-coded per-condition or per-effect checks.
3. Actor-displacing effects that reference the primary target coordinate (such as `RETREAT_STEP`) SHALL execute at most once per action against the primary target rather than repeating for every splash hit in a multi-target action.
4. Post-action condition hooks (`onAfterAction`, such as breaking pre-existing `STEALTH` on attack or applying `EXPOSED` when defying `CHALLENGED`) SHALL run after event application on contested attack actions and before `POST_ACTION` effects. Non-attack buffs, teleports, and battlefield zone launches SHALL execute `ON_RESOLVE` effects strictly before `POST_ACTION` effects without invoking attack-only `onAfterAction` hooks.
5. Direct ability execution and delayed bombardment detonation SHALL share a single combat event application pipeline so all damage (including collision, fall, and infusion damage) invokes `onTakeDamage` condition reactions (such as breaking `STEALTH`), swap displacements, and defeat cleanup identically.
6. Multi-target `ON_RESOLVE` resolution SHALL apply damage and displacement events sequentially per target through the shared event application pipeline rather than mutating arena coordinates early and re-applying them later, ensuring units defeated by primary or splash damage are removed from the arena before subsequent knockbacks resolve occupancy.

#### Scenario: PRE_ACTION effects never leak into ON_RESOLVE or POST_ACTION
- **WHEN** an ability declares an effect with `timing: 'PRE_ACTION'` (or a pre-roll positioning effect such as `RUSH_CHARGE` or `AERIAL_VAULT`) alongside `ON_RESOLVE` and `POST_ACTION` effects
- **THEN** the `PRE_ACTION` effect is excluded from both `ON_RESOLVE` and `POST_ACTION` dispatch passes

#### Scenario: Zone launch executes ON_RESOLVE self-buffs strictly before POST_ACTION effects
- **WHEN** a unit executes `Siege Barrage` or `Shrapnel Canister` augmented with both an `ON_RESOLVE` unconditional self-buff (`Bastion Shard`) and a `POST_ACTION` self-buff (`Shadow Shard`) regardless of socket order
- **THEN** the `ON_RESOLVE` self-buff executes and commits before the `POST_ACTION` self-buff

#### Scenario: Bombardment infusion collision damage breaks Stealth via shared event application
- **WHEN** a Stealthed enemy takes collision or fall damage triggered by an `Impact Shard` infusion on a detonating `Siege Barrage`
- **THEN** the shared event application pipeline invokes `onTakeDamage` hooks and breaks the victim's `STEALTH`

#### Scenario: Defeated splash victim does not block a subsequent AoE knockback
- **WHEN** an `Arcane Blast` augmented with `Impact Shard` deals lethal splash damage to Enemy A standing directly behind Enemy B, and Enemy B survives and is knocked back into Enemy A's hex
- **THEN** Enemy A's defeat removes them from the arena before Enemy B's knockback calculates occupancy
- **THEN** Enemy B is displaced cleanly into the vacated hex without colliding with the already-defeated Enemy A

#### Scenario: Non-attack utility preserves Stealth while still running POST_ACTION effects
- **WHEN** a Stealthed unit executes a non-attack utility or teleport (such as `Shadow Step` or `Smoke Veil`)
- **THEN** attack-only `onAfterAction` hooks do not strip `STEALTH`
- **THEN** any `POST_ACTION` shard effect still executes after `ON_RESOLVE`

### Requirement: Snapshotted Origin for Delayed Bombardment Displacements
When a `DELAYED_BOMBARDMENT` ability is launched, the pending bombardment record SHALL snapshot the launcher's hex coordinate at launch time. When the bombardment detonates on a later turn, target-scoped displacement infusions (such as `Impact Shard` or `Repelling Shard`) SHALL compute push direction away from the snapshotted launch coordinate rather than querying the launcher's live arena position.

#### Scenario: Siege Barrage with Impact Shard pushes from launch position after launcher moves
- **WHEN** a Ballistician at `(-3, 0)` launches `Siege Barrage` augmented with `Impact Shard` onto `(0, 0)`, then moves to `(0, 3)` before detonation
- **THEN** upon detonation, a hit enemy at `(0, 0)` is knocked back 1 hex away from `(-3, 0)` (toward `(1, 0)`) rather than away from `(0, 3)`

#### Scenario: Siege Barrage with Impact Shard still knocks back enemies if launcher is defeated before detonation
- **WHEN** a Ballistician at `(-3, 0)` launches `Siege Barrage` augmented with `Impact Shard` and is defeated before the bombardment detonates
- **THEN** upon detonation, a hit enemy at `(0, 0)` is still knocked back 1 hex away from `(-3, 0)` despite the launcher no longer occupying the arena
