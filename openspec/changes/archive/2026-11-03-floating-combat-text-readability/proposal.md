# Proposal

## Why

During combat encounters, overhead "shout out" floating combat text (damage numbers, critical strikes, displacement callouts, XP awards, and condition alerts) rendered in `HexGridSvg.tsx` is difficult to read. Text is currently hardcoded to small font sizes (11px–14px in SVG viewBox space), lacks a high-contrast dark stroke outline (`paint-order: stroke fill`), and spawns directly over unit standees at `y - 25`. When multiple events fire simultaneously (such as a critical hit and an XP award, or knockback and collision damage), floaters spawn on top of one another and occlude critical combat feedback.

Enhancing floating combat text with bold dark outlines, tiered sizing, and anti-collision vertical stacking solves UX.9 and substantially improves combat legibility.

### Semantic Versioning Assessment
- **Current Version**: `0.9.2`
- **Target Version**: `0.9.3` (Patch)
- **Rationale**: This change refines visual presentation and readability of in-game combat feedback without introducing breaking data models, modifying persistent save schemas, or changing combat engine rules. A patch increment aligns with project SemVer conventions for UX refinements.

## What Changes

- **High-Contrast Typography**: Add heavy dark silhouette stroke outlines (`paint-order: stroke fill; stroke: rgba(0, 0, 0, 0.85); stroke-width: 3.5px; stroke-linejoin: round;`) and increase base SVG font scaling so floating combat text is immediately readable over all terrain and spell visual effects.
- **Elevated Spawn Clearance**: Adjust floater base spawn anchor from `y - 25` to `y - 36` to cleanly clear unit tokens, standees, and status bubbles.
- **Tiered Event Sizing & Hierarchy**:
  - Major impact events (`CRITICAL!`, `SLAM!`, `BLAST!`, `COLLISION!`, `KNOCKBACK!`): 26px–28px with boldest weight and subtle flare glow.
  - Standard combat resolutions (`-N` damage, `MISS`, `RESIST!`, `RETREAT!`, `TELEPORT!`, `🎲 <init>`): 20px–22px with strong weight.
  - Secondary utility & progression (`+N XP`, `+N STAT`, `POISON`, `BURN`): 16px–18px compact readable styling.
- **Anti-Collision Vertical Stacking**: When multiple floating text items are simultaneously active on the same hex coordinate, calculate dynamic vertical offsets (e.g. `y - 36 - (stackIndex * 18)`) so that concurrent floaters stack neatly without overlapping.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `arena-timeline-ux`: Introduce a requirement for high-contrast, scalable floating combat text presentation, tiered event sizing, and anti-overlap vertical stacking.

## Impact

- **Affected Files**:
  - `src/ui/combat/HexGridSvg.tsx`: Floater font size evaluation, stroke outline styling, and dynamic stack index offset computation.
  - `src/ui/combat/CombatArena.css`: CSS styling for floating combat text animation and transform-box origin fixes.
  - `src/ui/combat/useFloatingCombatText.ts`: Semantic `FloatingTextTier` contract, resolution tier mapping, and fallback tier helper.
- **Dependencies & APIs**: No external dependencies added. Zero changes to core combat simulation contracts or state models.
