# Design

## Context

Floating combat text is rendered as SVG `<text>` elements inside `HexGridSvg.tsx` using state from `useFloatingCombatText.ts`. Currently, font sizes are hardcoded to 11px–14px without text outlines, relying only on a drop shadow filter, and positioned at `y - 25` relative to the elevation-projected hex center. See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Add a semantic `tier?: FloatingTextTier` property to the `FloatingText` contract (`'impact' | 'standard' | 'utility'`).
- Implement high-contrast SVG typography using `paint-order: stroke fill` with heavy dark outlines (`3.5px`).
- Elevate base spawn position to `y - 36` to cleanly clear unit tokens, standees, and status bubbles.
- Map semantic tiers to concrete SVG typography via a centralized `FLOATER_TIER_STYLES` dictionary (26px crits/slams, 21px hits/misses, 16px XP/buffs).
- Implement anti-collision vertical stacking for simultaneous floating text items on the same hex coordinate.

**Non-Goals:**
- Replacing SVG text with HTML DOM overlay elements (SVG text maintains precise isometric and elevation alignment during zoom).
- Altering core combat engine event dispatch contracts or timing delays in `useFloatingCombatText.ts`.
- Redesigning the Dice Tumbler Tray or Combat Log panel.

## Decisions

### Decision 1: Semantic `tier` on `FloatingText` Contract
- **Choice**: Extend `FloatingText` in `useFloatingCombatText.ts`:
  ```typescript
  export type FloatingTextTier = 'impact' | 'standard' | 'utility';

  export interface FloatingText {
    readonly id: string;
    readonly text: string;
    readonly type: 'damage' | 'crit' | 'graze' | 'miss' | 'xp' | 'buff' | 'slam' | 'initiative';
    readonly coord: HexCoord;
    readonly tier?: FloatingTextTier;
  }
  ```
  - When emitting damage, displacement, status, or XP floaters, `useFloatingCombatText.ts` sets the appropriate semantic tier:
    - `'impact'`: Crits, Slams, Bystander Collisions, Blasts, Knockbacks, Action Faults
    - `'standard'`: Normal attack hits, Misses, Resists, Retreats, Teleports, Initiative rolls
    - `'utility'`: XP awards, Stat buffs, Conditions (Poison, Burn)
  - Provide a pure helper `getDefaultFloaterTier(type: FloatingText['type'], text?: string): FloatingTextTier` so any omitted tier defaults gracefully, ensuring 100% backward compatibility with test fixtures.
- **Rationale**: Separates event semantics from presentation. Avoids string inspection (`ft.text.includes('Fault')`) in the renderer and prevents magic font size numbers from leaking across the codebase.

### Decision 2: Centralized Presentation Styles Dictionary (`FLOATER_TIER_STYLES`)
- **Choice**: In `HexGridSvg.tsx`, define a clean dictionary mapping semantic tiers to SVG typography:
  ```typescript
  export const FLOATER_TIER_STYLES: Record<FloatingTextTier, { fontSize: number; fontWeight: string }> = {
    impact:   { fontSize: 26, fontWeight: '900' },
    standard: { fontSize: 21, fontWeight: '800' },
    utility:  { fontSize: 16, fontWeight: '700' }
  };
  ```
  - During rendering, determine the active tier via `ft.tier ?? getDefaultFloaterTier(ft.type, ft.text)`.
  - Lookup typography styles directly from `FLOATER_TIER_STYLES[tier]`.
- **Rationale**: Centralizes all typography constants into one dictionary. Prevents magic numbers from being scattered across components and allows clean tier-based presentation for crits, hits, and utility feedback.

### Decision 3: SVG Typography with `paint-order: stroke fill`
- **Choice**: Enhance native SVG `<text>` elements with `stroke="rgba(0, 0, 0, 0.85)"`, `strokeWidth="3.5"`, `strokeLinejoin="round"`, and `paintOrder="stroke fill"`.
- **Rationale**: SVG elements inherit the exact geometric elevation transforms (`projectElevationY`) and zoom scaling of the hex grid without requiring viewport bounding-box synchronization. The `paint-order: stroke fill` SVG attribute renders the black silhouette behind the colored glyph fill, providing maximum contrast over any terrain without sacrificing letterform crispness.

### Decision 4: Anti-Collision Vertical Stacking Algorithm
- **Choice**: During SVG rendering in `HexGridSvg.tsx`, maintain a local coordinate frequency map for active `floatingTexts`:
  ```typescript
  const coordOccurrences = new Map<string, number>();
  floatingTexts.map((ft) => {
    const key = toHexKey(ft.coord);
    const count = coordOccurrences.get(key) ?? 0;
    coordOccurrences.set(key, count + 1);
    const stackOffsetY = count * 18;
    const finalY = y - 36 - stackOffsetY;
    ...
  });
  ```
- **Rationale**: Concurrent events on the same hex stack vertically rather than rendering on top of one another. Pure $O(N)$ with $N \le 10$, incurring zero performance overhead.

### Decision 5: SVG CSS Transform Origin Fix
- **Choice**: Add `transform-box: fill-box; transform-origin: center;` to `.floating-combat-text` in `CombatArena.css`.
- **Rationale**: Standardizes CSS `@keyframes floatUpFade` scaling across modern browsers so text scales around its own center rather than SVG `(0, 0)`.

## Risks / Trade-offs

- **[Risk] High floater counts stacking off-screen**:
  - *Mitigation*: Stacking offsets are modest (`18px` per item) and combat resolutions naturally expire after 1.4s, keeping maximum concurrent stack depth to 2–3 items in standard play.
- **[Risk] Stroke width distortion across browser SVG engines**:
  - *Mitigation*: Using SVG attributes `strokeWidth="3.5"` and `vector-effect="non-scaling-stroke"` ensures consistent outline thickness regardless of zoom level.
