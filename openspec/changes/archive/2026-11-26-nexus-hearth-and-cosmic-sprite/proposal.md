# Proposal

## Why

The Nexus currently presents your traveling company purely as static cards, missing the warm twilight campfire atmosphere and guiding Cosmic Sprite companion described in the Firmament lore, while Campfire Commons scrolls awkwardly horizontally as your roster grows. Adding a lively, subtle **Nexus Hearth** diorama featuring `public/assets/objects/campfire/campfire.gif`, wandering 8-way Wayfarer sprites, a luminous **Cosmic Sprite** presence (in The Nexus and on the Start Screen), and a vertically wrapping Campfire Commons grid brings The Nexus to life without sacrificing tactical clarity.

## What Changes

- Add a dedicated **Nexus Hearth** diorama component (`src/ui/camp/NexusHearth.tsx` + CSS) mounted above **The Staging Dais** in `CampHub`:
  - Renders the animated pixel campfire (`public/assets/objects/campfire/campfire.gif`) on a twilight river-slate plaza with warm flickering radial lantern light and Y-depth sorting.
  - Displays the company's Wayfarers around the fire (staged Wayfarers on the inner ring with a subtle warm-gold ground halo; resting Wayfarers on the outer perimeter, capped around ~10 concurrent sprites for readability).
  - Drives cozy, staggered motion via a pure headless simulation helper (`src/ui/camp/hearthSimulation.ts`): Wayfarers face the fire using their real 8-way pixel rotation sprites, occasionally stroll between open plaza spots (rotating toward their walking direction with a subtle hop), and resting Wayfarers occasionally wander off to the twilight plaza edge and fade out while another resting Wayfarer wanders in.
  - Clicking any Wayfarer in the Hearth opens their `HeroProgressionDrawer`; hovering displays a nameplate/class tag and attracts the Cosmic Sprite; `✦ Ascension Ready` Wayfarers display a soft golden starlight indicator.
  - Respects `prefers-reduced-motion: reduce` by pausing wandering and ambient drift cleanly.
- Add a reusable luminous **Cosmic Sprite** component (`src/ui/common/CosmicSprite.tsx` + CSS) rendered via pure SVG + CSS (golden-starlight core, twilight violet/cyan aura, orbiting stardust motes):
  - In **The Nexus Hearth**: floats gently around the campfire, drifts softly toward hovered Wayfarers (from the Hearth or Staging Dais cards), and emits a warm starlight pulse with a brief fading 1-line flavor whisper when clicked.
  - On the **Start Screen**: replaces the static `✦` header emblem above `ASTRAL TACTICS` with the softly floating Cosmic Sprite.
- Update **Campfire Commons** (`ReserveBarracksTray.css` & `HeroMiniCard.css`, addressing UX.26) from horizontal scrolling (`overflow-x: auto`) to a responsive vertically-wrapping grid (`overflow-y: auto`) so growing rosters browse cleanly top-to-bottom.
- **Version Assessment (SemVer)**: **Minor version bump (`0.26.0` → `0.27.0`)**. Adds new player-facing UI presentation and interactive camp visuals in a backwards-compatible manner with no breaking changes to save files or combat mechanics.

## Capabilities

### New Capabilities
- `nexus-hearth`: Live campfire diorama in The Nexus with animated campfire art, gathered company Wayfarers with subtle 8-way wandering and edge-cycling motion, click-to-inspect interactivity, and the reusable luminous Cosmic Sprite presence on both The Nexus Hearth and the Start Screen.

### Modified Capabilities
- `camp-hub`: Update `Reserve Barracks Tray and Filtering` (Campfire Commons) to arrange resting Wayfarer cards in a responsive vertically-wrapping grid with vertical scrolling rather than horizontal scrolling.

## Impact

- **New UI Components & Helpers**:
  - `src/ui/common/CosmicSprite.tsx`, `src/ui/common/CosmicSprite.css`, `src/ui/common/CosmicSprite.test.tsx`
  - `src/ui/camp/hearthSimulation.ts`, `src/ui/camp/hearthSimulation.test.ts`
  - `src/ui/camp/NexusHearth.tsx`, `src/ui/camp/NexusHearth.css`, `src/ui/camp/NexusHearth.test.tsx`
- **Existing UI Integration**:
  - `src/ui/camp/CampHub.tsx`, `src/ui/camp/CampHub.css`, `src/ui/camp/CampHub.test.tsx` (mount `NexusHearth` above `ActiveSquadDock` in the upper-left column and pass hover focus to the Sprite)
  - `src/ui/camp/ActiveSquadDock.tsx` / `src/ui/camp/HeroCard.tsx` (optional `onHoverHero` callback so hovering a Staging Dais card also gently draws the Cosmic Sprite)
  - `src/ui/camp/ReserveBarracksTray.css`, `src/ui/camp/HeroMiniCard.css` (vertical wrapped grid layout for UX.26)
  - `src/ui/start/StartScreen.tsx`, `src/ui/start/StartScreen.css`, `src/ui/start/StartScreen.test.tsx` (Cosmic Sprite header emblem)
- **Assets & Dependencies**: Uses existing `public/assets/objects/campfire/campfire.gif` and 8-way unit rotation sprites in `public/assets/tokens/pixel/`; zero new npm dependencies.
- **Release Bookkeeping**: Bump `package.json` to `0.27.0`, add a strictly end-user-facing `0.27.0` entry to `CHANGELOG.md`, and mark the Nexus visuals, UX.16, and UX.26 items complete in `docs/plans/ACTIVE.md`.
