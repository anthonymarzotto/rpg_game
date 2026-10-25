# Proposal

## Why

Combat telemetry and benchmark duels reveal that the Knight suffers from an identity crisis and a steep damage deficit. In 2v2 support synergy benchmarks, the Knight averages only 3.6 net damage (compared to the Warrior's 13.5), causing teams to lose the damage race unless paired with extreme hypercarries. Furthermore, `Lead the Charge` costs 2 of 3 AP for purely positional buffs (`+2 Move`, `+2 Speed`), while `Challenging Shout` inflicts a `CHALLENGED` condition whose Disadvantage is routinely ignored by enemy AI when targeting squishy backliners (Wizard ally survival plummets from 27.8% to 11.1%).

This change establishes the Knight firmly as a **Commander** (offensive tempo and focus-fire enabler) rather than a defensive bastion. By equipping `Lead the Charge` with team-wide attack bonuses, penalizing enemies who defy challenges with the `EXPOSED` condition (granting Advantage to the next incoming attack), and rewarding the Knight with `+1d4` bonus damage when striking challenged foes, the kit becomes a cohesive, lethal tactical loop.

## What Changes

- **Lead the Charge 2 AP Signature Tuning**: Retain the 2 AP cost while adding a `+2 Attack` roll modifier buff to the Knight and all allies within 3 hexes for 2 turns (stacking with `+2 Move` and `+2 Speed`).
- **Defiance Penalty & EXPOSED Condition**: Introduce the `EXPOSED` status condition. When an enemy afflicted with `CHALLENGED` attacks any unit other than its designated challenger, `EXPOSED` is applied to that enemy.
- **EXPOSED Mechanics**: The next attack roll targeting an `EXPOSED` unit gains Advantage. `EXPOSED` is consumed when the unit is attacked (regardless of whether the attack hits or misses).
- **Pommel Strike Bonus vs. Challenged**: Add a `+1d4` physical bonus damage profile to `Pommel Strike` when targeting an enemy afflicted with `CHALLENGED`, bringing its damage to `2d4 + Force` against marked targets.
- **Composable Ability Condition Extension**: Extend `AbilityCondition` to support `'TARGET_CHALLENGED'` alongside `'FLANK_OR_REAR'`, evaluating conditional bonus damage across the damage resolution and target preview pipelines.
- **Class Catalog Identity Realignment**: Update the Knight's description in the class catalog to reflect the Commander role (battlefield leadership, offensive tempo, and vulnerable target isolation) rather than defensive bastion/ward mechanics (reserved for the future Shield-bearer).

## Capabilities

### New Capabilities
*(None; builds on existing capability specifications.)*

### Modified Capabilities
- `tier-2-classes`: Update the Knight Class Package requirement and scenarios to include `+2 Attack` on `Lead the Charge`, `EXPOSED` retaliation on `Challenging Shout` defiance, and `+1d4` bonus damage against challenged targets on `Pommel Strike`.
- `combat-conditions`: Add `EXPOSED` condition definition, update `CHALLENGED` condition behavior to trigger `EXPOSED` when the bearer attacks a non-challenger, and specify attack-consumed Advantage behavior.
- `composable-abilities`: Extend `AbilityCondition` to include `TARGET_CHALLENGED` for conditional bonus damage evaluation.

## Impact

- `src/core/types/ability.ts`: Add `'EXPOSED'` to `ConditionType` and `'TARGET_CHALLENGED'` to `AbilityCondition`.
- `src/core/combat/conditions.ts`: Register `EXPOSED` in `CONDITION_REGISTRY` with `onIncomingAttackRoll` returning Advantage. Extend `onAfterAction` hook or result type so `CHALLENGED` can trigger `EXPOSED` when attacking a non-challenger.
- `src/core/combat/resolver.ts`: Consume `EXPOSED` upon an incoming attack action against the bearer; process `onAfterAction` condition application.
- `src/core/combat/effects/damageHandler.ts` & `src/core/combat/targetPreview.ts`: Support `TARGET_CHALLENGED` condition for evaluating bonus damage.
- `src/data/packages/knight.ts`: Update `LEAD_THE_CHARGE` stat modifiers (`attackRoll: 2`), `POMMEL_STRIKE` effects (`bonusDamage`), and descriptions.
- `src/data/classes.ts`: Reframe the Knight catalog description.
- `src/ui/combat/UnitStatusCard.tsx` & `HexGridSvg.tsx`: Support rendering for the `EXPOSED` condition badge and icon.
- `src/core/ai/heuristics.ts`: AI target evaluation naturally respects Advantage against `EXPOSED` targets; adjust AI scoring so enemies account for `EXPOSED` penalty when considering defying `CHALLENGED`.
