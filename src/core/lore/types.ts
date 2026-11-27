export type CodexCategory =
  | 'world'
  | 'cosmology'
  | 'factions'
  | 'bestiary'
  | 'history'
  | (string & {});

export const CANONICAL_CODEX_CATEGORIES: readonly string[] = [
  'world',
  'cosmology',
  'factions',
  'bestiary',
  'history'
];

export type CodexInlineToken =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'bold'; readonly text: string }
  | { readonly type: 'italic'; readonly text: string }
  | { readonly type: 'link'; readonly label: string; readonly target: string };

export interface CodexListItem {
  readonly tokens: readonly CodexInlineToken[];
  readonly children?: readonly CodexListItem[];
}

export type CodexBlock =
  | { readonly type: 'epigraph'; readonly quote: string; readonly attribution?: string }
  | { readonly type: 'heading'; readonly level: 2 | 3; readonly text: string }
  | { readonly type: 'paragraph'; readonly tokens: readonly CodexInlineToken[] }
  | { readonly type: 'list'; readonly items: readonly CodexListItem[] }
  | { readonly type: 'code'; readonly language?: string; readonly content: string }
  | { readonly type: 'divider' };

export interface CodexFrontmatter {
  readonly id: string;
  readonly title: string;
  readonly category: CodexCategory;
  readonly tags: readonly string[];
  readonly relatedEntries: readonly string[];
  readonly unlockCondition: string;
  readonly summary: string;
}

export interface CodexEntry extends CodexFrontmatter {
  readonly sourcePath: string;
  readonly fileSlug: string;
  readonly blocks: readonly CodexBlock[];
}
