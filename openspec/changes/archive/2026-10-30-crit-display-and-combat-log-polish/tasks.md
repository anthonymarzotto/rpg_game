# Tasks

## 1. Core Combat Engine Presentation

- [x] 1.1 Update `src/core/combat/damageEngine.ts` to format critical hit damage breakdowns with explicit labels (`[Crit: X max + Y roll] + mod - armor -> damage`) and verify with `resolution.test.ts`
- [x] 1.2 Update `src/core/combat/resolver.ts` to format d20 modifiers with spaced operators (`16 + 1`, `20 - 2`) and reorder attack logging prior to condition defiance, verifying with `resolution.test.ts`

## 2. Combat Log UI & Card Presentation

- [x] 2.1 Update `src/ui/combat/CombatLogPanel.tsx` with `formatD20Roll` to normalize attack roll chips with spaced operators (UX.10) and verify with `CombatLogPanel.test.ts`
- [x] 2.2 Update `src/ui/combat/CombatLogPanel.tsx` to render challenge defiance events as dedicated `CONDITION_BROKEN` cards with `⚔️ CHALLENGE DEFIED` badge (UX.8) and verify with `CombatLogPanel.test.ts`

## 3. Verification & Versioning

- [x] 3.1 Update version in `package.json` and `CHANGELOG.md` to `0.9.1`
- [x] 3.2 Run `npm run build` and `npm test` to verify complete build and test suite pass
