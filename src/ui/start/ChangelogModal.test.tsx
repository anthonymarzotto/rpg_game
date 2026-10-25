import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChangelogModal } from './ChangelogModal';

describe('ChangelogModal', () => {
  const sampleMarkdown = `
# Changelog

## [0.6.0] - 2026-10-25

### Ruins Obstacles & Standees
- Added 8-directional ruins obstacle tokens with pixel-art standees.

### Knight Commander Kit Rework
- Re-architected the Knight class into a tactical Commander archetype.
- Added the **Exposed** condition.
`;

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <ChangelogModal isOpen={false} onClose={vi.fn()} changelogRaw={sampleMarkdown} />
    );
    expect(html).toBe('');
  });

  it('renders modal dialog with release notes when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <ChangelogModal isOpen={true} onClose={vi.fn()} changelogRaw={sampleMarkdown} />
    );

    expect(html).toContain('Release Notes');
    expect(html).toContain('v0.6.0');
    expect(html).toContain('2026-10-25');
    expect(html).toContain('Ruins Obstacles &amp; Standees');
    expect(html).toContain('Knight Commander Kit Rework');
    expect(html).toContain('Added 8-directional ruins obstacle tokens with pixel-art standees.');
    expect(html).toContain('<strong class="changelog-highlight">Exposed</strong>');
  });

  it('renders empty message when no releases found in markdown', () => {
    const html = renderToStaticMarkup(
      <ChangelogModal isOpen={true} onClose={vi.fn()} changelogRaw="" />
    );

    expect(html).toContain('No release notes available.');
  });
});
