# Design

## Context

See `proposal.md` for motivation and scope across bugs **B.15**, **B.17**, **B.18**, and **B.19**.

Key architectural realities in the current codebase:
- `CONDITION_REGISTRY` in `src/core/combat/conditions.ts` already uses a declarative metadata contract (`tickTiming`, `statModifiers`, `purgeableByCleanse`, `maxActivePerSource`, `blockedByTargetConditions`, `onExpireApplyCondition`, `onRemoved`).
- Unit defeat (`isDefeated = true` + `state.arena.removeUnit(...)`) is currently performed independently at four core combat sites (`resolver.ts:626`, `resolver.ts:713`, `turnClock.ts:168`, and `battlefieldZones.ts:208`).
- `EffectBadgeTooltip` reuses the `.attack-roll-tooltip` CSS class in `CombatArena.css`, which enforces `max-width: 280px` and `white-space: nowrap`.
- `virtualElevation` is tracked as an optional number on `CombatUnit` (`src/core/combat/types.ts`), mutated in `turnClock.ts` and `resolver.ts`, and read in `attackRoll.ts`, `resolver.ts`, and `targetPreview.ts`—but is not read anywhere in `src/ui/`.
- Every pixel token folder under `public/assets/tokens/pixel/` uses `Idle/rotations/*.png` except `79_human_male`, which has lowercase `idle/`.

## Goals / Non-Goals

**Goals:**
- Provide a single declarative mechanism (`clearWhenSourceDefeated`) for purging source-bound conditions upon caster/challenger defeat across all core defeat paths, firing `onRemoved` cleanup hooks and emitting accurate `CONDITION_BROKEN` combat log cards.
- Prevent horizontal text overflow in `EffectBadgeTooltip` across all effect outcome pills (especially `GRAZE_NEGATED` / `CONTEXT` pills and condition summaries).
- Fix `virtualElevation` double-counting and premature turn-end clearing, and surface armed `Coiled Apex` across all standard combat HUD/arena feedback surfaces.
- Restore case-exact `Idle/` asset resolution for Theurge (`79_human_male`) and guard against future casing regressions via automated test coverage.

**Non-Goals:**
- Redesigning `AttackRollTooltip` or `DamageRollTooltip` compact numeric rows (only `.effect-badge-tooltip` wrapping and `CONTEXT` prose presentation change).
- Rebalancing Philanderer, Theurge, Cavalier, Knight, or Dragoon numbers (balance benchmarks will be re-run to confirm stability, not retuned unless a regression is found).
- Migrating `virtualElevation` into `activeConditions` (keeping `virtualElevation` on `CombatUnit` avoids touching AI, save/test fixtures, and condition-ticking semantics).

## Decisions

