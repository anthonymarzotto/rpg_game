# Tasks

## 1. Initiative Ribbon Spacing & Anchor Layout

- [x] 1.1 Streamline `InitiativeRibbon.tsx` header to a minimalist `[⏳]` icon anchor with tooltip and verify static markup contains no redundant "TURN QUEUE" text
- [x] 1.2 Expand track spacing (`gap: 14px`) and chip label width (`58px`) in `InitiativeRibbon.css` with centered text and verify character names fit without truncation
- [x] 1.3 Update chip styling in `InitiativeRibbon.tsx` and `InitiativeRibbon.css` for prominent `NOW` and ordinal turn order (`2`, `3`, `4`...) badges and verify with unit tests in `InitiativeRibbon.test.tsx`

## 2. Two-Way Hover Highlight & Unit Inspection

- [x] 2.1 Wire bidirectional hover state in `CombatArena.tsx` coordinating `ribbonHoveredUnitId`, `highlightedUnitId`, and `effectiveHoveredUnitCu`
- [x] 2.2 Implement `unit-hover-halo` on 3D pedestals and vector fallbacks in `HexGridSvg.tsx` and bind hover handlers to standees
- [x] 2.3 Add tests in `HexGridSvg.test.tsx` and `CombatArena.test.tsx` verifying two-way highlight halos and card inspection routing

## 3. Verification & Plan Tracking

- [x] 3.1 Run test suite (`npm test`) and production build (`npm run build`) to ensure 100% test passing and zero TypeScript compilation regressions
- [x] 3.2 Update `docs/plans/ACTIVE.md` tracking progress of items 4.1 and 4.2
