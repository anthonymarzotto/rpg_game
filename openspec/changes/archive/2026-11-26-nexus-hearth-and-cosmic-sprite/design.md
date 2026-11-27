# Design

## Context

`CampHub.tsx` currently splits its upper row into a two-column grid (`1fr 360px`) placing `ActiveSquadDock` (The Staging Dais) on the left and `ExpeditionWarRoom` (Upcoming Tournament Bout) on the right, with `ReserveBarracksTray` (Campfire Commons) below using a horizontal flex strip (`overflow-x: auto`). Every playable class already has all 8 pixel-art idle rotations under `public/assets/tokens/pixel/<id>/Idle/rotations/{north,north-east,east,south-east,south,south-west,west,north-west}.png`, and an animated pixel campfire asset already exists at `public/assets/objects/campfire/campfire.gif` (`136x136`, transparent background). See `proposal.md` for motivation and `specs/nexus-hearth/spec.md` + `specs/camp-hub/spec.md` for behavioral requirements.

## Goals / Non-Goals

**Goals:**
- Introduce two cleanly decoupled, dedicated UI components (`NexusHearth` and `CosmicSprite`) rather than bloating `ActiveSquadDock` or `CampHub`.
- Keep all spatial layout, 8-way facing math, spot assignment, and milling/edge-cycling transitions in a pure, deterministic TypeScript module (`src/ui/camp/hearthSimulation.ts`) so behavior is thoroughly unit-tested without browser timers or jsdom.
- Preserve fast tactical access to `HeroCard` stats/XP bars, `ENTER BOUT`, and `Campfire Commons` filtering with zero impact on `CampaignState` or save formats.
- Respect `prefers-reduced-motion: reduce` everywhere animations are introduced.

**Non-Goals:**
- Adding walk-cycle raster sprite sheets or modifying existing combat arena token rendering.
- Persisting campfire seat positions or Sprite whispers to IndexedDB.
- Adding a playable unit or combat mechanics for the Cosmic Sprite (purely visual/ambient companion presence).
- Altering `CombatArena.tsx` or combat HUD layouts.

## Decisions

### 1. Dedicated Components: `NexusHearth` + `CosmicSprite`
- **Decision**:
  - Create `src/ui/camp/NexusHearth.tsx` (+ `NexusHearth.css`) mounted inside a left-column wrapper in `CampHub.tsx` directly above `ActiveSquadDock` (keeping `ExpeditionWarRoom` cleanly anchored in the right column alongside both).
  - Create `src/ui/common/CosmicSprite.tsx` (+ `CosmicSprite.css`) as a pure SVG + CSS luminous celestial sprite reusable across both `NexusHearth` (interactive mode) and `StartScreen` (emblem mode).
- **Rationale**: Keeps `ActiveSquadDock` focused on staged cards and Trial Budget accounting, avoids duplicating Sprite visuals between Start Screen and The Nexus, and makes each component independently testable.
- **Alternative Considered**: Embedding the campfire inside `ActiveSquadDock` or `ReserveBarracksTray`. Rejected because `ActiveSquadDock` is strictly staged units (whereas the Hearth shows the whole company), and `ReserveBarracksTray` is empty on Trial 1.

### 2. Pure Headless Hearth Simulation (`src/ui/camp/hearthSimulation.ts`)
- **Decision**: Model the Hearth plaza in normalized percentage coordinates (`x: 0..100`, `y: 0..100`) with the campfire centered around `(50, 56)` and predefined ring waypoints:
  - **Inner ring** (~6 spots around the fire): reserved preferentially for staged Wayfarers (with a subtle warm-gold ground halo).
  - **Outer perimeter ring** (~8 spots along the stone plaza): used for resting Wayfarers (and overflow staged Wayfarers if squad size exceeds inner ring slots).
  - **Edge waypoints** (left & right twilight colonnade entrances at `x: 4` and `x: 96`): used when resting Wayfarers stroll off-plaza (`phase: 'departing'`, fading out) or wander back in (`phase: 'arriving'`, fading in).
  - **Concurrent cap**: Up to `MAX_HEARTH_VISIBLE = 10` simultaneous Wayfarers (prioritizing staged Wayfarers first, then Ascension-ready reserves, then other reserves; extra resting Wayfarers rotate in naturally via edge cycling).
  - **8-way rotation mapping**: Add a small helper `resolvePixelRotationPath(unit, rotation)` (extending `tokenAssets.ts` cleanly without changing existing `resolveTokenAssetPath` signatures) and `vectorToPixelRotation(dx, dy)` in `hearthSimulation.ts` so every Wayfarer faces the campfire when settled and faces its walking vector while moving.