### 1. Declarative `clearWhenSourceDefeated` & Shared Defeat Cleanup Helper (B.15)
- **Decision**: Add `clearWhenSourceDefeated?: boolean` to `ConditionDefinition` in `src/core/combat/conditions.ts` (enabled on `CHALLENGED`, `CHARMED`, and `HENOSIS`) and export `purgeConditionsFromDefeatedSource(state: CombatState, defeatedUnitId: string): void`.
- **Execution semantics**:
  - Iterate all living units in `state.units`.
  - Remove any `ActiveCondition` whose `sourceUnitId === defeatedUnitId` and whose registry definition sets `clearWhenSourceDefeated: true`.
  - Invoke `def.onRemoved?.(cond, targetCu, state)` so `CHARMED` automatically restores the unit's `originalFaction` via `restoreOriginalFactionIfUncharmed`.
  - Do **not** invoke `onExpireApplyCondition` (so severing `HENOSIS` upon the Theurge's death does not inflict `MORTAL_EBB`, which is strictly a natural expiration consequence).
  - Emit a `combatLogger.logConditionBroken(...)` entry with `reason: 'source_defeated'` and a descriptive message naming the defeated source unit (e.g., `"Garrick was defeated — CHALLENGED cleared!"`).
- **Call sites**: Invoke `purgeConditionsFromDefeatedSource(state, unitId)` at all four core defeat sites (`resolver.ts` `applyEventsToState`, `resolver.ts` `executeAbility` `hpCost` self-defeat, `turnClock.ts` DoT defeat, and `battlefieldZones.ts` delayed bombardment defeat).
- **CombatLogPanel rendering**: Branch `CONDITION_BROKEN` rendering in `CombatLogPanel.tsx` on `entry.reason === 'source_defeated'` so `CHALLENGED` renders `⚔️ CHALLENGED CLEARED` (instead of `⚔️ CHALLENGE DEFIED`), `CHARMED` renders `💘 CHARMED CLEARED`, and `HENOSIS` renders `✨ HENOSIS CLEARED`, showing `entry.rawMessage` (or a clean fallback note) in the footer.
- **Alternative considered**: Lazily ignoring conditions whose `sourceUnitId` is defeated inside `onOutgoingAttackRoll` / `onAfterAction`. Rejected because stale condition pills would linger on the HUD, `CHARMED` faction flips would never revert on charmer death, and `HENOSIS` stat buffs would persist after the Theurge died.

### 2. Wrapped Effect Tooltip Layout & Prose Placement (B.17)
- **Decision**:
  - In `src/ui/combat/CombatArena.css`, add rules scoped to `.effect-badge-tooltip`: `white-space: normal;` on the tooltip container, `gap: 0.75rem; align-items: flex-start;` on `.attack-roll-component-row`, `flex-shrink: 0;` on `.comp-label`, and `text-align: right; white-space: normal; overflow-wrap: break-word;` on `.comp-val`, plus `white-space: normal; text-align: left;` on `.attack-roll-formula-summary`.
  - In `src/ui/combat/CombatLogPanel.tsx` (`case 'CONTEXT'`), pass `outcome.detail` as `tooltipSummary` (full-width wrapped prose footer) instead of a two-column `Effect | <long sentence>` monospace row for `GRAZE_NEGATED` (or all `CONTEXT` prose details), keeping key/value rows strictly for concise structured values.
- **Alternative considered**: Increasing `max-width` on `.attack-roll-tooltip`. Rejected because `white-space: nowrap` would still overflow on longer sentences and widen compact roll tooltips unnecessarily.

### 3. Single Source of Truth for `virtualElevation` in Elevation Delta & Persistence (B.18)
- **Decision (Math fix)**:
  - Keep `virtualElevation` addition centralized inside `evaluateAttackRollContext` (`src/core/combat/attackRoll.ts`) when computing `elevationDelta` from `options.state` OR when callers pass physical tile `elevationDelta`.
  - Update callers in `src/core/combat/resolver.ts` (lines 1169-1185) and `src/core/combat/targetPreview.ts` (lines 305-315) to pass the **physical** elevation delta (`actorPhysicalElev - targetPhysicalElev`) into `resolveAttackRoll` / `evaluateAttackRollContext` (while still passing total effective `elevationDelta = physicalDelta + actorVirtual - targetVirtual` into `resolveDamage` and `calculateElevationAttackModifier` which do not add `virtualElevation` internally).
  - Verify `attackRoll.ts` lines 288-303 handle all three caller shapes cleanly without double-counting:
    1. `options.elevationDelta === undefined && options.state`: computes `(actorTile + actorVirtual) - (targetTile + targetVirtual)`.
    2. `options.elevationDelta !== undefined` (physical delta from caller): adds `actorVirtual - targetVirtual` once.
    3. Neither `elevationDelta` nor `state` provided, but virtual elevation is non-zero: uses `actorVirtual - targetVirtual`.
- **Decision (Persistence)**:
  - Update `src/core/combat/turnClock.ts` (`endActiveTurn`):
    ```ts
    if (activeCombatUnit.passives?.some((p) => p.unspentApVirtualHeight) && unspent > 0) {
      activeCombatUnit.virtualElevation = Math.min(1, Math.max(activeCombatUnit.virtualElevation ?? 0, unspent));
    }
    ```
  - This ensures ending a turn with `unspent >= 1` arms `+1 Virtual Height`, while ending a later non-attacking turn with `0` AP leaves an already-armed `+1 Virtual Height` intact until discharged by an attack roll (`resolver.ts:1632`).
- **Decision (UI visibility)**:
  - `UnitStatusCard.tsx`:
    - Add `case 'coiled_apex': return '🐉';` in `getPassiveIcon`.
    - Compute `isReady` and `counterText` for `coiled_apex` (`(cu.virtualElevation ?? 0) > 0` -> `isReady = true`, `counterText = '(+1 Height)'`, tooltip ready tag `'COILED (+1 HEIGHT)'`) on both the active unit card and the inspected/pinned unit card.
    - Render a buff pill in `active-modifiers-row` (for active, hovered target, and inspected/pinned cards) via a `formatVirtualElevationBadge(virtualElevation)` helper in `conditionBadges.ts`: `🐉 COILED APEX (+1 Height)` with a rich `ConditionTooltipContent` hover tooltip explaining `+2 Attack Roll, +2 Apex Strike Damage, -2 Incoming Enemy Hit (consumed on next attack)`.
    - Add a `✦ Coiled Apex (+1 Height, +2 Dmg)` badge in the Target Preview header (`preview-badges-row`) whenever `(activeCu.virtualElevation ?? 0) > 0`.
  - `HexGridSvg.tsx`: Include `'🐉'` in `statusIcons` whenever `(cu.virtualElevation ?? 0) > 0` (mirroring Ballistician's `zeroedInStacks` `'🔭'` indicator).
  - `useCombatSimulation.ts`: When `handleEndTurn` runs for a unit with `unspent > 0` and a passive with `unspentApVirtualHeight` (and not already at virtual elevation `>= 1`), emit a buff floating text `Coiled Apex (+1 Height)` alongside the `+<N> Initiative` floater (auto-stacked by the anti-collision floater system).

### 4. Case-Exact Pixel Asset Directory & Disk Parity Guard (B.19)
- **Decision**: Rename `public/assets/tokens/pixel/79_human_male/idle` -> `Idle` using a two-step `git mv` (`idle` -> `Idle_tmp` -> `Idle`) so Windows Git records the case change in the index, and update `"folder": "Idle"` and frame paths in `public/assets/tokens/pixel/79_human_male/metadata.json`.
- **Guard**: Add a Node `fs.readdirSync`-based test in `src/ui/combat/tokenAssets.test.ts` that verifies case-sensitively (checking exact directory entry names returned by `readdirSync`, not case-insensitive `existsSync`) that every token identifier in `AVAILABLE_PIXEL_TOKENS` contains an exact-case `Idle/rotations/<rotation>.png` file for all 8 rotations.

## Risks / Trade-offs

- **[Risk] Deferred visual defeat during Clash Tray (`useCombatSimulation.ts`)** → Because `applyEventsToState` runs before the Clash Tray opens, `purgeConditionsFromDefeatedSource` clears conditions immediately on core resolution while `useCombatSimulation.ts` briefly holds `targetCu.isDefeated = false` for the dying sprite animation. When the Clash Tray finishes, `setState` re-renders with the updated conditions and combat log intact. No extra UI mutation needed.
- **[Risk] Balance impact of clearing `CHARMED` / `HENOSIS` / `CHALLENGED` on source defeat** → Mitigated by re-running the existing combat balance/synergy benchmark tests after implementation to confirm no class win-rate regression.
- **[Risk] Existing unit tests passing pre-combined `elevationDelta` into `resolveAttackRoll` / `evaluateAttackRollContext`** → Mitigated by auditing all `resolveAttackRoll` and `evaluateAttackRollContext` call sites (especially `dragoonMechanics.test.ts`, `attackRoll.test.ts`, `targetPreview.test.ts`, and `elevationCombat.test.ts`) and updating or adding explicit assertions verifying `+1 Virtual Height` yields `+2` bonus without Advantage.
