# Spec Delta: Composable Abilities

## ADDED Requirements

### Requirement: Explicit Effect Execution Timing Lifecycle
The combat engine SHALL support an explicit execution timing phase on each `AbilityEffect` (`timing?: 'PRE_ACTION' | 'ON_RESOLVE' | 'POST_ACTION'`, defaulting to `'ON_RESOLVE'`).

During ability execution, the engine SHALL resolve effects in strict lifecycle phase order:
1. **`PRE_ACTION`**: Pre-roll positioning or setup effects executed before the attack roll (e.g. `RUSH_CHARGE`, `AERIAL_VAULT`).
2. **Attack Roll & Damage**: Primary attack roll, primary damage, and AoE/cone defense contests and damage.
3. **`ON_RESOLVE`**: Standard primary/secondary effects evaluated against each hit target (respecting `applyOn` and Graze negation) and once-per-action `SELF`-scoped `ON_RESOLVE` effects.
4. **Event Application & Hit-Reaction Facing**: Commit damage, displacements, and statuses to combat state, then update surviving hit targets' facing toward the attack origin (or away when `FORCE_FACING_AWAY` is present).
5. **Post-Action Condition Hooks (`onAfterAction`)**: On contested attack actions, evaluate pre-existing active conditions on the actor (such as breaking pre-existing `STEALTH` on attack or applying `EXPOSED` for defying `CHALLENGED`).
6. **`POST_ACTION`**: Execute and commit all effects declaring `timing: 'POST_ACTION'` after `onAfterAction` cleanup completes on contested attacks, and after `ON_RESOLVE` completes on non-attack utilities/buffs, teleports, and battlefield zone abilities (`DELAYED_BOMBARDMENT`, `SHRAPNEL_RUBBLE`).

`Shadow Shard` SHALL declare `timing: 'POST_ACTION'` on its self-targeted `STEALTH` effect. The deterministic ability description formatter SHALL render `POST_ACTION` effects with an explicit `After Action` trigger label.

#### Scenario: Shadow Shard on an attack grants Stealth after the attack completes
- **WHEN** a unit executes `Sneak Attack` augmented with `Shadow Shard` against an enemy
- **THEN** the attack roll does not receive Stealth Advantage from `Shadow Shard`
- **THEN** any pre-existing `STEALTH` on the actor is broken during `onAfterAction`
- **THEN** `Shadow Shard`'s `POST_ACTION` effect executes afterward and leaves the actor with active `STEALTH` for 1 turn

