# Tasks: Combat Polish and Bug Fixes

## 1. Tactical Facing Compass Overlay Layer

- [x] 1.1 In `HexGridSvg.tsx`, hoist `compassRing` into a dedicated overlay layer rendered after all unit tokens and verify with `npm test HexGridSvg.test.tsx` that facing chevrons render and update unit facing without standee clipping.

## 2. Floating Combat Text & Kinetic Feedback

- [x] 2.1 In `useFloatingCombatText.ts`, branch on `event.kind === 'RETREAT'` to return `'RETREAT!'` and verify with `npm test useFloatingCombatText.test.tsx` that Skirmish displacements render `RETREAT!`.

## 3. AI Self-Buff Scope Enforcement

- [x] 3.1 In `decisionEngine.ts`, isolate `ability.targetType === 'SELF'` in immediate and composite move evaluations to only score for the acting unit and verify with `npm test decisionEngine.test.ts` that Infiltrator AI never generates teammate targets for Smoke Veil.

## 4. Ground-Targeted AoE Detonation Cleanup

- [x] 4.1 In `resolver.ts`, eliminate ground attack roll logging and `0 (Ground)` damage reporting when targeting an unoccupied hex and verify with `npm test resolution.test.ts` that empty hex AoE casts deal splash damage to surrounding targets without reporting damage or attacks against the ground.

## 5. Rich Combat Log Cards for Conditions

- [x] 5.1 In `CombatLogPanel.tsx` and `CombatLogPanel.css`, add `CONDITION_BROKEN` card parsing for `actionId: 'condition_removed'` and verify with `npm test CombatLogPanel.test.ts` that stealth loss from damage displays a styled `👤 STEALTH BROKEN` card.
- [x] 5.2 In `CombatLogPanel.tsx` and `CombatLogPanel.css`, add `DOT_DAMAGE` card parsing for `actionId: 'burn' | 'poison'` and verify with `npm test CombatLogPanel.test.ts` that turn-start damage displays styled `🔥 BURN TICK` and `🧪 POISON TICK` cards.

## 6. Combat Manifest Archetype Badges

- [x] 6.1 In `HeroProgressionDrawer.tsx`, add colored archetype discipline badges (`FORCE`, `FINESSE`, `FOCUS`) to class core abilities and verify with `npm test HeroProgressionDrawer.test.tsx` that core abilities render matching badges alongside resonant wildcards.

## 7. Version Bump, Changelog & Production Build

- [x] 7.1 Bump version to `0.7.1` in `package.json` and document the bug fixes and UI polish under `[0.7.1] - 2026-10-27` in `CHANGELOG.md`.
- [x] 7.2 Run `npm run build` to verify TypeScript compilation and production bundle build succeed with zero errors.
