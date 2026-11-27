# Tasks

## 1. Reusable Cosmic Sprite & 8-Way Sprite Helper

- [x] 1.1 Add `PixelRotation` type export and `resolvePixelRotationPath(unit, rotation)` helper in `src/ui/combat/tokenAssets.ts` (preserving existing `resolveTokenAssetPath` behavior) and add unit test coverage in `src/ui/combat/tokenAssets.test.ts` verifying all 8 directional rotation URLs resolve cleanly
- [x] 1.2 Create the reusable pure SVG + CSS `CosmicSprite` component in `src/ui/common/CosmicSprite.tsx` and `src/ui/common/CosmicSprite.css` (supporting `size`, `interactive`, `pulsing`, and `prefers-reduced-motion: reduce`), and verify rendering and props with component tests in `src/ui/common/CosmicSprite.test.tsx`

## 2. Pure Hearth Simulation & Nexus Hearth Component

- [x] 2.1 Implement the pure headless campfire plaza simulation in `src/ui/camp/hearthSimulation.ts` (inner/outer ring & twilight edge waypoints, `MAX_HEARTH_VISIBLE = 10` prioritization of staged and Ascension-ready Wayfarers, `vectorToPixelRotation(dx, dy)`, `createInitialHearthState`, `syncHearthRoster`, and staggered milling / resting-Wayfarer edge-cycling in `stepHearthSimulation`); verify with unit tests in `src/ui/camp/hearthSimulation.test.ts`
- [x] 2.2 Build the dedicated `NexusHearth` component in `src/ui/camp/NexusHearth.tsx` and `src/ui/camp/NexusHearth.css` rendering `campfire.gif` over a warm flickering radial lantern glow on a twilight stone plaza, Y-depth-sorted Wayfarer sprites with staged gold halos and Ascension-ready sparkles, staggered wandering + edge fade-in/out (respecting `prefers-reduced-motion: reduce`), click-to-inspect and hover nameplates, and the interactive `CosmicSprite` with hover drift and click flavor whispers; verify with component tests in `src/ui/camp/NexusHearth.test.tsx`

## 3. The Nexus, Campfire Commons (UX.26), & Start Screen Integration

- [x] 3.1 Mount `NexusHearth` above `ActiveSquadDock` in `src/ui/camp/CampHub.tsx` (updating `CampHub.css` left-column stacking and wiring `hoveredHeroId` between `HeroCard`/`ActiveSquadDock` and `NexusHearth` so hovering Staging Dais cards gently attracts the Cosmic Sprite), and update `src/ui/camp/CampHub.test.tsx` to verify `NexusHearth` and `CosmicSprite` render cleanly in The Nexus
- [x] 3.2 Update `src/ui/camp/ReserveBarracksTray.css` and `src/ui/camp/HeroMiniCard.css` to replace horizontal scrolling in Campfire Commons with a responsive vertically-wrapping grid (`overflow-y: auto`) resolving UX.26, and verify existing `CampHub.test.tsx` and `ReserveBarracksTray` markup remain intact
- [x] 3.3 Replace the static `✦` header emblem in `src/ui/start/StartScreen.tsx` (and tune `StartScreen.css`) with the softly floating `CosmicSprite` emblem, and update `src/ui/start/StartScreen.test.tsx` to verify the Cosmic Sprite emblem renders on the Start Screen

## 4. Release Bookkeeping, Verification & Build

- [x] 4.1 Bump `package.json` version from `0.26.0` to `0.27.0` and add a strictly end-user-facing `0.27.0` release entry to `CHANGELOG.md` (covering the Nexus Hearth campfire gathering, Cosmic Sprite companion on the Start Screen and in The Nexus, and vertical Campfire Commons grid with zero technical or file-level jargon); verify `src/ui/start/changelogParser.test.ts` passes
- [x] 4.2 Run the full test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`) and verify zero test failures or TypeScript/Vite errors; mark the Nexus Hearth/Cosmic Sprite, UX.16, and UX.26 items complete in `docs/plans/ACTIVE.md`
