# Design

## Context

See `proposal.md` for motivation and scope. Three concrete implementation details in the existing codebase shape this fix:

1. **Duplicate status icon mapping in `HexGridSvg.tsx`**: While `src/ui/combat/conditionBadges.ts` (`formatConditionBadge`) already defines canonical icons and `isDebuff` flags for all 10 `ConditionType` values (including `HENOSIS` `✨`, `MORTAL_EBB` `🕯️`, `CHARMED` `💘`, and `BLINDED` `🕶️`), `src/ui/combat/HexGridSvg.tsx` maintains a separate manual ternary chain and debuff list that only handles the first 6 conditions, causing newer conditions to fall through to `✨` with a gold buff border.
2. **Action Bar lacks caster-level lockout checks**: `src/ui/combat/ActionBar.tsx` only receives `activeCu` (not `CombatState`) and disables ability buttons exclusively on `!hasAp`. Caster-level restrictions (`oncePerTurn`, `maxActivePerSource`) live inside `src/core/combat/validator.ts` (`canExecuteAbility`), so locked abilities remain clickable in the UI until targeting fails with zero highlighted hexes.
3. **Hover tooltip compatibility with disabled buttons**: `src/ui/combat/CombatArena.css` binds `.ability-btn-wrapper:hover .ability-hover-tooltip` to the wrapper `<div>` rather than `<button>:hover`. Disabling the inner `<button>` naturally preserves full hover tooltip display without extra pointer-event hacks.

## Goals / Non-Goals

**Goals:**
- Make `formatConditionBadge` the single source of truth for arena standee condition glyphs and debuff border classification in `HexGridSvg.tsx`.
- Expose a shared caster-level ability availability/lockout helper in `validator.ts` so `canExecuteAbility` and `ActionBar` evaluate `oncePerTurn`, `maxActivePerSource`, and insufficient AP consistently.
- Surface clear disabled reasons inside `AbilityHoverTooltipBody` (including the active vessel's name for `Henosis`) while preserving the full skill description on hover.
- Lock in per-Theurge `HENOSIS` lockout behavior when the active vessel is `CHARMED` via automated tests.

**Non-Goals:**
- Changing `HENOSIS` from per-caster (`maxActivePerSource: 1`) to a team-wide lockout.
- Performing target-level validation (range, line of sight, or `MORTAL_EBB` on a specific ally) at the Action Bar button level—those remain target-selection checks on the hex grid.

## Decisions

### 1. Derive `HexGridSvg` standee icons and debuff state from `formatConditionBadge`
- **Choice**: In `src/ui/combat/HexGridSvg.tsx`, map each `ActiveCondition` through `formatConditionBadge(c)` to obtain `badge.tooltip.icon` (trimmed glyph) and `badge.isDebuff`.
- **Rationale**: Eliminates the duplicated condition switch and debuff whitelist so `MORTAL_EBB` (`🕯️`), `CHARMED` (`💘`), `BLINDED` (`🕶️`), and any future conditions automatically stay synchronized across Unit Status Cards, standee bubbles, and tooltips.
- **Alternative considered**: Adding the 4 missing conditions directly to the inline ternary chain in `HexGridSvg.tsx`. Rejected because it leaves a second manual registry that will inevitably drift again when new conditions are introduced.

### 2. Shared caster-level lockout helper in `validator.ts`
- **Choice**: Enhance `checkActiveSourceConditionCap` in `src/core/combat/validator.ts` to capture the living holder unit names and return a clear reason (e.g., `${effectiveAbility.name} is already active on ${holderNames}.`, retaining the `"already active"` phrasing), and export `getAbilityCastLockoutReason(state: CombatState | undefined, actorCu: CombatUnit, ability: Ability): string | undefined` that evaluates:
  1. `oncePerTurn` already recorded in `actorCu.abilitiesUsedThisTurn` -> `${effectiveAbility.name} can only be used once per turn.`
  2. `checkActiveSourceConditionCap(state, actorCu.unit.id, effectiveAbility)` -> holder-named reason (e.g., `Henosis is already active on Alden.`).
  3. Insufficient AP (`actorCu.currentAp < effectiveAbility.apCost`) -> `Requires ${effectiveAbility.apCost} AP (have ${actorCu.currentAp}).`
- **Rationale**: Keeps lockout rules in `validator.ts` as a single source of truth; checking `oncePerTurn` and `maxActivePerSource` ahead of AP also explains why `Henosis` is locked even if the unit happens to have 1 AP left after casting another spell, while insufficient AP still disables and explains normal abilities.
- **Alternative considered**: Calling `canExecuteAbility` directly from `ActionBar` without a target. Rejected because `SINGLE_TARGET` and `HEX` abilities fail with `"Missing target unit"` / `"Missing destination coordinate"`, which would falsely disable castable abilities.

### 3. Optional `state` prop on `ActionBar` and `disabledReason` banner in `AbilityHoverTooltipBody`
- **Choice**:
  - Add an optional `state?: CombatState` prop to `ActionBarProps` and pass `state` from `CombatArena.tsx`. When `state` is omitted (such as in isolated `ActionBar` unit tests), `getAbilityCastLockoutReason` still evaluates `oncePerTurn` and AP checks cleanly while gracefully skipping arena-wide `maxActivePerSource` lookups.
  - Disable the ability `<button>` when `Boolean(disabledReason)` and add a CSS modifier class (e.g., `locked-out` when blocked by a non-AP lockout so players can visually distinguish a locked skill if desired while reusing disabled button styling).
  - Add `disabledReason?: string` to `AbilityHoverTooltipBodyProps` (`src/ui/common/AbilityDescriptionBlock.tsx`) and render a styled `.tooltip-disabled-reason` banner inside the tooltip so the player always sees *both* the full ability description and why it is currently unavailable.
- **Alternative considered**: Relying on the native HTML `title` attribute for disabled buttons. Rejected because native tooltips have a delay, obscure the custom glassmorphic tooltip, and do not appear reliably on disabled `<button>` elements in all browsers.

## Risks / Trade-offs

- **[Risk] Existing unit tests or UI code asserting exact `checkActiveSourceConditionCap` error strings** → Existing `validator.test.ts` asserts `toContain('already active')`. Keeping `"already active"` in the vessel-named message (`"${effectiveAbility.name} is already active on ${names}."`) preserves full test compatibility.
- **[Risk] Disabled `<button>` swallowing hover events in some browsers** → `.ability-hover-tooltip` is triggered by `.ability-btn-wrapper:hover` on the parent `<div>`, and in CSS disabled buttons still trigger parent container hover (unless `pointer-events: none` is misconfigured; verify `.btn-action:disabled` keeps standard cursor/hover propagation).
