# Tasks

## 1. Core Contracts & Event Plumbing

- [x] 1.1 Move B.17 and B.18 to `In Progress` in `docs/plans/ACTIVE.md` and add `EffectShoutTargetConfig`, `EffectShoutConfig`, and `shout?: EffectShoutConfig` (with JSDoc conventions) to `AbilityEffect` in `src/core/types/ability.ts`, plus `label?: string | null` on `DISPLACEMENT` and `CTB_DELAY` in `src/core/combat/types.ts`; verify `npx tsc --noEmit` passes.
- [x] 1.2 Add a shared `resolveEffectShout(shout, role)` helper and wire `label` emission into `penetrateHandler.ts`, `positionSwapHandler.ts`, `knockbackHandler.ts`, `retreatHandler.ts`, `teleportHandler.ts`, `ctbDelayHandler.ts`, and `RUSH_CHARGE`/`AERIAL_VAULT` in `src/core/combat/resolver.ts`; verify with unit tests in `src/core/combat/displacement.test.ts`, `src/core/combat/effects/shieldBearerMechanics.test.ts`, `src/core/combat/cavalierIntegration.test.ts`, and `src/core/combat/effects/ctbDelayHandler.test.ts`.

## 2. Floating Combat Text Resolver

- [x] 2.1 Replace the `'KNOCKBACK!'` ternary fallback in `collectResolutionFloatingTexts` (`src/ui/combat/useFloatingCombatText.ts`) with an exhaustive `DISPLACEMENT_DEFAULT_SHOUT: Record<DisplacementKind, string | null>` table (`CHARGE: null`, `KNOCKBACK: 'KNOCKBACK!'`, `RETREAT: 'RETREAT!'`, `TELEPORT: 'TELEPORT!'`, `PULL: 'PULL!'`, `SWAP: 'SWAP!'`), honor `event.label` (`null` suppresses, `string` overrides), and emit optional `'utility'` floaters for labeled `CTB_DELAY` events; verify with unit tests in `src/ui/combat/useFloatingCombatText.test.tsx` covering silent `Ride-Through` (`CHARGE`), `Intercept Step` (`INTERCEPT!` on actor only), `Lance Charge` (silent rush + `KNOCKBACK!` on target), custom `TELEPORT` (`VAULT!`), and `label: null` suppression.

## 3. Ability Package Updates & Catalog Guardrails

- [x] 3.1 Configure explicit `shout` values across existing packages (`RIDE_THROUGH` -> `shout: null`, `LANCE_CHARGE` `RUSH_CHARGE` -> `shout: null`, `DRAGON_DIVE` `AERIAL_VAULT` -> `shout: null`, `INTERCEPT_STEP` `POSITION_SWAP` -> `shout: { actor: 'INTERCEPT!', target: null }`, `SHADOW_STEP` `TELEPORT` -> `shout: 'TELEPORT!'`, `ROOFTOP_VAULT` `TELEPORT` -> `shout: 'VAULT!'`, and existing `CTB_DELAY` abilities in `catBurglar.ts`, `highwayman.ts`, `knight.ts`, `witch.ts` -> `shout: null`), and add a catalog invariant test in `src/core/units/packages.test.ts` enforcing explicit `shout` declarations on all abilities using `POSITION_SWAP`, `PENETRATE_STEP`, `AERIAL_VAULT`, `RUSH_CHARGE`, `TELEPORT`, or `CTB_DELAY`; verify `cmd.exe /c npx vitest run src/core/units/packages.test.ts` passes.

## 4. Release & Final Verification

- [x] 4.1 Update `package.json` version to `0.17.2`, add an end-user-facing `0.17.2` entry in `CHANGELOG.md` (broad UI/gameplay impact only, no internal symbol or file names), and mark B.17 and B.18 complete in `docs/plans/ACTIVE.md`; verify `CHANGELOG.md` and `package.json` match `0.17.2`.
- [x] 4.2 Run the full test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`); verify zero failing tests and clean TypeScript/Vite build output.

