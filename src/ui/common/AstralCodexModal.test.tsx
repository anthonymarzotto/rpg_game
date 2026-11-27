import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AstralCodexModal,
  filterEntriesByCategory,
  getDefaultEntryId,
  resolveCrossLinkNavigation
} from './AstralCodexModal';
import { loadCodexEntries } from '../../core/lore/codexLoader';

describe('AstralCodexModal', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <AstralCodexModal isOpen={false} onClose={vi.fn()} />
    );
    expect(html).toBe('');
  });

  it('defaults to World Overview with All category active and Related Entries chips', () => {
    const html = renderToStaticMarkup(
      <AstralCodexModal isOpen={true} onClose={vi.fn()} />
    );

    expect(html).toContain('data-testid="astral-codex-overlay"');
    expect(html).toContain('Astral Codex');
    expect(html).toContain('data-testid="codex-category-all"');
    expect(html).toContain('data-testid="codex-category-world"');
    expect(html).toContain('data-testid="codex-category-cosmology"');
    expect(html).toContain('data-testid="codex-category-factions"');
    expect(html).toContain('data-testid="codex-category-bestiary"');

    // Default active entry is World Overview
    expect(html).toContain('Astral Tactics — World Overview: The Starlit Conjunction');
    expect(html).toContain('data-testid="codex-related-entries"');
    expect(html).toContain('data-testid="codex-related-chip-the-firmament"');
    expect(html).toContain('data-testid="codex-related-chip-the-nexus"');
  });

  it('renders epigraph, Triad ASCII diagram, inline cross-links, and omits duplicate See Also section', () => {
    const html = renderToStaticMarkup(
      <AstralCodexModal
        isOpen={true}
        onClose={vi.fn()}
        initialEntryId="constellations"
      />
    );

    expect(html).toContain('The Stellar Constellations');
    expect(html).toContain('data-testid="codex-epigraph"');
    expect(html).toContain('Master Astrologer Valen');
    expect(html).toContain('data-testid="codex-diagram"');
    expect(html).toContain('[The Crimson Star]');
    expect(html).toContain('[The Emerald Star]');
    expect(html).toContain('[The Violet Star]');
    expect(html).toContain('data-codex-target="the-firmament"');

    // Trailing ## See Also markdown heading is deduplicated in favor of Related Entries chips
    expect(html).not.toContain('>See Also<');
    expect(html).toContain('Related Entries');
    expect(html).toContain('data-testid="codex-related-chip-the-firmament"');
  });

  it('filters sidebar entries by category and auto-selects first matching entry', () => {
    const entries = loadCodexEntries();
    const factionEntries = filterEntriesByCategory(entries, 'factions');
    expect(factionEntries.map((e) => e.id)).toEqual(['rival-companies', 'wayfarers']);
    expect(getDefaultEntryId(entries, 'world-overview', 'factions')).toBe('rival-companies');

    const html = renderToStaticMarkup(
      <AstralCodexModal
        isOpen={true}
        onClose={vi.fn()}
        initialCategory="factions"
      />
    );

    expect(html).toContain('data-testid="codex-entry-btn-rival-companies"');
    expect(html).toContain('data-testid="codex-entry-btn-wayfarers"');
    expect(html).not.toContain('data-testid="codex-entry-btn-the-firmament"');
    expect(html).toContain('Rival Companies &amp; Tournament Guilds');
  });

  it('resets category filter to all when navigating across categories via cross-link or related chip', () => {
    const entries = loadCodexEntries();
    const nexus = entries.find((e) => e.id === 'the-nexus')!;
    const wayfarers = entries.find((e) => e.id === 'wayfarers')!;

    // Jumping from factions -> world resets category to all
    expect(resolveCrossLinkNavigation(nexus, 'factions')).toEqual({
      nextCategory: 'all',
      nextEntryId: 'the-nexus'
    });

    // Staying inside factions keeps factions filter active
    expect(resolveCrossLinkNavigation(wayfarers, 'factions')).toEqual({
      nextCategory: 'factions',
      nextEntryId: 'wayfarers'
    });
  });
});
