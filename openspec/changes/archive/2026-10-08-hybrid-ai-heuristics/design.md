# Design

## Context

The simulation engine uses a headless utility-scoring AI (`src/core/ai/`) that evaluates candidate actions (`MOVE`, `ABILITY`, `CONSERVE_AP`) on every turn. The decision engine currently implements baseline weights for four archetypes (`BRAWLER`, `SKIRMISHER`, `SNIPER`, `SUPPORT`) and specific primer handling for `BLOOD_FRENZY` and `SPELL_SCULPT`.

However, the five Tier 3 dual-archetype hybrid kits introduce new tactical patterns that the current heuristics do not fully evaluate:
1. **Cavalier (`BRAWLER`)**: Straight-line shock charges (`Lance Charge`) and melee taunt/evasion priming (`Flamboyant Flourish`).
2. **Highwayman (`SKIRMISHER`)**: Armor-shredding and CTB-theft priming (`Stand and Deliver!`) followed by close-range recoil blasts (`Point-Blank Buckshot`).
3. **Warlock (`SNIPER`)**: Maintaining standoff distance (range 2–3), using kinetic knockback (`Eldritch Blast`) to repel approaching melee threats, and falling back to armor-bypassing melee (`Pact Blade`) when cornered.
4. **Witch (`SUPPORT`)**: Allied tempo acceleration (`Witch's Talisman` granting +25 CTB ticks and +2 Speed) and effigy manipulation (`Poppet Needle` forcing target to face 180° away).
5. **Move-and-Buff Blind Spot**: In `decisionEngine.ts`, composite move-and-act candidate generation only considers follow-up attacks on hostile units (`ability.targetType === 'SINGLE_TARGET'`). Allied buff abilities are never considered as follow-ups after moving, preventing support units from stepping into range to assist allies.

## Goals / Non-Goals

**Goals:**
- Enable composite move-and-buff candidate generation in `decisionEngine.ts` so support units can reposition and buff allies in a single turn.
- Enhance `scoreBuffAbility()` in `heuristics.ts` to score `INITIATIVE_BOOST` and speed acceleration on allies.
- Implement tactical debuff and combo scoring for `Stand and Deliver!` (shred armor and delay CTB before burst attacks).
- Implement kinetic spacing heuristics for `SNIPER` profiles using `Eldritch Blast` and `Point-Blank Buckshot`.
- Author comprehensive, automated test suites in `decisionEngine.test.ts` validating all five Tier 3 hybrid class AI profiles and combo behaviors.

**Non-Goals:**
- Modifying campaign encounter generation, threat budgets, or stage scaling (reserved for Phase 5.7).
- Adding vertical terrain climbing or ledge-drop AI heuristics (reserved for Phase 6 / 6b).
- Introducing machine learning, non-deterministic RNG weights, or stateful blackboard architectures.

## Decisions

### 1. Extend Unified Scoring Heuristics Rather Than Authoring Class-Specific Engines
- **Choice**: Integrate new tactical heuristics directly into `scoreBuffAbility()`, `scoreAbilityAction()`, and `getArchetypeWeights()` rather than writing bespoke `CavalierAI`, `WitchAI`, etc. classes.
- **Rationale**: Units in Astral Tactics can equip abilities from other classes via wildcard slots (e.g. a Rogue equipping `Witch's Talisman` or `Pact Blade`). Class-agnostic ability scoring ensures any unit equipped with these abilities evaluates them intelligently based on their active profile and the ability's intrinsic effects.
- **Alternatives Considered**: Subclassing `DecisionEngine` per class package. Rejected because it breaks wildcard modularity and duplicates core movement/targeting search.

### 2. Move-and-Buff Candidate Generation
- **Choice**: In `decisionEngine.ts`, extend the reachable hex evaluation loop to check `ability.targetType === 'ALLY' || ability.damageType === 'NONE'` after moving.
- **Rationale**: If a Witch is 3 hexes away from an ally and `Witch's Talisman` has range 2, the current engine cannot find the action because it only checks immediate abilities from the current hex. Evaluating candidate moves that bring the ally into ability range unlocks natural support movement.
- **Pruning Optimization**: Only perform the ally move-and-buff check if the actor actually has at least one ally-targeted ability and `cu.currentAp >= ability.apCost + 1`.

### 3. Kinetic Repulsion Scoring for Snipers
- **Choice**: When evaluating abilities with `KNOCKBACK` or displacement from a unit with `SNIPER` profile against an adjacent enemy (distance 1), award an explicit defensive spacing bonus.
- **Rationale**: Snipers suffer from enemy melee proximity. Knocking the target back 1 hex not only deals attack damage and potential wall-slam damage, but restores standoff range 2 and protects the sniper's next turn.

### 4. CTB Acceleration & Speed Buff Scoring
- **Choice**: In `scoreBuffAbility()`, evaluate `INITIATIVE_BOOST` effects. Award higher utility when the target ally has a lower current CTB gauge or is engaged in melee with enemies.
- **Rationale**: Accelerating an ally whose turn is already imminent has lower marginal utility than accelerating a frontline fighter who is delayed or lagging behind on the CTB turn clock.

## Risks / Trade-offs

- **[Risk] Pathfinding search explosion from adding ally buff move-and-act candidates**:
  - *Mitigation*: Pre-check whether actor possesses affordable allied abilities before iterating reachable tiles. The number of allies (typically 2–3) is much smaller than the arena size, keeping evaluations well under 5ms per turn.
- **[Risk] Primer self-buff looping (e.g. repeatedly buffing without attacking)**:
  - *Mitigation*: Strictly enforce guard checks in `scoreBuffAbility` (e.g. checking if target already has the modifier or condition) and verify that follow-up attack abilities exist before awarding primer bonuses.
