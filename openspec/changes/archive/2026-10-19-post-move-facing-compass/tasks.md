# Tasks: Post-Move Facing Compass

## 1. Core Combat Resolver & Facing Engine

- [x] 1.1 Implement `executeSetFacing(state, actorUnitId, facing)` in `src/core/combat/resolver.ts` and verify with TypeScript compiler that it validates active-turn status, sets `cu.facing`, and consumes 0 AP
- [x] 1.2 Add unit tests for `executeSetFacing` in `src/core/combat/facing.test.ts` and verify tests pass for 0-AP cost, invalid-turn rejection, and combat arc updates

## 2. Simulation State Machine & Interaction Lifecycle

- [x] 2.1 Add `facingCompassCoord: HexCoord | null` state and `handleSelectFacing(direction: HexDirection)` in `src/ui/combat/useCombatSimulation.ts`, setting coordinate on move completion and dismissing on action switch or empty tile click
- [x] 2.2 Add unit tests in `src/ui/combat/useCombatSimulation.test.tsx` and verify tests pass for compass activation after movement, facing orientation dispatch, and auto-dismissal

## 3. SVG Compass Ring Presentation & Board Integration

- [x] 3.1 Implement the 6-chevron SVG compass ring component and generous hit targets in `src/ui/combat/HexGridSvg.tsx` when `facingCompassCoord` matches the active unit
- [x] 3.2 Add CSS styling and hover glow transitions in `src/ui/combat/CombatArena.css` for highlighted active chevrons and translucent slate inactive chevrons
- [x] 3.3 Wire `facingCompassCoord` and `onSelectFacing` through `src/ui/combat/CombatArena.tsx` into `HexGridSvg` and verify in `src/ui/combat/HexGridSvg.test.tsx` that chevron clicks fire facing callbacks

## 4. End-to-End Validation & Verification

- [x] 4.1 Run full project test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`) to verify clean typechecking and zero regressions
