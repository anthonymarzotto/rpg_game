import { describe, it, expect } from 'vitest';
import {
  parseCodexBody,
  parseCodexDocument,
  parseFrontmatter,
  parseInlineTokens
} from './codexParser';

const SAMPLE_LORE = `---
id: sample-entry
title: "The Starlit Plaza"
category: world # world | cosmology | factions | bestiary | history
tags: [world, plaza, twilight]
related_entries: [the-firmament, the-nexus]
unlock_condition: default
summary: "A calm stone terrace bathed in lantern glow."
---

# The Starlit Plaza

> *"When the lanterns glow across the stone, every traveler finds a warm seat."*
> — Keeper Orin

---

## Overview

Welcome to **The Firmament**—a land of *gentle twilight* and [The Nexus](../world/the_nexus.md).

### Key Features

* **Lantern Plazas:** Broad river-slate terraces:
  * Carved with compass lines.
  * Lit each evening by travelers.
* **Starlight Docks:** Welcoming ramps for newcomers.

\`\`\`text
    [Force]
      / \\
 [Finesse]--[Focus]
\`\`\`

---

## See Also
- [The Firmament](../cosmology/the_firmament.md)
- [The Nexus](../world/the_nexus.md)
`;

describe('codexParser', () => {
  it('parses YAML frontmatter including quoted strings, arrays, and inline comments', () => {
    const parsed = parseFrontmatter(SAMPLE_LORE);
    expect(parsed).not.toBeNull();
    expect(parsed!.frontmatter).toEqual({
      id: 'sample-entry',
      title: 'The Starlit Plaza',
      category: 'world',
      tags: ['world', 'plaza', 'twilight'],
      relatedEntries: ['the-firmament', 'the-nexus'],
      unlockCondition: 'default',
      summary: 'A calm stone terrace bathed in lantern glow.'
    });
  });

  it('defaults unlock_condition to default when omitted', () => {
    const md = `---
id: minimal-entry
title: "Minimal Entry"
category: history
---

## Overview
Hello world.
`;
    const doc = parseCodexDocument(md, 'docs/lore/history/minimal_entry.md');
    expect(doc).not.toBeNull();
    expect(doc!.unlockCondition).toBe('default');
    expect(doc!.fileSlug).toBe('minimal-entry');
    expect(doc!.tags).toEqual([]);
    expect(doc!.relatedEntries).toEqual([]);
  });

  it('returns null when frontmatter or required fields are missing', () => {
    expect(parseCodexDocument('# No Frontmatter\n\nBody text.', 'README.md')).toBeNull();
    expect(
      parseCodexDocument(
        `---
id: incomplete
---
Body`,
        'incomplete.md'
      )
    ).toBeNull();
  });

  it('parses inline bold, italic, and relative link tokens', () => {
    const tokens = parseInlineTokens(
      'See **The Firmament** for *twilight* and [The Nexus](../world/the_nexus.md).'
    );
    expect(tokens).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'bold', text: 'The Firmament' },
      { type: 'text', text: ' for ' },
      { type: 'italic', text: 'twilight' },
      { type: 'text', text: ' and ' },
      { type: 'link', label: 'The Nexus', target: '../world/the_nexus.md' },
      { type: 'text', text: '.' }
    ]);
  });

  it('parses epigraph, headings, nested bullet lists, fenced text diagram, and strips trailing See Also', () => {
    const doc = parseCodexDocument(SAMPLE_LORE, 'docs/lore/world/sample_entry.md');
    expect(doc).not.toBeNull();

    const blocks = doc!.blocks;
    expect(blocks[0]).toEqual({
      type: 'epigraph',
      quote: '"When the lanterns glow across the stone, every traveler finds a warm seat."',
      attribution: 'Keeper Orin'
    });

    // Redundant divider directly after epigraph should be omitted
    expect(blocks[1]).toEqual({ type: 'heading', level: 2, text: 'Overview' });

    const h3 = blocks.find((b) => b.type === 'heading' && b.level === 3);
    expect(h3).toEqual({ type: 'heading', level: 3, text: 'Key Features' });

    const listBlock = blocks.find((b) => b.type === 'list');
    expect(listBlock?.type).toBe('list');
    if (listBlock?.type === 'list') {
      expect(listBlock.items).toHaveLength(2);
      expect(listBlock.items[0].children).toHaveLength(2);
      expect(listBlock.items[0].children?.[0].tokens).toEqual([
        { type: 'text', text: 'Carved with compass lines.' }
      ]);
    }

    const codeBlock = blocks.find((b) => b.type === 'code');
    expect(codeBlock).toEqual({
      type: 'code',
      language: 'text',
      content: '    [Force]\n      / \\\n [Finesse]--[Focus]'
    });

    // Trailing ## See Also and its preceding divider are stripped
    const seeAlsoHeading = blocks.find(
      (b) => b.type === 'heading' && b.text.toLowerCase() === 'see also'
    );
    expect(seeAlsoHeading).toBeUndefined();
    expect(blocks[blocks.length - 1].type).not.toBe('divider');
  });

  it('handles CRLF line endings cleanly', () => {
    const crlf = SAMPLE_LORE.replace(/\n/g, '\r\n');
    const doc = parseCodexDocument(crlf, 'docs/lore/world/sample_entry.md');
    expect(doc).not.toBeNull();
    expect(doc!.id).toBe('sample-entry');
    expect(doc!.blocks.length).toBeGreaterThan(3);
  });

  it('parses body without epigraph and preserves mid-article dividers', () => {
    const blocks = parseCodexBody(`# Title\n\nIntro paragraph.\n\n---\n\n## Next\n\nSecond paragraph.`);
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'divider', 'heading', 'paragraph']);
  });
});
