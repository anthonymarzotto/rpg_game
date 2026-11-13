## MODIFIED Requirements

### Requirement: Ally Buff and Tempo Evaluation
The AI decision system SHALL evaluate ally-targeted and AoE squad-buffing abilities (`targetType: 'ALLY'` or `aoeRadius > 0`) during turn decision scoring, assigning utility bonuses to CTB initiative boosts and speed modifiers (`Witch's Talisman`) when targeting allied combatants engaged in melee or lagging on the CTB initiative track, scaling AoE squad rallies (`Lead the Charge`) by the number of unbuffed allies in radius, and gating `POSITION_SWAP` rescue abilities (`Intercept Step`) on pulling threatened allies back from danger. The AI SHALL assign zero utility to initiative-boosting effects if the allied target's initiative gauge is already at or near maximum (>= 80) or if the ally currently has an active positive speed modifier. Composite move-and-buff candidate scores SHALL NOT suppress pure movement approach candidates from being evaluated on the same destination hex.

#### Scenario: Witch casts Witch's Talisman on frontline ally
- **WHEN** an active Witch unit has 1 AP and an allied combatant within range 2 engaged in melee with an enemy and lagging on initiative (< 80)
- **THEN** the AI evaluates `Witch's Talisman` with positive utility and prioritizes granting the ally CTB acceleration and speed

#### Scenario: Repetitive initiative boost suppressed on high-tempo ally
- **WHEN** an ally currently has an initiative gauge >= 80 or already has an active positive speed modifier
- **THEN** the AI assigns zero utility score to casting `Witch's Talisman` or initiative boosts on that ally

#### Scenario: Composite move-and-buff candidate generation
- **WHEN** an active support unit has sufficient AP (>= 2) and movement to reach an ally out of base ability range
- **THEN** the AI generates and scores composite move-then-buff candidate actions

#### Scenario: Unengaged move-and-buff candidate does not suppress advancing
- **WHEN** an AI unit is outside hostile attack range and evaluates a candidate move hex from which an unengaged self or ally buff could be cast with a low net score (below the conservation threshold)
- **THEN** the AI still evaluates pure distance-closing approach movement on that destination hex and retains the higher-scoring move candidate rather than skipping its turn

#### Scenario: Support unit rallies grouped allies with Lead the Charge
- **WHEN** an AI unit with an AoE positive stat buff (`Lead the Charge`) starts a turn within blast radius of unbuffed allied units
- **THEN** `scoreBuffAbility` scales utility upward per unbuffed ally in radius so the unit casts the rally buff rather than conserving AP

#### Scenario: Shield-bearer only swaps positions to rescue a threatened forward ally
- **WHEN** an AI unit evaluates a `POSITION_SWAP` buff (`Intercept Step`) targeting an ally
- **THEN** the AI assigns zero utility if the ally is safe or further from hostile units than the actor
- **AND** awards rescue bonus utility when the ally is within range 2 of hostiles and closer to hostiles than the actor

## ADDED Requirements

### Requirement: Melee Support Approach and Challenged Follow-Up Synergy
The AI decision system SHALL allow `SUPPORT` units possessing no ranged damaging attacks (`range >= 2`) to advance to melee engagement distance (distance 1) rather than hovering at standoff range 2, while keeping multi-target `Challenging Shout` casts unrestricted across visible enemies. Offensive abilities declaring `TARGET_CHALLENGED` conditional bonuses (`Pommel Strike`) SHALL receive bonus utility when targeting a foe currently afflicted with `CHALLENGED`.

#### Scenario: Melee-only Support unit steps into melee after buffing or challenging
- **WHEN** an AI Knight (`SUPPORT` profile with only Range 1 attacks) stands at distance 2 from a `CHALLENGED` enemy with remaining movement and `Pommel Strike`
- **THEN** the AI scores advancing to distance 1 positively so it can execute `Pommel Strike` on its next action or turn

#### Scenario: Pommel Strike prioritizes Challenged target
- **WHEN** an AI Knight evaluates `Pommel Strike` against an enemy afflicted with `CHALLENGED`
- **THEN** `scoreDebuffAndUtility` awards a combo synergy bonus for exploiting the `CHALLENGED` condition

### Requirement: Long-Range Approach Without Immediate Line of Sight
When evaluating movement for `SNIPER` and ranged `SUPPORT` units located beyond `preferredStandoffRange + 1` of hostile units, the AI SHALL award positive approach score for hexes that reduce standoff deviation even when intervening terrain blocks immediate single-step Line of Sight, while continuing to award higher priority to destination hexes that also establish direct Line of Sight.

#### Scenario: Sniper behind elevation ridge advances toward battlefield
- **WHEN** an AI `SNIPER` unit spawns more than `preferredStandoffRange + 1` hexes away from hostiles with a central ridge obstructing immediate Line of Sight
- **THEN** the AI scores reachable hexes that close distance toward `preferredStandoffRange` above the AP conservation threshold rather than skipping turns

### Requirement: Team Follow-Up Verification for Short-Duration Setup Debuffs and Anti-Isolation
For non-damaging abilities applying 1-turn negative stat debuffs or `FORCE_FACING_AWAY` (`Flash Powder`), the AI SHALL require either sufficient remaining actor AP to follow up with an attack or at least one other living allied unit within effective engagement reach (`allyMove + allyMaxAttackRange`) of the target before awarding setup utility (except when forcing an enemy already adjacent to an ally to face away defensively). Furthermore, the AI SHALL NOT spend `TELEPORT` mobility abilities on walk-reachable flat ground when no follow-up attack is enabled, SHALL apply an isolation penalty when moving or leaping into 3 or more hostiles with no allied support within 3 hexes unless securing a finishing blow, and SHALL apply an adjacent-ally crowding penalty on long-range approach moves (`distance >= 2`) to encourage flanking dispersion.

#### Scenario: Skirmisher declines solo Turn 1 dive when allies are out of follow-up reach
- **WHEN** a fast AI Cat-burglar evaluates leaping across the arena on Turn 1 into 3 or more player units to cast `Flash Powder` while all allied teammates remain out of `move + attackRange` reach
- **THEN** short-duration setup utility is withheld and the isolation penalty suppresses the suicide dive in favor of advancing closer to teammates

#### Scenario: Advancing Brawlers fan out around congested approach lanes
- **WHEN** multiple AI melee units advance toward enemies from distance 2 or greater and candidate move hexes offer equal distance reduction
- **THEN** hexes adjacent to multiple allies incur a crowding penalty, steering trailing units toward flank paths

### Requirement: Coiled Apex Final-AP Conservation Threshold
When an AI combatant possessing a `unspentApVirtualHeight` passive (`Coiled Apex`) has exactly 1 AP remaining, currently has `virtualElevation === 0`, and has at least one living hostile unit within 4 hexes, the AI SHALL elevate its effective AP conservation threshold to `15.0` so that the unit banks 1 AP for `+1 Virtual Height` and `+20` CTB initiative unless a high-value attack or finisher clears the elevated threshold.

#### Scenario: Dragoon banks final 1 AP after triple-range approach when no high-value strike is available
- **WHEN** an AI Void Dragoon ends a move at distance 3 from an enemy with 1 AP remaining and `virtualElevation === 0`
- **THEN** a low-value additional move or poke scoring below `15.0` is rejected in favor of `CONSERVE_AP`, activating `Coiled Readiness`
