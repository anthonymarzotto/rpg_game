# Tasks

## 1. Core Lore Parser & Build-Time Loader

- [x] 1.1 Define codex domain types (`CodexEntry`, `CodexBlock`, `CodexInlineToken`, `CodexCategory`) in `src/core/lore/types.ts` and implement the pure-TypeScript frontmatter + markdown parser in `src/core/lore/codexParser.ts` (supporting YAML frontmatter, epigraph blockquotes, `##`/`###` headings, bold/italic/relative-link inline spans, 1-level nested bullet lists, fenced `text` code blocks, and stripping trailing `## See Also` sections); verify with unit tests in `src/core/lore/codexParser.test.ts`
- [x] 1.2 Implement the Vite `?raw` glob loader, canonical entry sorting (`world-overview` first, then `world`/`cosmology`/`factions`/`bestiary`/`history` and alphabetical title), category derivation, and cross-link slug resolver in `src/core/lore/codexLoader.ts`; verify with `src/core/lore/codexLoader.test.ts` confirming all 10 playable lore files load, `README.md` and `templates/` are excluded, and every `related_entries` and inline link resolves cleanly

## 2. Astral Codex Modal UI

- [x] 2.1 Build `src/ui/common/AstralCodexModal.tsx` and twilight-themed `src/ui/common/AstralCodexModal.css` with category filter chips, entry sidebar defaulting to `World Overview`, structured markdown + epigraph + ASCII diagram rendering, clickable inline links and bottom Related Entries chips (auto-resetting category filter to `All` when jumping across categories and scrolling reader to top), and close button / backdrop click / `Escape` dismissal
- [x] 2.2 Add component tests in `src/ui/common/AstralCodexModal.test.tsx` verifying default `World Overview` rendering, epigraph/diagram display, category filtering, `See Also` deduplication, Related Entries chip rendering, and closed (`isOpen={false}`) empty render

## 3. Start Screen & The Nexus Integration

- [x] 3.1 Wire the `📖 Astral Codex` button and `AstralCodexModal` into `src/ui/start/StartScreen.tsx` and update `src/ui/start/StartScreen.test.tsx` to verify the button renders and stays consistent with Start Screen actions
- [x] 3.2 Wire the `📖 Astral Codex` button and `AstralCodexModal` into `src/ui/camp/CampHub.tsx` header (without modifying `CombatArena.tsx`) and update `src/ui/camp/CampHub.test.tsx` to verify the button renders in The Nexus header

## 4. Release Notes, Verification & Build

- [x] 4.1 Bump `package.json` version from `0.25.2` to `0.26.0` and add an end-user-facing `0.26.0` release entry to `CHANGELOG.md` (covering the new in-game Astral Codex and the Firmament lore/twilight UI alignment with no technical or file-level jargon); verify `src/ui/start/changelogParser.test.ts` passes
- [x] 4.2 Run the full test suite (`cmd.exe /c npm test`) and production build (`cmd.exe /c npm run build`) and verify zero failures or TypeScript/Vite errors; update `docs/plans/ACTIVE.md` to mark `Astral Codex` complete
