# Proposal

## Why

During tactical combat encounters, player decisions directly influence unit progression because skills award archetype-specific XP on use (Fighter skills grant Force XP, Rogue skills grant Finesse XP, Mage skills grant Focus XP). When a battle concludes, accumulated XP reaching the level threshold allows the hero to ascend in Camp, increasing that stat by +1 and unlocking constellation nodes.

Currently, the in-combat status overlay only displays an isolated, ambiguous tally (`F: 0 XP  R: 0 XP  M: 0 XP`) which lacks essential context:
- It ignores baseline accumulated XP carried into the battle.
- It hides the XP threshold required to reach the next level.
- It uses obscure single-letter abbreviations rather than established attribute names (Force, Finesse, Focus).
- It provides no feedback when a unit crosses the ascension threshold mid-battle.

Players cannot currently tell whether a hero needs one more action in a specific stat before the trial ends, creating cognitive friction and disrupting build planning.

## What Changes

- Replace the legacy `.hud-xp-tally` on the active unit's `UnitStatusCard` with a compact, high-contrast inline XP progression tracker.
- Display attribute names aligned with camp and character sheets: **Force**, **Finesse**, and **Focus**.
- Format values as projected totals (base entering combat + battle delta) with an inline battle gain badge when XP has been gained (e.g. `Force: 7 (+2)`), omitting `(+0)` when no battle XP has been earned to minimize visual clutter.
- Display the next level XP threshold in the header (e.g. `XP PROGRESS • Next Level: 10 XP`), or indicate `(MAX)` when at level cap (Level 9).
- Highlight stats that meet or exceed the ascension threshold with an astral gold glow and a `✦` ready indicator.
- Extend the inspected unit card to render this XP progression tracker when hovering allied units on the hex grid or CTB timeline ribbon (while keeping it hidden for hostile units).

## Capabilities

### Modified Capabilities
- `arena-timeline-ux`: Extend the combat status overlay specifications to require in-combat character card XP gain tracking on both active and inspected allied combatants.

## Impact

- **UI Components**: `src/ui/combat/UnitStatusCard.tsx`
- **Helpers / Utilities**: `src/ui/combat/unitStatusUtils.ts` or progression helpers for computing XP summaries
- **Styles**: `src/ui/combat/CombatArena.css` for compact badge layouts and ready glows
- **Tests**: `src/ui/combat/UnitStatusCard.test.tsx`
- **APIs / Data**: Read-only consumption of existing `CombatUnit.unit.progression.accumulatedXp`, `CombatUnit.inBattleXp`, and `LEVEL_XP_THRESHOLDS`. No database or state shape migrations required.