- **Rationale**: Pure percentage coordinates scale smoothly across desktop and narrower viewports, Y-coordinate maps directly to CSS `z-index` for natural behind/in-front-of-fire depth sorting, and pure state-step functions (`createInitialHearthState`, `syncHearthRoster`, `stepHearthSimulation`) can be exhaustively verified in Vitest with injectable RNG.
- **Alternative Considered**: `requestAnimationFrame` canvas loop or physics steering. Rejected as over-engineered for gentle, staggered 2-second CSS glides; CSS `transition: left, top, opacity` + keyframed stride bob is hardware-accelerated and lightweight.

### 3. Campfire GIF Rendering & Reduced Motion
- **Decision**: Render `public/assets/objects/campfire/campfire.gif` via `BASE_URL` (`${BASE_URL}assets/objects/campfire/campfire.gif`) with `image-rendering: pixelated` over a CSS radial lantern glow. Detect `prefers-reduced-motion: reduce` (in both CSS `@media` rules and a lightweight `matchMedia` check in `NexusHearth`) to disable milling timers, sprite bobbing, and ambient Sprite drift.
- **Rationale**: Keeps GitHub Pages (`base: './'`) relative asset resolution consistent with `tokenAssets.ts` and ensures accessible motion defaults.

### 4. Cosmic Sprite Hover Reactivity & Whispers
- **Decision**:
  - Maintain `hoveredHeroId: string | null` in `CampHub.tsx`, passed as an optional hover callback into `ActiveSquadDock` -> `HeroCard` and `NexusHearth`.
  - When `hoveredHeroId` matches a Wayfarer currently visible in `NexusHearth`, the `CosmicSprite` smoothly glides to a slight offset above/beside that Wayfarer; otherwise it orbits a gentle resting patrol path near the hearth.
  - Clicking the Sprite cycles through a small curated array of warm Firmament lore whispers (rendered in a non-blocking translucent twilight pill above the Sprite, fading out after ~3.5s).
- **Rationale**: Creates a quiet, magical connection between the player persona (Cosmic Sprite), the diorama, and the Staging Dais cards without adding tooltips that obscure buttons.

### 5. Campfire Commons Vertical Grid (UX.26)
- **Decision**: Change `.reserve-cards-scroll-container` in `ReserveBarracksTray.css` from `display: flex; overflow-x: auto;` to `display: grid; grid-template-columns: repeat(auto-fill, minmax(185px, 1fr)); overflow-y: auto; max-height: 360px;` and relax `.hero-mini-card` fixed `max-width: 200px` to `width: 100%; min-width: 0; max-width: none;` so cards align evenly across rows.
- **Rationale**: Directly resolves UX.26 with minimal CSS changes and zero regression to existing card actions or filters.

## Risks / Trade-offs

- **Vertical height in The Nexus on shorter laptops**: Adding `NexusHearth` above `ActiveSquadDock` increases left-column height slightly. → Mitigation: Keep `NexusHearth` compact (`height: 195px` desktop, `170px` mobile) so the Hearth, Staging Dais cards, and `ENTER BOUT` button all fit comfortably above the fold on standard 1080p/900p screens.
- **Sprite overlap when milling**: Random spot selection could place two sprites close together. → Mitigation: `stepHearthSimulation` only picks unoccupied waypoints (tracking reserved target spots during `walking`/`arriving`), guaranteeing clean separation at all times.
- **Stale roster references after recruiting, staging, or benching**: When the player recruits a Novice or swaps staged/resting Wayfarers, the Hearth must reflect changes immediately. → Mitigation: `syncHearthRoster` reconciles incoming `roster` and `activeSquadIds` cleanly, updating `isStaged` rings in-place, removing vanished units, and smoothly letting newly welcomed Novices stroll in from the plaza edge.
