# Tasks

## 1. Types & Ability Contracts

- [x] 1.1 Add `splashLabel?: string` to `Ability` in `src/core/types/ability.ts` and configure `splashLabel: 'BLAST'` on `ARCANE_BLAST` in `src/data/packages/wizard.ts`.
- [x] 1.2 Add `'SPLASH'` to `CombatDamageReason` and optional `label?: string` to `DAMAGE` events in `src/core/combat/types.ts`.

## 2. Event Emission & Combat Log Attribution

- [x] 2.1 Update secondary AoE splash resolution in `src/core/combat/resolver.ts` to emit `reason: 'SPLASH'` with `label: effectiveAbility.splashLabel ?? 'SPLASH'`, and collect secondary splash targets into `secondaryDetail` in `state.combatLog`.
- [x] 2.2 Update secondary effect handlers: emit `label: 'CLEAVE'` in `src/core/combat/effects/cleaveHandler.ts`, `label: 'SURGE'` in `src/core/combat/effects/wildSurgeHandler.ts`, and `label: 'COLLISION'` in `src/core/combat/effects/knockbackHandler.ts`.

## 3. UI Floating Combat Text

- [x] 3.1 Update `src/ui/combat/useFloatingCombatText.ts` to prioritize `event.label`, rendering `${event.label}! -X` for secondary damage events.

## 4. Verification & Testing

- [x] 4.1 Update and add unit tests in `src/core/combat/resolution.test.ts` and `src/core/combat/abilities12.test.ts` asserting `reason: 'SPLASH'`, `label: 'BLAST'`, and combat log `secondaryDetail` for AoE splash damage and secondary effect handlers.
- [x] 4.2 Run full unit test suite via `cmd.exe /c npm test` and production build via `cmd.exe /c npm run build` to confirm zero regressions.
