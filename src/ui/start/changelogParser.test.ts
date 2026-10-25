import { describe, it, expect } from 'vitest';
import { parseChangelog } from './changelogParser';

describe('parseChangelog', () => {
  it('parses release headings, sections, and bullet items', () => {
    const markdown = `
# Changelog

## [0.6.0] - 2026-10-25

### Ruins Obstacles & Standees
- Added 8-directional ruins obstacle tokens.
- Implemented deterministic rotation.

### Tactical AI
- AI evaluates threat weighting.

## [0.5.0] - 2026-10-23

### Stealth
- Implemented stealth lifecycle.
`;

    const releases = parseChangelog(markdown);
    expect(releases).toHaveLength(2);

    expect(releases[0].version).toBe('0.6.0');
    expect(releases[0].date).toBe('2026-10-25');
    expect(releases[0].sections).toHaveLength(2);
    expect(releases[0].sections[0].title).toBe('Ruins Obstacles & Standees');
    expect(releases[0].sections[0].items).toEqual([
      'Added 8-directional ruins obstacle tokens.',
      'Implemented deterministic rotation.'
    ]);

    expect(releases[1].version).toBe('0.5.0');
    expect(releases[1].date).toBe('2026-10-23');
    expect(releases[1].sections).toHaveLength(1);
    expect(releases[1].sections[0].title).toBe('Stealth');
  });

  it('handles empty or malformed markdown gracefully', () => {
    expect(parseChangelog('')).toEqual([]);
    expect(parseChangelog('Some random notes without headers')).toEqual([]);
  });
});
