# Spec Delta

## Purpose
Provides an in-game Astral Codex lore reader that automatically discovers and renders Firmament worldbuilding articles from the lore compendium, accessible from the Start Screen and The Nexus.

## ADDED Requirements

### Requirement: Automatic Lore Compendium Discovery and Frontmatter Parsing
The system SHALL automatically load all playable markdown lore articles from the lore compendium directory while excluding index and template files, extracting structured metadata (`id`, `title`, `category`, `tags`, `related_entries`, `unlock_condition`, and `summary`) from each article's YAML frontmatter.

#### Scenario: Loading playable lore articles
- **WHEN** the Astral Codex loads the lore compendium
- **THEN** all playable lore articles with valid frontmatter are available as codex entries, while the compendium index (`README.md`) and authoring templates (`templates/`) are excluded

#### Scenario: Ordering entries with World Overview first
- **WHEN** the loaded codex entries are sorted for display
- **THEN** the `world-overview` entry appears first, followed by entries grouped by category order (`world`, `cosmology`, `factions`, `bestiary`, `history`) and alphabetically by title within each category

#### Scenario: Default unlock visibility
- **WHEN** an article declares `unlock_condition: default` (or omits `unlock_condition`)
- **THEN** the entry is immediately visible and readable in the Astral Codex

### Requirement: Structured Lore Markdown Rendering
The system SHALL parse and render each lore article's markdown body into clean, readable typography supporting epigraph blockquotes, section headings (`##` and `###`), paragraphs with inline bold and italic emphasis, bullet lists (including nested sub-items), and fenced plain-text diagrams, while omitting duplicate trailing `## See Also` sections in favor of interactive related-entry links.

#### Scenario: Rendering epigraph and section hierarchy
- **WHEN** a player selects a lore article containing an opening blockquote epigraph, headings, and nested bullet lists
- **THEN** the reader displays the styled epigraph quote, structured headings, formatted emphasis, and nested list items cleanly

#### Scenario: Rendering ASCII diagrams
- **WHEN** a player views an article containing a fenced plain-text block (such as the Triad of Guiding Stars diagram)
- **THEN** the reader renders the diagram in a monospaced preformatted block preserving alignment

#### Scenario: Deduplicating See Also sections
- **WHEN** an article includes both `related_entries` frontmatter and a trailing `## See Also` markdown section
- **THEN** the trailing `## See Also` markdown section is omitted from the article body and the related entries are rendered as interactive navigation chips in the footer

### Requirement: Interactive Cross-Link Navigation
The system SHALL allow players to navigate directly between codex articles by clicking either inline relative markdown links within the article body or related-entry chips in the article footer.

#### Scenario: Clicking an inline lore cross-link
- **WHEN** a player clicks an inline link pointing to another lore article (for example `[The Firmament](the_firmament.md)` or `[The Nexus](../world/the_nexus.md)`)
- **THEN** the Astral Codex switches the active reading view to the referenced article and scrolls the reading pane to the top

#### Scenario: Clicking a related-entry chip
- **WHEN** a player clicks a chip in the Related Entries section at the bottom of an article
- **THEN** the Astral Codex switches the active reading view to that entry and resets the category filter to `All` if the target entry is outside the currently active category filter

### Requirement: Master-Detail Astral Codex Modal and Category Filtering
The system SHALL present the Astral Codex in an accessible glassmorphic modal featuring category filter chips, an entry navigation list, and a scrollable article reading pane that opens to `World Overview` by default and dismisses via close button, backdrop click, or the `Escape` key.

#### Scenario: Opening the Astral Codex to default entry
- **WHEN** a player opens the Astral Codex modal
- **THEN** the modal displays with the `All` category selected and `World Overview` active in the reading pane

#### Scenario: Filtering entries by category
- **WHEN** a player selects a category filter chip (such as `Cosmology` or `Factions`)
- **THEN** the entry navigation list displays only entries belonging to that category, and if the previously selected entry is not in that category, the first entry in the filtered list becomes active

#### Scenario: Closing the Astral Codex modal
- **WHEN** the Astral Codex is open and the player clicks the close button, clicks the backdrop overlay, or presses the `Escape` key
- **THEN** the modal closes without altering game or company state

### Requirement: Start Screen and Nexus Entry Points
The system SHALL provide buttons to open the Astral Codex from the Start Screen and from The Nexus header, and SHALL NOT display an Astral Codex button inside the Bout combat arena.

#### Scenario: Opening Astral Codex from the Start Screen
- **WHEN** a player is on the Start Screen and clicks the `Astral Codex` button
- **THEN** the Astral Codex modal opens over the Start Screen

#### Scenario: Opening Astral Codex from The Nexus
- **WHEN** a player is in The Nexus camp hub and clicks the `Astral Codex` button in the header
- **THEN** the Astral Codex modal opens over The Nexus without losing unsaved staging or company state