#### Scenario: Two-shard combo pairs Recoil Shard with Shadow Shard to disengage into Stealth
- **WHEN** a unit executes `Sneak Attack` augmented with both `Recoil Shard` (`ON_RESOLVE`) and `Shadow Shard` (`POST_ACTION`) and scores a solid hit against an adjacent enemy
- **THEN** `Recoil Shard` steps the actor 1 hex away from the target (to distance 2) during `ON_RESOLVE`
- **THEN** hit-reaction facing turns the target toward the attack origin
- **THEN** `Shadow Shard` grants `STEALTH` during `POST_ACTION` while the actor is at distance 2 (outside the victim's distance-1 front-arc detection)

#### Scenario: Post-action self-buff executes on battlefield zone abilities
- **WHEN** a unit executes `Siege Barrage` (`DELAYED_BOMBARDMENT`) or `Shrapnel Canister` (`SHRAPNEL_RUBBLE`) augmented with `Shadow Shard`, `Bastion Shard`, or `Anchorite Shard`
- **THEN** the bombardment zone or shrapnel rubble is placed on the arena
- **THEN** the actor immediately receives the shard's `POST_ACTION` or unconditional `SELF` buff on the launch turn

#### Scenario: Formatter displays After Action label for POST_ACTION effects
- **WHEN** the ability formatter formats an ability augmented with `Shadow Shard` (`timing: 'POST_ACTION'`)
- **THEN** the generated effect clause renders with trigger label `After Action` (e.g., `After Action: Grants Stealth to self (1 turn)`)

### Requirement: Multi-Target AoE, Cone & Delayed Bombardment Shard Delivery
When an ability resolves against multiple units via AoE blast (`aoeRadius >= 1`), directional Cone (`coneTemplate: true`), or delayed bombardment detonation (`DELAYED_BOMBARDMENT`), the combat engine SHALL deliver all target-scoped `ON_RESOLVE` effects (including socketed hostile shard infusions such as `POISON`, `BURN`, `KNOCKBACK`, `SLOW`, `CTB_DELAY`, `STAT_MODIFIER`, `CONDITION`, and `FORCE_FACING`) to every eligible hit unit individually, respecting each unit's own `HitOutcome` (`SOLID_HIT` / `CRITICAL_HIT` apply `HIT_OR_CRIT` effects; `GRAZE` negates secondary non-damage effects; `MISS` applies none).

`SELF`-scoped `ON_RESOLVE` effects (such as `Aegis Shard`, `Warding Shard`, `Flourish Shard`, `Carapace Shard`, `Fury Shard`'s self-Evasion penalty, or `Hold-Up Shard`'s self-CTB boost) SHALL execute at most once per ability action (triggering for `HIT_OR_CRIT` whenever at least one target scores a Solid Hit or Critical Hit) and SHALL NEVER be applied to enemy targets inside an AoE or Cone loop.

Declarative damage patches (`diceStep`, `diceCount`, `flatDamage`) SHALL patch `DELAYED_BOMBARDMENT` effects in addition to `DAMAGE` effects. When launching a `DELAYED_BOMBARDMENT`, the pending bombardment record SHALL snapshot effective shard overrides (`damageType`, `defenseTarget`, `attackRollBonus`, `flatDamage`, `CRIT_BOOST`) and hostile target-scoped `ON_RESOLVE` effects so they resolve against every hit unit upon detonation.

Displacement handlers for `RETREAT_STEP` and `PENETRATE_STEP` SHALL normalize their displacement direction vector to a single 1-hex step along the hex direction between actor and target so ranged attacks (such as ranged `Recoil Shard` / `Buckshot Shard`) and range-extended melee attacks (such as `Astral Reach` + `Trample Shard`) always step by 1 hex rather than the full actor-to-target distance.

#### Scenario: Venom Shard on Arcane Blast poisons every hit enemy in the blast
- **WHEN** a unit executes `Arcane Blast` augmented with `Venom Shard` targeting an empty hex adjacent to Enemy A (Solid Hit), Enemy B (Graze), and Enemy C (Miss)
- **THEN** Enemy A takes splash damage and receives `POISON` for 2 turns
- **THEN** Enemy B takes grazed splash damage and does not receive `POISON`
- **THEN** Enemy C takes 0 damage and does not receive `POISON`

#### Scenario: Shadow Shard on Wyrmflame Breath cloaks only the caster and never enemies
- **WHEN** a Dragoon executes `Wyrmflame Breath` augmented with `Shadow Shard` hitting two enemies in the forward cone
- **THEN** neither enemy receives `STEALTH`
- **THEN** the Dragoon receives `STEALTH` after the attack resolves

#### Scenario: Self-scoped on-hit shard triggers once on multi-target AoE hit
- **WHEN** a unit executes `Arcane Blast` augmented with `Hold-Up Shard` or `Aegis Shard` and hits two enemies in the blast
- **THEN** both hit enemies suffer `CTB_DELAY` (for `Hold-Up Shard`)
- **THEN** the caster receives the self-scoped bonus (`+10` CTB or `+1 Armor`) exactly once for the action

#### Scenario: Siege Barrage carries Power, Aether, and hostile infusion shards to detonation
- **WHEN** a Ballistician launches `Siege Barrage` augmented with `Force Shard` (`+2` flat damage) and `Pyre Shard` (Burn on hit/crit), and Enemy A is hit when the bombardment detonates next turn
- **THEN** Enemy A takes the patched bombardment damage including `+2` flat damage
- **THEN** Enemy A receives `BURN` (2 dmg/turn, 2 turns) upon detonation

#### Scenario: Ranged attack with Recoil Shard steps back exactly 1 hex
- **WHEN** an actor executes a range-3 single-target attack (such as `Throw Dart` or `Sighting Bolt`) augmented with `Recoil Shard` against an enemy 3 hexes away and scores a Solid Hit
- **THEN** the actor steps back exactly 1 hex away from the target along the normalized direction vector rather than jumping 3 hexes
