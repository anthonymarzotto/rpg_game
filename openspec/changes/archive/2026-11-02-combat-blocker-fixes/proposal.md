# Proposal: Combat Blocker Bug Fixes (B.11, B.12, B.13)

## Why

During playtesting, three blocking issues were identified in the tactical combat resolution and UI feedback loops:
1. **B.11**: Units executing retreat-step abilities like Skirmish off elevated ledges ($dh \le -2$) bypass all fall damage rules, violating physical spatial hazards.
2. **B.12**: Hostile single-target utility abilities dealing no direct damage (such as Challenging Shout) can erroneously target friendly allies because validator logic only checked for opposing factions on damaging abilities.
3. **B.13**: Attack rolls display only an aggregated net modifier (e.g. `17 + 0 = 17`), which obscures the $-2$ low-ground elevation penalty documented in the combat card badge, causing confusion over whether vertical modifiers were applied or ignored.

Additionally, introducing strict climb and obstacle barriers to retreat steps necessitates updating the Cat Burglar's `Feline Grace` passive trait with `canVaultOnRetreat: true`, ensuring acrobatic skirmishers can vault up cliffs and leap over obstacles during retreat displacement just as they do during knockback.

Resolving these blockers ensures physical displacement consistency, preserves class-specific mobility synergies, prevents friendly fire mis-targeting on debuffs/taunts, and provides immediate in-engine transparency for attack roll calculations via rich hover tooltips.

## Versioning Assessment

- **Target Version**: `0.9.2` (Patch release)
- **Rationale**: This change delivers backward-compatible bug fixes for combat ability validation, retreat displacement hazards, and tactical UI roll feedback without introducing breaking changes to public APIs, save formats, or game loop mechanics.

## What Changes

- **Skirmish / Retreat Fall Damage & Vaulting (B.11)**:
  - Update `retreatHandler` to calculate elevation deltas between origin and retreat destination tiles.
  - Abort retreat movement if attempting to scale an impassable vertical cliff ($dh > \text{DISPLACEMENT\_CONFIG.maxClimbElevation}$) or step into an obstacle, unless the unit has `canVaultOnRetreat`.
  - Inflict direct fall impact damage via `calculateRawFallDamage` and `resolveFallDamage` when plunging down ledges ($dh \le -2$), emitting a `DAMAGE` event with `reason: 'FALL'`, updating `fallDamage` return payloads, and annotating combat logs.
  - Enhance Cat Burglar `FELINE_GRACE` with `canVaultOnRetreat: true`, allowing units with this passive to vault up high cliffs or leap over 1-hex obstacles during retreat displacement.
- **Single-Target Ability Faction Validation (B.12)**:
  - Remove the `damageType !== 'NONE'` exemption in `canExecuteAbility` for `targetType: 'SINGLE_TARGET'` abilities. All single-target abilities will strictly require opposing factions, ensuring hostile utilities and taunts (like Challenging Shout) cannot target allies. Friendly single-target abilities remain governed by `targetType: 'ALLY'`.
- **Attack Roll Modifier Breakdown & Tooltip (B.13)**:
  - Expand attack roll resolution and `DiceRollBreakdown` to expose structured component attribution (base attribute, elevation bonus/penalty, aura penalties, active condition modifiers).
  - Implement a rich glassmorphic in-engine hover tooltip on the combat log attack roll chip and the Dice Tumbler Tray modifier equation displaying the full formula breakdown (e.g., `17 (d20) + 2 (Finesse) - 2 (Low Ground) = 17 vs DC 12`).

## Capabilities

### Modified Capabilities

- `composable-abilities`: Enforce opposing-faction validation for all `SINGLE_TARGET` abilities regardless of damage type, and ensure `RETREAT_STEP` displacement resolves vertical elevation deltas, fall damage, and vaulting mechanics.
- `tier-3-cat-burglar`: Extend `Feline Grace` passive trait with `canVaultOnRetreat: true`, enabling vaulting up cliffs and over 1-hex obstacles during retreat displacement.
- `elevation-combat-modifiers`: Expose structured modifier attribution in attack roll evaluation and breakdowns so vertical modifiers are explicitly verifiable.
- `arena-timeline-ux`: Render a styled in-engine hover tooltip for attack roll chips in the Combat Log card and Dice Tumbler Tray detailing the component breakdown of attack roll modifiers.

## Impact

- **Core Combat**: `src/core/combat/effects/retreatHandler.ts`, `src/core/combat/validator.ts`, `src/core/combat/attackRoll.ts`, `src/core/combat/resolver.ts`, `src/core/combat/types.ts`, `src/core/types/passive.ts`, `src/data/packages/catBurglar.ts`.
- **UI Components**: `src/ui/combat/CombatLogPanel.tsx`, `src/ui/combat/DiceTumblerTray.tsx`, `src/ui/combat/CombatArena.css`.
- **Tests**: Core combat test suites (`displacement.test.ts`, `elevationCombat.test.ts`, `conditions.test.ts`, `catBurglarIntegration.test.ts`), validator tests, and UI tests (`CombatLogPanel.test.ts`, `DiceTumblerTray.test.tsx`).
