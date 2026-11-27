import { parseCodexDocument } from './codexParser';
import { CANONICAL_CODEX_CATEGORIES, CodexCategory, CodexEntry } from './types';

const rawLoreModules = import.meta.glob('../../../docs/lore/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

export function isExcludedLorePath(sourcePath: string): boolean {
  const normalized = sourcePath.replace(/\\/g, '/').toLowerCase();
  const filename = normalized.split('/').pop() ?? '';
  if (filename === 'readme.md') return true;
  if (normalized.includes('/templates/')) return true;
  return false;
}

function getCategoryOrder(category: CodexCategory): number {
  const idx = CANONICAL_CODEX_CATEGORIES.indexOf(category.toLowerCase());
  return idx === -1 ? CANONICAL_CODEX_CATEGORIES.length : idx;
}

export function sortCodexEntries(entries: readonly CodexEntry[]): CodexEntry[] {
  return [...entries].sort((a, b) => {
    if (a.id === 'world-overview' && b.id !== 'world-overview') return -1;
    if (b.id === 'world-overview' && a.id !== 'world-overview') return 1;

    const catOrderDiff = getCategoryOrder(a.category) - getCategoryOrder(b.category);
    if (catOrderDiff !== 0) return catOrderDiff;

    const catNameDiff = a.category.localeCompare(b.category);
    if (catNameDiff !== 0) return catNameDiff;

    return a.title.localeCompare(b.title);
  });
}

export function loadCodexEntriesFromMap(
  modules: Readonly<Record<string, string>>
): CodexEntry[] {
  const parsed: CodexEntry[] = [];

  for (const [sourcePath, rawMarkdown] of Object.entries(modules)) {
    if (isExcludedLorePath(sourcePath)) continue;
    const entry = parseCodexDocument(rawMarkdown, sourcePath);
    if (!entry) continue;
    if (entry.unlockCondition !== 'default') continue;
    parsed.push(entry);
  }

  return sortCodexEntries(parsed);
}

let cachedEntries: readonly CodexEntry[] | null = null;

export function loadCodexEntries(): readonly CodexEntry[] {
  if (!cachedEntries) {
    cachedEntries = loadCodexEntriesFromMap(rawLoreModules);
  }
  return cachedEntries;
}

export function getCodexCategories(entries: readonly CodexEntry[]): CodexCategory[] {
  const unique = new Set<CodexCategory>();
  for (const entry of entries) {
    unique.add(entry.category);
  }
  return [...unique].sort((a, b) => {
    const orderDiff = getCategoryOrder(a) - getCategoryOrder(b);
    if (orderDiff !== 0) return orderDiff;
    return a.localeCompare(b);
  });
}

export function formatCategoryLabel(category: CodexCategory): string {
  if (!category) return '';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function resolveCodexLink(
  target: string,
  entries: readonly CodexEntry[]
): CodexEntry | null {
  const cleanedTarget = target.trim().split('#')[0].split('?')[0];
  if (!cleanedTarget) return null;

  const directMatch = entries.find(
    (entry) => entry.id.toLowerCase() === cleanedTarget.toLowerCase()
  );
  if (directMatch) return directMatch;

  const normalized = cleanedTarget.replace(/\\/g, '/');
  const filename = normalized.split('/').pop() ?? normalized;
  const candidateSlug = filename.replace(/\.md$/i, '').toLowerCase().replace(/_/g, '-');

  return (
    entries.find(
      (entry) =>
        entry.id.toLowerCase() === candidateSlug || entry.fileSlug === candidateSlug
    ) ?? null
  );
}
