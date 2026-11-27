import { describe, it, expect } from 'vitest';
import {
  formatCategoryLabel,
  getCodexCategories,
  isExcludedLorePath,
  loadCodexEntries,
  loadCodexEntriesFromMap,
  resolveCodexLink
} from './codexLoader';
import { CodexInlineToken } from './types';

describe('codexLoader', () => {
  it('excludes README.md and templates/ paths', () => {
    expect(isExcludedLorePath('../../../docs/lore/README.md')).toBe(true);
    expect(isExcludedLorePath('../../../docs/lore/templates/entry_template.md')).toBe(true);
    expect(isExcludedLorePath('../../../docs/lore/world_overview.md')).toBe(false);
    expect(isExcludedLorePath('../../../docs/lore/world/the_nexus.md')).toBe(false);
  });

  it('loads all 10 playable lore articles from docs/lore with world-overview pinned first', () => {
    const entries = loadCodexEntries();
    expect(entries).toHaveLength(10);
    expect(entries[0].id).toBe('world-overview');

    const ids = entries.map((e) => e.id);
    expect(ids).toEqual([
      'world-overview',
      'trial-grounds',
      'the-nexus',
      'cosmic-sprites',
      'the-firmament',
      'grand-conjunction',
      'constellations',
      'rival-companies',
      'wayfarers',
      'trial-guardians'
    ]);

    // Ensure README and entry_template are excluded
    expect(entries.some((e) => e.sourcePath.toLowerCase().includes('readme.md'))).toBe(false);
    expect(entries.some((e) => e.sourcePath.toLowerCase().includes('/templates/'))).toBe(false);
  });

  it('derives categories in canonical order', () => {
    const entries = loadCodexEntries();
    const categories = getCodexCategories(entries);
    expect(categories).toEqual(['world', 'cosmology', 'factions', 'bestiary']);
    expect(categories.map(formatCategoryLabel)).toEqual([
      'World',
      'Cosmology',
      'Factions',
      'Bestiary'
    ]);
  });

  it('resolves every related_entries reference and inline markdown link across all 10 lore files', () => {
    const entries = loadCodexEntries();

    for (const entry of entries) {
      // Every frontmatter related_entries ID must resolve
      for (const relId of entry.relatedEntries) {
        const resolved = resolveCodexLink(relId, entries);
        expect(resolved, `Unresolved related_entry "${relId}" in ${entry.id}`).not.toBeNull();
      }

      // Every inline link token across paragraphs and list items must resolve
      const inspectTokens = (tokens: readonly CodexInlineToken[]) => {
        for (const token of tokens) {
          if (token.type === 'link') {
            const resolved = resolveCodexLink(token.target, entries);
            expect(
              resolved,
              `Unresolved inline link "${token.target}" in ${entry.id}`
            ).not.toBeNull();
          }
        }
      };

      for (const block of entry.blocks) {
        if (block.type === 'paragraph') {
          inspectTokens(block.tokens);
        } else if (block.type === 'list') {
          for (const item of block.items) {
            inspectTokens(item.tokens);
            if (item.children) {
              for (const child of item.children) {
                inspectTokens(child.tokens);
              }
            }
          }
        }
      }
    }
  });

  it('filters non-default unlock conditions and sorts future categories cleanly', () => {
    const mockModules: Record<string, string> = {
      '../../../docs/lore/README.md': '# Index',
      '../../../docs/lore/templates/entry_template.md': `---
id: template-entry
title: "Template"
category: world
unlock_condition: default
---
Body`,
      '../../../docs/lore/history/age_of_lanterns.md': `---
id: age-of-lanterns
title: "The Age of Lanterns"
category: history
unlock_condition: default
---
Body`,
      '../../../docs/lore/artifacts/star_compass.md': `---
id: star-compass
title: "Star Compass"
category: artifacts
unlock_condition: default
---
Body`,
      '../../../docs/lore/secrets/hidden.md': `---
id: hidden-lore
title: "Hidden Lore"
category: world
unlock_condition: stage-10
---
Body`
    };

    const entries = loadCodexEntriesFromMap(mockModules);
    expect(entries.map((e) => e.id)).toEqual(['age-of-lanterns', 'star-compass']);
    expect(getCodexCategories(entries)).toEqual(['history', 'artifacts']);
  });
});
