# Design

## Context

See `proposal.md` for motivation.

The combat status HUD ([UnitStatusCard.tsx](file:///c:/Repos/rpg_game/src/ui/combat/UnitStatusCard.tsx)) is an absolute overlay positioned at the top-left of the screen within a fixed `250px` card container ([CombatArena.css](file:///c:/Repos/rpg_game/src/ui/combat/CombatArena.css)).

Currently:
- The combat resolution engine ([resolver.ts](file:///c:/Repos/rpg_game/src/core/combat/resolver.ts#L457-L465)) awards `inBattleXp` (1 XP per executed ability tagged with `FIGHTER`, `ROGUE`, or `MAGE`).
- Each unit retains persistent accumulated XP from previous encounters in `cu.unit.progression.accumulatedXp`.
- At the end of combat, `resolveCampaignVictory` commits `inBattleXp` into `accumulatedXp`.
- Progression thresholds are defined in [balance.ts](file:///c:/Repos/rpg_game/src/core/config/balance.ts#L31-L33) via `LEVEL_XP_THRESHOLDS[currentLevel]` (e.g. 5, 10, 15, 20...), capped at `MAX_LEVEL = 9`.
- The combat card currently renders a rudimentary `.hud-xp-tally` showing only `inBattleXp` as `F: 0 XP  R: 0 XP  M: 0 XP`, which hides starting XP, threshold, and attribute identity.

## Goals / Non-Goals

**Goals:**
- Provide a pure, robust utility function to compute combat XP summaries (Force, Finesse, Focus) including base, delta, projected total, threshold, and readiness.
- Render a compact, inline XP progression section on the active player combatant card.
- Render the same compact XP progression section on inspected allied combatants when hovered on the hex grid or CTB timeline ribbon.
- Highlight active battle gains with an inline badge `(+N)` while omitting `(+0)` when no battle XP has been earned.
- Visually highlight stats that meet or exceed the ascension threshold with an astral gold glow and `✦` ready glyph.
- Cleanly handle max-level units (`currentLevel >= 9`) and non-player combatants.

**Non-Goals:**
- Modifying combat engine XP distribution or ability tagging in `resolver.ts`.
- Permitting in-combat leveling or attribute allocation (ascension remains an out-of-combat Camp mechanic).
- Rendering XP trackers for enemy or non-player units.
- Stacked graphical progress bars (the compact inline text tally is selected to preserve vertical screen budget).

## Decisions

### Decision 1: Pure XP Summary Utility (`combatXpUtils.ts`)
We will create a helper function `getCombatUnitXpSummary(cu: CombatUnit)` in `src/ui/combat/combatXpUtils.ts`:
```ts
export interface AttributeXpProgress {
  readonly attribute: 'Force' | 'Finesse' | 'Focus';
  readonly icon: string;
  readonly base: number;
  readonly inBattle: number;
  readonly total: number;
  readonly isReady: boolean;
}

export interface CombatUnitXpSummary {
  readonly currentLevel: number;
  readonly isMaxLevel: boolean;
  readonly threshold: number;
  readonly attributes: readonly AttributeXpProgress[];
}
```
**Rationale**: Decouples the progression math, threshold evaluation, and archetype-to-attribute mapping from React rendering. Allows straightforward unit testing across all edge cases (Level 0 recruit, mid-campaign hero, Level 9 cap, missing `accumulatedXp`).
**Alternative considered**: Calculating values directly inside `UnitStatusCard.tsx`. Rejected to avoid repetitive inline math in both active and inspected card branches and to keep components testable.

### Decision 2: Compact Inline Text Tally with Graceful Wrapping
The UI will replace `.hud-xp-tally` with a two-part container:
1. **Header row**: `XP PROGRESS` on the left, `Next Level: 10 XP` (or `MAX`) on the right.
2. **Stat row**: A flex container with `gap: 0.25rem 0.5rem; flex-wrap: wrap; justify-content: space-between;` containing:
   - `⚔️ Force: 7 (+2)`
   - `🗡️ Finesse: 2`
   - `🔮 Focus: 10 ✦`
**Rationale**: Fits comfortably on a single line within the 218px inner card width during typical scenarios, and wraps cleanly to a second line without overflowing or clipping if values expand.
**Alternative considered**: 3-row stacked mini progress bars. Rejected during exploration because the card already displays HP, stats, conditions, and passives; inline text maximizes compactness.

### Decision 3: Omit `(+0)` Battle Gains
When `inBattle === 0`, display only the total: `🗡️ Finesse: 2`. When `inBattle > 0`, append the delta badge: `<span className="hud-xp-gain">(+2)</span>`.
**Rationale**: Prevents visual noise and draws immediate player attention to stats actively being exercised in the current battle.
**Alternative considered**: Always showing `(+0)`. Rejected because repeating `(+0)` across multiple stats wastes horizontal width and obscures actual gains.

### Decision 4: Display on Inspected Allies; Suppress on Hostiles
In `UnitStatusCard.tsx`, render the XP summary for `activeCu` if `activeCu.faction === 'PLAYER'`, and for `hoveredUnitCu` if `hoveredUnitCu && hoveredUnitCu.faction === 'PLAYER'`.
**Rationale**: Enables the player to inspect upcoming allies in the CTB queue to check their progression status before selecting an action, while avoiding irrelevant clutter on enemy inspection.

## Risks / Trade-offs

- **[Risk] Card Height Accumulation** → High condition/passive counts combined with the XP tracker could push the card down on small displays.
  *Mitigation*: The inline tracker consumes ~22px of vertical height (only ~6px more than the old legacy tally), with zero layout shifts.
- **[Risk] Synthetic or Legacy Unit Data** → Older save files or test recruits might lack `accumulatedXp`.
  *Mitigation*: Default to `{ fighter: 0, rogue: 0, mage: 0 }` safely via nullish coalescing.
