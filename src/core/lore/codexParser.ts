import {
  CodexBlock,
  CodexEntry,
  CodexFrontmatter,
  CodexInlineToken,
  CodexListItem
} from './types';

function stripInlineComment(rawValue: string): string {
  let inSingle = false;
  let inDouble = false;
  let bracketDepth = 0;

  for (let i = 0; i < rawValue.length; i++) {
    const ch = rawValue[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
    } else if (!inSingle && !inDouble) {
      if (ch === '[') bracketDepth++;
      else if (ch === ']' && bracketDepth > 0) bracketDepth--;
      else if (ch === '#' && bracketDepth === 0) {
        return rawValue.slice(0, i).trim();
      }
    }
  }

  return rawValue.trim();
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineArray(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return trimmed ? [unquote(trimmed)] : [];
  }
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map((item) => unquote(item))
    .filter((item) => item.length > 0);
}

export function extractFileSlug(sourcePath: string): string {
  const normalized = sourcePath.replace(/\\/g, '/');
  const filename = normalized.split('/').pop() ?? normalized;
  const stem = filename.replace(/\.md$/i, '');
  return stem.trim().toLowerCase().replace(/_/g, '-');
}

export function parseFrontmatter(markdown: string): {
  frontmatter: CodexFrontmatter;
  body: string;
} | null {
  const cleaned = markdown.replace(/^\uFEFF/, '');
  const match = cleaned.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return null;

  const rawHeader = match[1];
  const body = match[2];
  const fields: Record<string, string> = {};

  for (const rawLine of rawHeader.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = stripInlineComment(trimmed.slice(colonIdx + 1));
    fields[key] = rawValue;
  }

  const id = unquote(fields.id ?? '');
  const title = unquote(fields.title ?? '');
  const category = unquote(fields.category ?? '').toLowerCase();

  if (!id || !title || !category) {
    return null;
  }

  const tags = fields.tags ? parseInlineArray(fields.tags) : [];
  const relatedEntries = fields.related_entries
    ? parseInlineArray(fields.related_entries)
    : [];
  const unlockCondition = unquote(fields.unlock_condition ?? '') || 'default';
  const summary = unquote(fields.summary ?? '');

  return {
    frontmatter: {
      id,
      title,
      category,
      tags,
      relatedEntries,
      unlockCondition,
      summary
    },
    body
  };
}

export function parseInlineTokens(text: string): CodexInlineToken[] {
  const tokens: CodexInlineToken[] = [];
  const pattern = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    const segment = match[0];
    if (segment.startsWith('[')) {
      const linkMatch = segment.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        tokens.push({
          type: 'link',
          label: linkMatch[1],
          target: linkMatch[2].trim()
        });
      } else {
        tokens.push({ type: 'text', text: segment });
      }
    } else if (segment.startsWith('**') && segment.endsWith('**')) {
      tokens.push({ type: 'bold', text: segment.slice(2, -2) });
    } else if (segment.startsWith('*') && segment.endsWith('*')) {
      tokens.push({ type: 'italic', text: segment.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', text: segment });
    }

    lastIndex = match.index + segment.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens;
}

function isBlockStarter(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^#{1,3}\s+/.test(trimmed)) return true;
  if (trimmed.startsWith('>')) return true;
  if (trimmed.startsWith('```')) return true;
  if (/^(---|\*\*\*)$/.test(trimmed)) return true;
  if (/^\s*[*-]\s+/.test(line)) return true;
  return false;
}

export function parseCodexBody(body: string): CodexBlock[] {
  const lines = body.split(/\r?\n/);
  const blocks: CodexBlock[] = [];
  let i = 0;
  let skippedTitleH1 = false;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Skip the leading document H1 title (shown in modal header)
    if (!skippedTitleH1 && /^#\s+/.test(trimmed)) {
      skippedTitleH1 = true;
      i++;
      continue;
    }

    // Stop at trailing ## See Also section (deduplicated into Related Entries chips)
    if (/^##\s+see\s+also\s*$/i.test(trimmed)) {
      while (blocks.length > 0 && blocks[blocks.length - 1].type === 'divider') {
        blocks.pop();
      }
      break;
    }

    // Fenced code blocks (e.g., ```text ASCII diagrams)
    const fenceMatch = trimmed.match(/^```([a-zA-Z0-9_-]*)\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1] || undefined;
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++;
      }
      blocks.push({
        type: 'code',
        language,
        content: codeLines.join('\n')
      });
      continue;
    }

    // Epigraph / blockquote
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, '').trim());
        i++;
      }

      let attribution: string | undefined;
      if (quoteLines.length > 1) {
        const lastLine = quoteLines[quoteLines.length - 1];
        const attrMatch = lastLine.match(/^(?:—|--|-)\s*(.+)$/);
        if (attrMatch) {
          attribution = attrMatch[1].trim();
          quoteLines.pop();
        }
      }

      let quote = quoteLines.filter(Boolean).join(' ').trim();
      if (quote.startsWith('*') && quote.endsWith('*') && !quote.startsWith('**')) {
        quote = quote.slice(1, -1).trim();
      }

      blocks.push({ type: 'epigraph', quote, attribution });
      continue;
    }

    // Headings (## and ###)
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      blocks.push({ type: 'heading', level: 2, text: h2Match[1].trim() });
      i++;
      continue;
    }

    const h3Match = trimmed.match(/^###\s+(.+)$/);
    if (h3Match) {
      blocks.push({ type: 'heading', level: 3, text: h3Match[1].trim() });
      i++;
      continue;
    }

    // Horizontal divider (omit leading dividers and dividers right after epigraphs)
    if (/^(---|\*\*\*)$/.test(trimmed)) {
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type !== 'epigraph' && prev.type !== 'divider') {
        blocks.push({ type: 'divider' });
      }
      i++;
      continue;
    }

    // Bullet lists (supporting 1-level nested sub-items)
    if (/^\s*[*-]\s+/.test(rawLine)) {
      const items: Array<{ tokens: readonly CodexInlineToken[]; children?: CodexListItem[] }> = [];

      while (i < lines.length && /^\s*[*-]\s+/.test(lines[i])) {
        const line = lines[i];
        const nestedMatch = line.match(/^(\s{2,})[*-]\s+(.*)$/);
        if (nestedMatch && items.length > 0) {
          const parent = items[items.length - 1];
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push({
            tokens: parseInlineTokens(nestedMatch[2].trim())
          });
        } else {
          const topMatch = line.match(/^\s*[*-]\s+(.*)$/);
          if (topMatch) {
            items.push({
              tokens: parseInlineTokens(topMatch[1].trim())
            });
          }
        }
        i++;
      }

      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph
    const paragraphLines: string[] = [];
    while (i < lines.length && !isBlockStarter(lines[i])) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: 'paragraph',
        tokens: parseInlineTokens(paragraphLines.join(' '))
      });
    } else {
      i++;
    }
  }

  // Drop trailing divider if any
  while (blocks.length > 0 && blocks[blocks.length - 1].type === 'divider') {
    blocks.pop();
  }

  return blocks;
}

export function parseCodexDocument(markdown: string, sourcePath: string): CodexEntry | null {
  const parsed = parseFrontmatter(markdown);
  if (!parsed) return null;

  return {
    ...parsed.frontmatter,
    sourcePath,
    fileSlug: extractFileSlug(sourcePath),
    blocks: parseCodexBody(parsed.body)
  };
}
