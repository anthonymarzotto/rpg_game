# Tasks

## 1. Core Combat Types & Resolver Metadata

- [x] 1.1 Add `type: 'UTILITY'` to `CombatLogMetadata` in `src/core/combat/types.ts` supporting `damageTotal`, `targetHp`, `targetMaxHp`, and `secondaryDetail`.
- [x] 1.2 Update non-attack ability resolution in `src/core/combat/resolver.ts` to tag hostile/displacement non-damaging abilities as `UTILITY`, collecting collision damage into `damageTotal`, `targetHp`, and `secondaryDetail`.
- [x] 1.3 Add unit test in `src/core/combat/displacement.test.ts` verifying executing `Gust` into an obstacle produces `UTILITY` metadata with collision damage and target vitals.

## 2. Unified Floating Combat Text

- [x] 2.1 Update `src/ui/combat/useFloatingCombatText.ts` to extract events across `ATTACK`, `BUFF`, and `SUPPORT` resolutions, dispatching floaters for `DAMAGE` (wall slam, collateral, fall), `DISPLACEMENT` (knockback, teleport), and status/conditions.
- [x] 2.2 Add unit tests in `src/ui/combat/useFloatingCombatText.test.tsx` verifying floating combat text is dispatched for non-attack resolutions (knockback, wall collision, bystander collateral, and teleportation).

## 3. Combat Log UI Presentation

- [x] 3.1 Update `src/ui/combat/CombatLogPanel.tsx` to parse `UTILITY` log entries, rendering a utility card header (`💨`/`🌀`), impact damage line when collision damage occurs, and secondary collision details.
- [x] 3.2 Add styles for `.log-utility-card` in `src/ui/combat/CombatArena.css`.
- [x] 3.3 Add unit tests in `src/ui/combat/CombatLogPanel.test.ts` verifying `UTILITY` log entries parse correctly and render impact damage and secondary details.

## 4. Verification & Integration

- [x] 4.1 Run full unit test suite via `cmd.exe /c npm test` and production build via `cmd.exe /c npm run build` to confirm zero regressions across all 69+ test files.
