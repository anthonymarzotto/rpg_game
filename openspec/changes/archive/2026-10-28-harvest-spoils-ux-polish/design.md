# Design: Harvest Spoils UX Polish & XP Threshold Preview

## Context

See [proposal.md](proposal.md) for motivation.
Post-battle XP allocation is handled by [HarvestDistributionModal.tsx](file:///c:/Repos/rpg_game/src/ui/combat/HarvestDistributionModal.tsx) and styled by [HarvestDistributionModal.css](file:///c:/Repos/rpg_game/src/ui/combat/HarvestDistributionModal.css). The modal displays squad units in a responsive 3-column grid (`.harvest-squad-grid`). Each unit card contains a header and 3 stepper rows (Force, Finesse, Focus).

Progression thresholds are defined in `LEVEL_XP_THRESHOLDS` ([src/core/config/balance.ts](file:///c:/Repos/rpg_game/src/core/config/balance.ts)) and evaluated by `checkHeroLevelReady` ([src/ui/camp/heroUtils.ts](file:///c:/Repos/rpg_game/src/ui/camp/heroUtils.ts)).

## Goals / Non-Goals

**Goals:**
- Replace fragile flex layouts in `.stepper-row` with a strict CSS grid to align attributes, buttons, and stat badges vertically.
- Remove redundant sign prefixes from stepper values, displaying clean integers (`0`, `1`, `2`).
- Provide horizontal breathing room on `btn-step` buttons (`margin: 0 4px`).
- Display current level and next level requirement once per hero in the unit header (e.g. `Level 0 (Req: 5 XP)`).
- Style projected archetype totals into discrete right-aligned pills that illuminate with milestone glow and a `★` indicator when the promotion threshold is met.
- Remove bottom-left footer warning text and attach validation messaging to a hover tooltip on the disabled confirm button.

**Non-Goals:**
- Changing combat party XP retention math (100% victory, 50% defeat).
- Allowing players to promote or advance levels inside the post-trial modal (actual level advancement remains in Camp).
- Modifying the autofill or reset allocation algorithms.

## Decisions

### 1. Stepper Row CSS Grid Alignment
- **Decision**: Replace `display: flex; justify-content: space-between` on `.stepper-row` with:
  ```css
  display: grid;
  grid-template-columns: 54px 1fr 64px;
  align-items: center;
  gap: 0.5rem;
  ```
- **Rationale**: CSS Grid guarantees vertical alignment across all three archetype rows and across all three squad cards regardless of digit widths, eliminating horizontal jitter.
- **Alternatives Considered**: Flexbox with `min-width` on child elements; rejected because varying character and badge sizes still caused subtle misalignments across cards.

### 2. Level Requirement in Card Meta
- **Decision**: In `unit-card-meta`, render:
  ```tsx
  <span className="unit-level-badge">
    Level {currentLevel} {!isMaxLevel ? `(Req: ${threshold} XP)` : '(MAX)'}
  </span>
  ```
- **Rationale**: Stating the requirement once at the top of the card provides immediate context without repeating `/5` or `Req: 5` on every attribute row.
- **Alternatives Considered**: Displaying `[ X/5 ]` on every row; rejected per user feedback as visual clutter.

### 3. Milestone Badge Styling
- **Decision**: Render projected total in a structured pill:
  ```tsx
  <div className={`stepper-projected-pill ${isThresholdMet ? 'threshold-met' : ''} ${currentAlloc > 0 ? 'allocated' : ''}`}>
    <span className="projected-val">{projectedVal}</span>
    {isThresholdMet && !isMaxLevel && <span className="milestone-star">★</span>}
  </div>
  ```
  Styled with a subtle background and border, glowing radiant amber/emerald when threshold is achieved.
- **Rationale**: Gives players instant positive reinforcement when allocating points toward a level-up milestone.

### 4. Tooltip Wrapper for Action Validation
- **Decision**: Wrap the confirm button in a container:
  ```tsx
  <div
    className="harvest-confirm-wrapper"
    title={!isPoolDepleted ? 'Allocate all remaining XP to continue' : undefined}
  >
    <button disabled={!isPoolDepleted} ...>
      {isVictory ? '✦ Proceed to Camp' : '↩ Retreat to Camp'}
    </button>
  </div>
  ```
  Remove `.status-warning` from `.harvest-footer-status`.
- **Rationale**: Native `<button disabled>` elements often suppress pointer events and native browser tooltips. Wrapping the button in a styled tooltip container ensures reliable hover behavior across all browsers while freeing up footer space.

## Risks / Trade-offs

- **[Narrow Card Width]** → Responsive cards down to 220px: The fixed tracks `54px 1fr 64px` total ~126px of fixed content + ~70px of stepper controls = ~196px, fitting comfortably inside 220px cards with 12px padding.
- **[Max Level Units]** → Units at `MAX_LEVEL` (`currentLevel >= 6`): When `isMaxLevel` is true, the header displays `Level 6 (MAX)`, threshold calculation returns 0, and milestone stars are suppressed.
