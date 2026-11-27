# Design

## Context

Astral Tactics is a client-side React 19 + TypeScript + Vite 6 application deployed statically (`base: './'`) with zero third-party markdown dependencies. `ChangelogModal.tsx` + `changelogParser.ts` already demonstrate loading repo markdown via Vite's `?raw` query and parsing it with pure TypeScript. See `proposal.md` for motivation and `specs/astral-codex/spec.md` for behavioral requirements.

All 10 playable lore documents under `docs/lore/` share a standardized YAML frontmatter block (`id`, `title`, `category`, `tags`, `related_entries`, `unlock_condition`, `summary`) and a narrow, predictable subset of markdown (epigraph blockquotes, `##`/`###` headings, bold/italic, nested bullet lists, relative `.md` cross-links, one fenced `text` ASCII diagram, and a trailing `## See Also` section).

## Goals / Non-Goals

**Goals:**
- Single source of truth: read directly from `docs/lore/**/*.md` at build time so authoring a new lore markdown file automatically surfaces it in-game.
- Keep headless parsing/loading strictly in `src/core/lore/` with thorough unit tests, separated from React presentation in `src/ui/common/`.
- Style the modal using existing Twilight Firmament & Warm Lantern tokens (`src/styles/tokens.css`).
- Keep scope intentionally lightweight: fast browsing, category filtering, and clickable cross-links.

**Non-Goals:**
- Full CommonMark / GitHub Flavored Markdown compliance (no tables, HTML embedding, or runtime markdown library imports).
- Full-text search bar, browser-style back/forward history stack, or IndexedDB persistence for read/unread badges.
- Gameplay/mechanics tutorials or in-Bout combat HUD integration.
- Progressive unlock UI for locked entries (all current entries are `unlock_condition: default`; the field is parsed and retained for future use).

## Decisions

### 1. Build-Time Discovery via Vite `import.meta.glob` (`?raw`)
- **Decision**: Use `import.meta.glob('../../../docs/lore/**/*.md', { query: '?raw', import: 'default', eager: true })` in `src/core/lore/codexLoader.ts`, filtering out `README.md` and `/templates/`.
- **Rationale**: Bundles all lore synchronously into the app with zero runtime network fetches (works offline, in Vitest, and on GitHub Pages with `base: './'`). Adding a future lore markdown file requires zero code changes.
- **Alternative Considered**: Copying lore into `public/` and fetching JSON/MD at runtime. Rejected because it introduces async loading states, base-URL edge cases, and duplicated files.

### 2. Zero-Dependency Pure-TS Frontmatter & Block Parser
- **Decision**: Implement `src/core/lore/codexParser.ts` to parse simple YAML frontmatter (`key: value`, quoted strings, inline `[a, b, c]` arrays) and convert the body into typed AST blocks:
  - `epigraph` (leading `>` quote + attribution line)
  - `heading` (level 2 or 3)
  - `paragraph` (with inline spans: plain text, bold, italic, and codex link tokens)
  - `list` (supporting 1 level of nested bullet sub-items)
  - `code` (fenced ` ```text ` blocks for diagrams such as the Triad of Guiding Stars)
  - `divider` (`---`, omitted when redundant around epigraphs)
- **Rationale**: Matches the existing `changelogParser.ts` pattern, adds zero bundle bloat, and makes rendering safe (pure React elements, no `dangerouslySetInnerHTML`).
- **Alternative Considered**: Installing `marked` / `react-markdown` + `gray-matter`. Rejected as heavyweight for 10 structured lore files and unnecessary given the narrow markdown subset.

### 3. Cross-Link Resolution & `## See Also` Deduplication
- **Decision**:
  - Stop block parsing when encountering a `## See Also` heading (since `related_entries` frontmatter provides the same links canonically).
  - Resolve inline markdown links `[Label](../path/to/file_name.md)` by deriving a slug from the target filename stem (`file_name` → `file-name`, lowercased) and matching against loaded entries by either `entry.id` or source filename stem. If an inline link does not match a loaded entry, render its label as plain styled text rather than a broken anchor.
  - When a player clicks an inline link or Related Entry chip for an entry outside the current category filter, switch the category filter back to `All` (so the newly active entry stays visible in the sidebar) and scroll the reader pane to the top.
- **Rationale**: Prevents dead links, eliminates duplicate "See Also" lists, and keeps navigation seamless.

### 4. Canonical Sorting & Category Derivation
- **Decision**: Sort entries with `id === 'world-overview'` pinned first, followed by canonical category order (`world`, `cosmology`, `factions`, `bestiary`, `history`, then any future category alphabetically), and alphabetically by `title` within each category. Derive category filter chips dynamically from the categories present in loaded entries (preceded by `All`).
- **Rationale**: Ensures new players immediately see the World Overview on first open, while automatically supporting future categories like `history` from `entry_template.md`.

### 5. Modal Integration Points
- **Decision**: Create `src/ui/common/AstralCodexModal.tsx` (props: `isOpen`, `onClose`, optional `entries` override for deterministic testing, optional `initialEntryId`). Mount it locally in `StartScreen.tsx` (alongside `ChangelogModal` and `SaveSlotDrawer`) and `CampHub.tsx` (triggered by a `📖 Astral Codex` button in `.camp-header-actions`).
- **Rationale**: Keeps state local to each screen with zero changes to `App.tsx` routing or `CampaignState`, and keeps `CombatArena.tsx` completely untouched.

## Risks / Trade-offs

- **Custom YAML subset parser**: Only supports flat key-value pairs, quoted strings, and single-line `[a, b]` arrays (matching all 10 lore files and `entry_template.md`). → Mitigation: Document supported frontmatter syntax in unit tests and trim inline `# comments` cleanly (e.g., `category: world # ...`).
- **Vite `import.meta.glob` relative path sensitivity**: The glob path `'../../../docs/lore/**/*.md'` depends on `codexLoader.ts` living in `src/core/lore/`. → Mitigation: Add `codexLoader.test.ts` verifying all 10 current lore entries load, exclude `README.md` and `entry_template.md`, and resolve every `related_entries` and inline cross-link without broken targets.
- **Responsive layout on narrower screens**: A two-column master-detail modal can feel cramped below ~720px width. → Mitigation: Collapse the entry sidebar into a compact scrollable strip above the reader pane via a CSS media query (`@media (max-width: 720px)`).
