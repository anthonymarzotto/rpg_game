# Proposal

## Why

The Firmament world bible in `docs/lore/` (10 lore articles covering the setting, cosmology, factions, and trial guardians) already ships with structured YAML frontmatter, but players have no way to read any of it inside the game. Surfacing this lore through a lightweight, twilight-styled **Astral Codex** modal gives players immediate access to the setting from both the Start Screen and The Nexus without duplicating prose or cluttering tactical bouts.

## What Changes

- Add a pure TypeScript lore parser and build-time Vite `?raw` loader (`src/core/lore/`) that auto-discovers all playable markdown articles under `docs/lore/` (excluding `README.md` and `templates/`), parses YAML frontmatter (`id`, `title`, `category`, `tags`, `related_entries`, `unlock_condition`, `summary`), and converts article markdown into structured renderable blocks.
- Add a shared **Astral Codex** master-detail modal (`src/ui/common/AstralCodexModal.tsx` + CSS) styled with the Twilight Firmament & Warm Lantern design tokens:
  - Category filter chips (`All`, `World`, `Cosmology`, `Factions`, `Bestiary`—derived dynamically from loaded entries)
  - Entry list defaulting to **World Overview** on open
  - Article reader supporting epigraph blockquotes, `##`/`###` headings, paragraphs with bold/italic emphasis, nested bullet lists, fenced `text` blocks (for the Triad diagram), clickable inline relative cross-links, and a bottom **Related Entries** chip bar (replacing the duplicate markdown `## See Also` list)
  - Standard modal dismiss via close button, backdrop click, or `Escape` key
- Add entry-point buttons to open the Astral Codex from:
  - **Start Screen** (secondary button alongside Company Chronicles)
  - **The Nexus header** (alongside Save Journey and Return to Portal)
  - Explicitly omitted from the Bout combat arena to keep combat HUD uncluttered
- **Version Assessment (SemVer)**: **Minor version bump (`0.25.2` → `0.26.0`)**. This introduces a new player-facing UI feature (the in-game Astral Codex reader) in a backwards-compatible manner with no breaking changes to save files or gameplay rules.

## Capabilities

### New Capabilities
- `astral-codex`: Build-time lore discovery, frontmatter and markdown parsing, and the in-game Astral Codex modal accessible from the Start Screen and The Nexus.

### Modified Capabilities
- *(None — existing Start Screen and Camp Hub requirements remain unchanged; Astral Codex entry points are specified within `astral-codex`.)*

## Impact

- **New Core Module**: `src/core/lore/codexParser.ts`, `src/core/lore/codexLoader.ts`, `src/core/lore/types.ts`, plus unit tests (`codexParser.test.ts`, `codexLoader.test.ts`).
- **New UI Component**: `src/ui/common/AstralCodexModal.tsx`, `src/ui/common/AstralCodexModal.css`, plus component tests (`AstralCodexModal.test.tsx`).
- **Existing UI Integration**: `src/ui/start/StartScreen.tsx` (and `StartScreen.test.tsx`), `src/ui/camp/CampHub.tsx` (and `CampHub.test.tsx`).
- **Dependencies**: Zero new npm dependencies (uses Vite's built-in `import.meta.glob` with `?raw`, matching the existing `ChangelogModal` pattern).
- **Release Bookkeeping**: Bump `package.json` to `0.26.0` and add an end-user-facing entry to `CHANGELOG.md`.
