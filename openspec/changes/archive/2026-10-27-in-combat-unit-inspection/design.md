# Design: In-Combat Unit Inspection & Effect Tooltips

## Context

Combat currently renders two status cards in the top-left overlay (`combat-status-overlay`):
1. The active player unit card (`unit-hud-card player-hud-card`)
2. The transient target preview or inspected unit card (`target-preview-card`)

Currently, `target-preview-card` only appears while the mouse is over a hex. Moving the mouse off the hex immediately destroys the preview card, meaning condition badges in that card can never be reached with the cursor. Furthermore, clicking on units in `IDLE` mode does nothing, condition badges only use delayed browser `title` attributes (or nothing for stat modifiers), and right-clicking triggers the browser's context menu.

See `proposal.md` for motivation and `specs/arena-timeline-ux/spec.md` for requirement specifications.

## Goals / Non-Goals

**Goals:**
- Provide zero-hover understanding of status conditions during ability targeting via smart compact pills.
- Allow pinning any ally or enemy unit into the secondary inspection slot during `IDLE` mode by clicking on their tile or timeline chip.
- Display equipped abilities, remaining AP, and CTB gauge on pinned combatants.
- Deliver instant, rich in-engine tooltips on condition badges and hex standee bubbles without native browser tooltip delay.
- Enable right-click targeting cancellation back to `IDLE` mode.

**Non-Goals:**
- In-combat ability re-equipping or loadout modification (loadouts remain immutable during a trial).
- Multi-unit pinned trays (only one unit is pinned at a time in the secondary card slot).
- Replacing the turn ribbon or active unit card layout.

## Decisions

### 1. Card Stacking in the Secondary Slot
- **Decision**: Reuse the existing secondary card slot directly below the active unit HUD for pinned units.
- **Hierarchy**:
  1. `targetPreview` active: displays `TargetPreviewCard`.
  2. In `IDLE` mode with `pinnedUnitCu` present: displays `PinnedUnitCard` (unless a ribbon/hex hover temporarily overrides with a different inspected unit, which reverts back to the pinned unit on mouse leave).
  3. No pinned unit: displays transient hover preview if hovering a unit, or empty.
- **Rationale**: Preserves the entire central battlefield grid and avoids introducing new intrusive popups.

### 2. Smart Compact Pills for Zero-Hover Comprehension
- **Decision**: Retain 1-line badge height, but format badge text with source attribution and core tactical reminder:
  - `⚔️ Challenged (2t • Garrick): Disadv`
  - `🎯 Exposed (1t): +Adv`
  - `🧪 Poison (2 dmg/t, 2t)`
  - `🔥 Burn (2 dmg/t, 2t)`
  - `👤 Stealth (1t): +Adv`
- **Alternatives Considered**: Multi-line expanded status blocks were rejected to prevent excessive vertical height in the HUD.

### 3. In-Engine Instant Tooltips over Browser `title`
- **Decision**: Replace standard HTML `title` attributes on `.mod-badge` elements with styled in-engine tooltips rendered via CSS/React with `cursor: help` and subtle highlight.
- **Rationale**: Browser `title` tooltips exhibit a 1-1.5 second display lag, are unstyled, and do not convey interactive affordance. Instant tooltips feel responsive and consistent with modern tactics games.

### 4. Standee Status Bubble Interactivity
- **Decision**: Attach hover handlers to the standee status bubble (`[ ⚔️ 🧪 ]`) in `HexGridSvg.tsx` to surface the rich condition tooltip directly adjacent to the standee in world space.
- **Rationale**: Solves the targeting dilemma natively—since the cursor is already aiming at the target hex on the board, the player can inspect conditions without dragging their mouse across the screen.

### 5. Right-Click Context Menu Suppression & Targeting Cancel
- **Decision**: Attach an `onContextMenu` handler to the combat arena container that calls `e.preventDefault()`. If `actionMode === 'ABILITY'`, it reverts `actionMode` to `'IDLE'`.
- **Rationale**: Standard PC turn-based tactics convention (XCOM, BG3, DOS2). Prevents annoying browser context menus and allows fast cancellation.

## Risks / Trade-offs

- **[Risk] Long unit names in condition pills causing text wrapping** → *Mitigation*: Truncate source unit names to first name or first 8 characters (e.g. `Garrick`, `Goblin`) in compact pill view; display full name in the hover tooltip.
- **[Risk] Clashing selection reticles between active unit and pinned unit** → *Mitigation*: The active unit uses the existing golden celestial halo; the pinned unit uses a distinct dashed celestial bracket/ring.
- **[Risk] Accidental ability cancellation** → *Mitigation*: Only right-click cancels; left-click confirms ability execution on valid targets.
