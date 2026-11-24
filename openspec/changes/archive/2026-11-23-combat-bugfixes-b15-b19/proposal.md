# Proposal

## Why

Four playtest-reported combat and visual bugs degrade clarity and accuracy during trials:
1. **B.15**: Source-bound conditions (`CHALLENGED`, `CHARMED`, `HENOSIS`) remain active after their originating caster/challenger is defeated, leaving targets penalized against a dead challenger, stuck fighting for a dead charmer, or bound to a dead Theurge.
2. **B.17**: Long prose descriptions inside Combat Log effect tooltips (specifically `Graze Mitigation` / `GRAZE_NEGATED`) overflow horizontally outside the 280px tooltip container because `.attack-roll-tooltip` enforces `white-space: nowrap`.
3. **B.18**: Dragoon's `Coiled Apex` (`+1 Virtual Height` on turn end with unspent AP) has zero UI visibility—making it look inactive when skipping a turn—while also suffering from two engine defects: `virtualElevation` is double-counted in attack roll evaluation (`+1` becomes `+2` / Advantage instead of `+2` hit bonus) and is wiped back to `0` if the Dragoon later ends a non-attacking turn with `0` AP instead of persisting until the next attack roll.
4. **B.19**: Theurge's pixel sprite directory (`public/assets/tokens/pixel/79_human_male/idle`) is lowercase while every other token set and `tokenAssets.ts` use capitalized `Idle`, causing 404s and invisible tokens in Vite dev and case-sensitive deployments.

**Version Bump Assessment (SemVer)**: Patch bump from `0.23.0` to `0.23.1`. All four items are bug fixes and missing UI state indicators for existing mechanics with no breaking API changes or new class content.

## What Changes

- **Source-Defeated Condition Cleanup (B.15)**:
  - Add a declarative `clearWhenSourceDefeated?: boolean` property to `ConditionDefinition` and enable it for `CHALLENGED`, `CHARMED`, and `HENOSIS`.
  - Invoke a centralized source-defeat cleanup helper at all four core defeat sites (damage resolution, self-sacrifice HP cost, turn-start DoT lethal tick, and delayed bombardment lethal detonation) to purge matching active conditions from living units, invoke any `onRemoved` hook (e.g., restoring a `CHARMED` unit's original faction), and avoid triggering natural-expiration follow-ups like `MORTAL_EBB`.
  - Emit a `CONDITION_BROKEN` combat log entry (`reason: 'source_defeated'`) for each cleared condition and update `CombatLogPanel` to render accurate cleared badges (`⚔️ CHALLENGED CLEARED`, `💘 CHARMED CLEARED`, `✨ HENOSIS CLEARED`) distinct from `⚔️ CHALLENGE DEFIED`.
  - Re-run balance playtest benchmarks after implementation to verify no unintended balance regressions.
- **Combat Log Effect Tooltip Wrapping (B.17)**:
  - Override `white-space: nowrap` inside `.effect-badge-tooltip` so long effect descriptions and tooltip summary lines wrap cleanly within the 280px tooltip container without overflowing.
  - Render `CONTEXT` prose details (such as `Graze Mitigation`) cleanly inside the tooltip without cramming full sentences into a narrow right-aligned monospace value column.
- **Coiled Apex Math Fix, Persistence & UI Visibility (B.18)**:
  - Eliminate `virtualElevation` double-counting between `resolver.ts` / `targetPreview.ts` and `attackRoll.ts` so `+1 Virtual Height` evaluates as `+2` to hit (not `+2` elevation / Advantage).
  - Preserve armed `virtualElevation` across turns until consumed by the Dragoon's next attack roll (only arming/raising on turn end with unspent AP rather than overwriting back to `0` on a `0`-AP non-attacking turn).
  - Surface armed `Coiled Apex` (`virtualElevation > 0`) in the combat UI: custom icon + `ready-glow` + `(+1 Height)` counter on the `UnitStatusCard` passive chip (active & inspected cards), a dedicated buff pill with hover tooltip in `active-modifiers-row`, an overhead token status icon on `HexGridSvg`, a Target Preview indicator badge, and turn-end floating combat text when armed.
- **Theurge Pixel Token Asset Path Fix (B.19)**:
  - Rename `public/assets/tokens/pixel/79_human_male/idle` to `Idle` via a case-safe two-step Git move (and align `folder` in `metadata.json`).
  - Add a case-sensitive disk verification test in `tokenAssets.test.ts` validating that every entry in `AVAILABLE_PIXEL_TOKENS` has exact-case `Idle/rotations/<direction>.png` assets on disk.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `combat-conditions`: Add declarative `clearWhenSourceDefeated` lifecycle cleanup for `CHALLENGED`, `CHARMED`, and `HENOSIS` across all core defeat paths, with corresponding `CONDITION_BROKEN` log cards.
- `tier-4-dragoon`: Clarify single-counted `virtualElevation` evaluation, persistence across non-attacking turns until consumed by an attack roll, and active UI visibility for `Coiled Apex`.
- `arena-timeline-ux`: Require wrapped layout containment inside Combat Log effect badge tooltips (`EffectBadgeTooltip`), distinct `source_defeated` rendering on `CONDITION_BROKEN` cards, and visual indicators for armed `Coiled Apex` virtual height across `UnitStatusCard`, `HexGridSvg`, Target Preview, and turn-end floating text.
- `token-assets`: Require exact-case `Idle/rotations/<direction>.png` directory parity on disk for all whitelisted pixel token identifiers, including Tier-4 Theurge (`79_human_male`).

## Impact

- **Core Combat Engine**: `src/core/combat/conditions.ts`, `src/core/combat/resolver.ts`, `src/core/combat/turnClock.ts`, `src/core/combat/battlefieldZones.ts`, `src/core/combat/attackRoll.ts`, `src/core/combat/targetPreview.ts`.
- **Combat UI & Styling**: `src/ui/combat/CombatArena.css`, `src/ui/combat/CombatLogPanel.tsx`, `src/ui/combat/UnitStatusCard.tsx`, `src/ui/combat/conditionBadges.ts`, `src/ui/combat/HexGridSvg.tsx`, `src/ui/combat/useCombatSimulation.ts`.
- **Assets & Tests**: `public/assets/tokens/pixel/79_human_male/idle` -> `Idle`, unit/integration/UI regression tests across combat, token assets, and balance benchmark suites.
- **Release Metadata**: `package.json` (`0.23.0` -> `0.23.1`), `CHANGELOG.md`, `docs/plans/ACTIVE.md`.
