# Features:
  - Aging
    - Units age each skirmish.
    - Different tiers of age confer different stat mods.
    - Die of old age.

  - Tutoring
    - Existing units can "train" Novices or any lower level unit by passing on some amount of earned XP.
    - Units not available for Trials for X number of turns until training complete.

  - Nemeses
    - Enemies try to escape at some HP threshold, 1% or 5%.
      - If successful they "level up" and persist to come around in a later level.
      - Keep some sort of history on them.

# Improvements:
  - Feels a little easy.
    - Player units always go first, so immediately get tempo advantage.
    - Maybe boost threat a bit or reduce enemy threat calculation to get more/better units on the field.
    - Through 5 rounds, only lost units maybe once or twice.
    - Stage 5 felt better with myself having a level 3, 2, and 1 character against a level 3, 1, and 2 Novices.
    - The round enemies are determined prior to Ascensions.
      - e.g. Round 1 ends, back to Camp. New enemy/trial is generated but all 3 Novices have enough XP to level up.
  - Enemy Generation
    - Go through real levelling and choose appropriate resonant abilities. 
    - Allow level up through wayfarer levels.
  - Gaining XP by skill use is...a bit awkward
    - I liked the idea, but it makes things less fun. On gaining my level 2 class, I know have to actively use my 1 Novice skill that of the other Fighter/Rogue/Mage in order to progress to another class.
    - This is intentional. But its a bit sad to not just go all in on my best skills right away.
    - Is there a way to make the type of skill used still important for progression but not feel so forced?
  - Related to gaining XP, it can be difficult to remember for each unit what skills you want to use to try to get to your next desired class.
    - Maybe we can add an option to star an ability. This could be used to help a player remember which skill they want to use (or whatever else they want to use it for).

# Class Improvements
  - Thiefs get a LOT of actions it feels like, maybe double. In one encounter at Stage 3 my Infiltrator got 11 XP and my other units got maybe 4-6 XP.
    - Not necessarily bad, but worth exploring the action economy here.
  - Infiltrator, when under Smoke Veil, how do we treat them?
    - Are they still a blocking spot for movement? Does the AI consider them?
    - Needs some refinement. I think it forced an enemy unit to get stuck processing their turn when I was Smoke Veiled 3 hexes from them beside a Ruin and a 1 height hex.

# UI Refinements:
  - Trial Arena
    - Initiative bubbles should highlight the unit on the field and vice versa.
    - Initiative track needs work. Some ideas:
      - Space units out a bit by their current task; Show initiative # more prominently.
    - Enemy units need better names. Either numbered (Novice 1, Novice 2) or real names.
    - Allow selecting of facing after moving.
    - Current character card XP line should show current XP and earned in battle like: F: 7 XP (+2)
    - Need to be able to select a unit to pin its info window to be able to:
      - Hover over their current effects.
      - See their current skill loadout.
  - Unit Info dialog
    - Combat Manifest in Unit Info dialog doesn't show updated values based on equipped shards (e.g. Bloodbound Shard)
      - This might just be a text description? The skill details in combat look like they might be updated, though the description shows the default dice.
    - The Constellation
      - "Wayfarer" point feels a bit random. First Wayfarer point from R: 1, F: 1 is near the middle.
      - Change the three point labels to Force/Finesse/Focus.
    - Current XP earned should show somewhere.
    - I don't really like the title "Assumed Class".
    - Resonance Ability drop down lists required AP which is good. It also needs to include the Fighter/Mage/Rogue tag.
  - General
    - Dev mode things should only be available on localhost.

# Debug Tools:
  - Some way to export the current combat for assessment on AI decision making.

# Bugs:

| Done | Issue | Clarity | Complexity | Root Cause & Notes | Affected Files |
| :---: | :--- | :---: | :---: | :--- | :--- |
| [x] | **Critical hits trigger on total roll $\ge 20$** | High | Low | `attackRoll.ts` implements PF2e-style crit rule (`totalScore >= targetDefense + 10`). Against base defense 10, any roll $\ge 20$ crits. Design intent is to require natural 20 / natural crit threshold. | `src/core/combat/attackRoll.ts` |
| [x] | **Arcane Blast splash shouts "Collision" & missing from Log** | High | Low | Fixed via OpenSpec `splash-damage-labels-and-log`. Added `splashLabel` to `Ability` (`'BLAST'` for Arcane Blast, fallback `'SPLASH'`), explicit `label` to `DAMAGE` events (`CLEAVE`, `SURGE`, `COLLISION`), prioritized `event.label` in `useFloatingCombatText.ts`, and recorded secondary AoE splash targets into `secondaryDetail` in `combatLog`. | `src/core/types/ability.ts`, `src/data/packages/wizard.ts`, `src/core/combat/types.ts`, `src/core/combat/resolver.ts`, `src/ui/combat/useFloatingCombatText.ts` |
| [x] | **Buff/Debuff skills omit target in Combat Log** | High | Low | `resolver.ts` buff branch formats `${actor} used ${ability}` without `on ${target}` and omits target from metadata. `CombatLogPanel.tsx` BUFF card header only renders actor and ability. | `src/core/combat/resolver.ts`, `src/ui/combat/CombatLogPanel.tsx` |
| [x] | **Hit Chance preview ignores Disadvantage** | High | Medium | Fixed via OpenSpec `hit-chance-disadvantage-preview`. Centralized `evaluateAttackRollContext` in `attackRoll.ts`, declarative condition registry for `CHALLENGED`/`STEALTH`, quadratic $p^2$ formula, and `(Adv)`/`(Disadv)` UI pills. | `src/core/combat/attackRoll.ts`, `src/core/combat/targetPreview.ts`, `src/ui/combat/UnitStatusCard.tsx` |
| [ ] | **Height 2 hex Mage range extension not shown in UI** | High | Medium | Engine validation supports `range + elevationDelta`, but `useCombatSimulation.ts` generates `abilityRangeCoords` using static `effective.range`, cutting off tiles and candidate targets at distance 4–5. | `src/ui/combat/useCombatSimulation.ts` |
| [x] | **Challenged & Witch's Talisman stacking** | High | Medium | Fixed via OpenSpec `condition-lifecycle-and-stacking`. Centralized `stackingPolicy` in `CONDITION_REGISTRY` with `OVERRIDE_SOURCE` (Taunt Steal) for `CHALLENGED`, `STACK_INTENSITY` for `POISON`/`BURN` up to cap 8, and `REFRESH_DURATION` for `STEALTH`. Non-redundancy guard in `heuristics.ts` suppresses `INITIATIVE_BOOST` on allies with $\ge 80$ gauge or active speed buffs. Decoupled forced facing into explicit `FORCE_FACING` effect. | `src/core/combat/conditions.ts`, `src/core/combat/effects/conditionHandler.ts`, `src/core/ai/heuristics.ts`, `src/data/packages/knight.ts` |
| [x] | **Knight Challenging Shout repeated in one turn** | High | Medium | Fixed via OpenSpec `condition-lifecycle-and-stacking`. `heuristics.ts` zeroes utility when target is already challenged by actor. `decisionEngine.ts` zeroes auxiliary scores (focusFire, standoff) when both damage and utility are 0, keeping score below `apConservationThreshold` (4.0) so unit emits `CONSERVE_AP` and banks +20 CTB. | `src/core/ai/heuristics.ts`, `src/core/ai/decisionEngine.ts` |
| [ ] | **Gust knockback & collision damage not called out** | High | Medium | Gust has `damageType: 'NONE'` resolving as `'BUFF'`. `useFloatingCombatText.ts` gates all damage and displacement floaters behind `'ATTACK'`. `CombatLogPanel.tsx` also renders Gust as a buff card. | `src/ui/combat/useFloatingCombatText.ts`, `src/core/combat/resolver.ts`, `src/ui/combat/CombatLogPanel.tsx` |
| [ ] | **BLOCKER: AI buff lock / turn freeze** | Medium | Med–High | When an AI support unit banks AP and wins the CTB clock again, `state.activeUnitId` does not change, causing React's hostile turn `useEffect` to stall. Unhandled validation errors also freeze turns. | `src/ui/combat/useCombatSimulation.ts`, `src/ui/combat/asyncTurnSequencer.ts` |
| [x] | **Combat Log card formatting on specific abilities / Misses** | High | Fixed | Fixed in v0.4.0 (`d8c1413`). Structured `CombatLogMetadata` replaced string parsing. Power Strike, Throw Dart, Strike, and Brace on Miss now format correctly as cards. | `src/core/combat/resolver.ts`, `src/ui/combat/CombatLogPanel.tsx` |

