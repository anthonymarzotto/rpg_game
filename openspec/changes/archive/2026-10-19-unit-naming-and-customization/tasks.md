# Tasks

## 1. Modular Name Catalog & Player Recruit Generation

- [x] 1.1 Create `src/data/names.ts` with typed collections (`MALE_FIRST_NAMES`, `SURNAMES_AND_HOUSES`, `ASTRAL_EPITHETS`, `ENEMY_ASTRAL_ADJECTIVES`) and procedural recruit naming utilities, and verify with unit tests in `src/data/names.test.ts`
- [x] 1.2 Update `src/core/campaign/campaignFactory.ts` and `src/core/campaign/transitions.ts` to generate `First + Title` recruit names from `src/data/names.ts`, and verify deterministic seed generation in `campaignFactory.test.ts`

## 2. Procedural Enemy Titling & Combat Presentation

- [x] 2.1 Update `src/core/campaign/encounterGenerator.ts` to assign unique astral adjectives without replacement per trial squad (e.g. `Ash Novice`, `Dusk Novice`), and verify with unit tests in `encounterGenerator.test.ts`
- [x] 2.2 Update `src/ui/combat/HexGridSvg.tsx` standee nameplate rendering to preserve full two-word titles for enemies and first names for players, and verify with unit tests in `HexGridSvg.test.tsx`

## 3. In-Game Hero Renaming & Documentation

- [x] 3.1 Implement inline hero rename editing with `[✎]` button, `Enter`/`Escape` keybindings, and length validation in `src/ui/camp/HeroProgressionDrawer.tsx` and `HeroProgressionDrawer.css`, and verify with unit tests in `HeroProgressionDrawer.test.tsx`
- [x] 3.2 Update `docs/plans/ROADMAP.md` with the Nemesis naming ascension concept and update `docs/plans/ACTIVE.md` tracking item 4.3

## 4. Verification

- [x] 4.1 Run full test suite (`npm test`) and production build (`npm run build`) to ensure 100% test passing and zero TypeScript compilation regressions
