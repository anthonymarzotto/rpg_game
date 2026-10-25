export interface ChangelogSection {
  title: string;
  items: string[];
}

export interface ChangelogRelease {
  version: string;
  date: string;
  sections: ChangelogSection[];
}

export function parseChangelog(markdown: string): ChangelogRelease[] {
  const lines = markdown.split(/\r?\n/);
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | null = null;
  let currentSection: ChangelogSection | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Release header: ## [0.6.0] - 2026-10-25
    const releaseMatch = trimmed.match(/^##\s+\[?v?([0-9]+\.[0-9]+\.[0-9]+[^\]]*)\]?(?:\s*-\s*([0-9]{4}-[0-9]{2}-[0-9]{2}))?/i);
    if (releaseMatch) {
      currentRelease = {
        version: releaseMatch[1],
        date: releaseMatch[2] || '',
        sections: []
      };
      releases.push(currentRelease);
      currentSection = null;
      continue;
    }

    // Section header: ### Title
    const sectionMatch = trimmed.match(/^###\s+(.+)$/);
    if (sectionMatch && currentRelease) {
      currentSection = {
        title: sectionMatch[1],
        items: []
      };
      currentRelease.sections.push(currentSection);
      continue;
    }

    // Bullet items: - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.slice(2).trim();
      if (currentSection) {
        currentSection.items.push(itemText);
      } else if (currentRelease) {
        if (currentRelease.sections.length === 0) {
          currentRelease.sections.push({ title: 'Overview', items: [] });
        }
        currentRelease.sections[0].items.push(itemText);
      }
    }
  }

  return releases;
}
