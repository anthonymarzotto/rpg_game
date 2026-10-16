# Proposal

## Why

Secondary splash damage from abilities like `Arcane Blast` currently reuses the generic `COLLATERAL` damage reason in the combat event pipeline. Because the floating combat text system hardcodes `COLLATERAL` to display a `"COLLISION!"` prefix (originally intended only for bystander unit knockback impacts), AoE magic blasts and melee cleaves erroneously shout out collision warnings on secondary victims. Furthermore, secondary targets struck by AoE splash damage are completely omitted from the combat history log.

This change decouples secondary damage presentation labels from damage mechanics, allowing abilities to declare their own splash labels (e.g., `BLAST!` for Arcane Blast) while ensuring secondary splash damage is properly attributed and detailed in the combat log.

## What Changes

- **Ability Contract Extension**: Add optional `splashLabel?: string` to `Ability` allowing abilities to define custom floating text and log labels for AoE splash damage (e.g. `'BLAST'` for `ARCANE_BLAST`), defaulting to `'SPLASH'` for abilities with `aoeRadius > 0`.
- **Combat Event Presentation Label**: Add optional `label?: string` to `DAMAGE` events in `CombatEvent`, allowing effect handlers and resolution loops to explicitly control the floating text shoutout.
- **Damage Reason Taxonomy**: Add `'SPLASH'` to `CombatDamageReason` to semantically distinguish blast splash damage from physical bystander collision collateral.
- **Subsystem Label Attribution**:
  - `resolver.ts` sets `reason: 'SPLASH'` and `label: effectiveAbility.splashLabel ?? 'SPLASH'` on secondary AoE damage events.
  - `cleaveHandler.ts` emits `label: 'CLEAVE'` on frontal sweep hits.
  - `wildSurgeHandler.ts` emits `label: 'SURGE'` on arcane discharge hits.
  - `knockbackHandler.ts` emits `label: 'COLLISION'` on bystander unit collisions.
- **Floating Combat Text Update**: Update `useFloatingCombatText.ts` to prioritize `event.label`, formatting as `${event.label}! -X`.
- **Combat Log Integration**: Update `resolver.ts` AoE splash loop to collect secondary target hits, damage amounts, and remaining HP, appending a secondary detail block (e.g. `💥 [Blast hit Goblin 2 for 2 magic damage (HP: 8/10)]`) to the combat log entry.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `composable-abilities`: Extend ability definition and effect execution requirements to support declarative splash labels, distinct splash damage events, and combat log secondary splash attribution.

## Impact

- **Core Combat Types**: `Ability` in `src/core/types/ability.ts`, `CombatEvent` and `CombatDamageReason` in `src/core/combat/types.ts`.
- **Combat Execution**: `src/core/combat/resolver.ts`, `src/core/combat/effects/cleaveHandler.ts`, `src/core/combat/effects/wildSurgeHandler.ts`, `src/core/combat/effects/knockbackHandler.ts`.
- **UI / Presentation**: `src/ui/combat/useFloatingCombatText.ts`, `src/data/packages/wizard.ts`.
- **Testing**: Unit tests in `src/core/combat/resolution.test.ts`, `src/core/combat/abilities12.test.ts`, and floating text tests.
