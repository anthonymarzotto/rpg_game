# Proposal

## Why

Non-damaging abilities with kinetic effects or hostile intent (such as `Gust`, `Shadow Step`, `Challenging Shout`, and `Flash Powder`) currently suffer from silent feedback and confusing combat log presentation (Bug 8 in `docs/plans/LONGTERM.md`). 

Specifically:
1. `useFloatingCombatText.ts` gates all `DAMAGE` and `DISPLACEMENT` events behind `resolution.type === 'ATTACK'`. When non-damaging abilities push targets into walls or bystanders, or teleport across hexes, zero floating text is displayed (no `KNOCKBACK!`, no `SLAM! -X`, no `COLLISION! -X`).
2. `resolver.ts` classifies all abilities with `damageType === 'NONE'` as `BUFF` entries, causing `CombatLogPanel.tsx` to render hostile displacement and taunts with defensive shield icons (`🛡️`) and sparkles (`✨`) while omitting impact damage rows, remaining target HP, and secondary collision details.

## What Changes

- **Unified Floating Combat Text Dispatching**: Update `useFloatingCombatText.ts` so that `DAMAGE`, `DISPLACEMENT`, and `STATUS`/`CONDITION` events are dispatched for all resolution variants (`ATTACK`, `BUFF`, `SUPPORT`).
- **Dedicated UTILITY Combat Log Classification**: Add `{ type: 'UTILITY', ... }` to `CombatLogMetadata` in `src/core/combat/types.ts`. Update `resolver.ts` to tag non-damaging abilities targeting enemies or inflicting hostile effects/displacement as `UTILITY` rather than `BUFF`.
- **Kinetic Damage & Target HP Tracking**: When non-damaging abilities inflict wall slam, bystander collision, or fall damage, populate `damageTotal`, `targetHp`, `targetMaxHp`, and `secondaryDetail` in the `UTILITY` combat log metadata.
- **Combat Log Utility Card Presentation**: Update `CombatLogPanel.tsx` and `CombatArena.css` to render `UTILITY` cards with a dedicated utility/kinetic glyph (`💨` for wind/Gust, `🌀` for general utility), an impact damage line when collateral damage occurs, and secondary knockback details.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `composable-abilities`: Add requirement for non-damaging utility resolution, unified floating text event dispatching across resolutions, and kinetic damage attribution in combat logs.

## Impact

- **Affected Files**:
  - `src/core/combat/types.ts`: Extend `CombatLogMetadata` with `type: 'UTILITY'`.
  - `src/core/combat/resolver.ts`: Route hostile/displacement non-attack abilities to `UTILITY` metadata and compute collateral damage totals.
  - `src/ui/combat/useFloatingCombatText.ts`: Dispatch combat events across `ATTACK`, `BUFF`, and `SUPPORT` resolutions.
  - `src/ui/combat/CombatLogPanel.tsx` & `src/ui/combat/CombatArena.css`: Parse and render `UTILITY` log cards with impact and secondary lines.
  - Unit tests: Add and update unit tests for `resolver.ts`, `useFloatingCombatText.ts`, and `CombatLogPanel.tsx`.
- **Breaking Changes**: None. Backwards-compatible addition to the `CombatLogMetadata` tagged union.
