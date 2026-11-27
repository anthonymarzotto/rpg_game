import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  formatCategoryLabel,
  getCodexCategories,
  loadCodexEntries,
  resolveCodexLink
} from '../../core/lore/codexLoader';
import {
  CodexBlock,
  CodexCategory,
  CodexEntry,
  CodexInlineToken
} from '../../core/lore/types';
import './AstralCodexModal.css';

export type CodexCategoryFilter = 'all' | CodexCategory;

export interface AstralCodexModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly entries?: readonly CodexEntry[];
  readonly initialEntryId?: string;
  readonly initialCategory?: CodexCategoryFilter;
}

export function filterEntriesByCategory(
  entries: readonly CodexEntry[],
  category: CodexCategoryFilter
): CodexEntry[] {
  if (category === 'all') return [...entries];
  return entries.filter((entry) => entry.category === category);
}

export function getDefaultEntryId(
  entries: readonly CodexEntry[],
  initialEntryId?: string,
  category: CodexCategoryFilter = 'all'
): string | null {
  const pool = filterEntriesByCategory(entries, category);
  if (pool.length === 0) return null;

  if (initialEntryId && pool.some((e) => e.id === initialEntryId)) {
    return initialEntryId;
  }

  const overview = pool.find((e) => e.id === 'world-overview');
  return overview ? overview.id : pool[0].id;
}

export function resolveCrossLinkNavigation(
  targetEntry: CodexEntry,
  currentCategory: CodexCategoryFilter
): { nextCategory: CodexCategoryFilter; nextEntryId: string } {
  const nextCategory =
    currentCategory !== 'all' && targetEntry.category !== currentCategory
      ? 'all'
      : currentCategory;
  return { nextCategory, nextEntryId: targetEntry.id };
}

export function AstralCodexModal({
  isOpen,
  onClose,
  entries,
  initialEntryId,
  initialCategory = 'all'
}: AstralCodexModalProps) {
  const allEntries = useMemo(() => entries ?? loadCodexEntries(), [entries]);
  const categories = useMemo(() => getCodexCategories(allEntries), [allEntries]);

  const [activeCategory, setActiveCategory] = useState<CodexCategoryFilter>(initialCategory);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(() =>
    getDefaultEntryId(allEntries, initialEntryId, initialCategory)
  );

  const readerRef = useRef<HTMLDivElement | null>(null);

  const scrollReaderToTop = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.scrollTop = 0;
    }
  }, []);

  // Reset view when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveCategory(initialCategory);
    setActiveEntryId(getDefaultEntryId(allEntries, initialEntryId, initialCategory));
    scrollReaderToTop();
  }, [isOpen, allEntries, initialEntryId, initialCategory, scrollReaderToTop]);

  // Dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredEntries = useMemo(
    () => filterEntriesByCategory(allEntries, activeCategory),
    [allEntries, activeCategory]
  );

  const activeEntry = useMemo(() => {
    if (activeEntryId) {
      const exact = filteredEntries.find((e) => e.id === activeEntryId);
      if (exact) return exact;
      const fromAll = allEntries.find((e) => e.id === activeEntryId);
      if (fromAll && activeCategory === 'all') return fromAll;
    }
    return filteredEntries[0] ?? null;
  }, [activeEntryId, filteredEntries, allEntries, activeCategory]);

  const relatedEntries = useMemo(() => {
    if (!activeEntry) return [];
    const seen = new Set<string>([activeEntry.id]);
    const resolved: CodexEntry[] = [];
    for (const relTarget of activeEntry.relatedEntries) {
      const target = resolveCodexLink(relTarget, allEntries);
      if (target && !seen.has(target.id)) {
        seen.add(target.id);
        resolved.push(target);
      }
    }
    return resolved;
  }, [activeEntry, allEntries]);

  const handleSelectCategory = useCallback(
    (category: CodexCategoryFilter) => {
      setActiveCategory(category);
      const nextFiltered = filterEntriesByCategory(allEntries, category);
      if (
        nextFiltered.length > 0 &&
        (!activeEntryId || !nextFiltered.some((e) => e.id === activeEntryId))
      ) {
        setActiveEntryId(nextFiltered[0].id);
        scrollReaderToTop();
      }
    },
    [allEntries, activeEntryId, scrollReaderToTop]
  );

  const handleSelectEntry = useCallback(
    (entryId: string) => {
      setActiveEntryId(entryId);
      scrollReaderToTop();
    },
    [scrollReaderToTop]
  );

  const handleNavigateToEntry = useCallback(
    (targetEntry: CodexEntry) => {
      const { nextCategory, nextEntryId } = resolveCrossLinkNavigation(
        targetEntry,
        activeCategory
      );
      setActiveCategory(nextCategory);
      setActiveEntryId(nextEntryId);
      scrollReaderToTop();
    },
    [activeCategory, scrollReaderToTop]
  );

  const renderInlineTokens = useCallback(
    (tokens: readonly CodexInlineToken[]) =>
      tokens.map((token, idx) => {
        if (token.type === 'bold') {
          return (
            <strong key={idx} className="codex-strong">
              {token.text}
            </strong>
          );
        }
        if (token.type === 'italic') {
          return (
            <em key={idx} className="codex-em">
              {token.text}
            </em>
          );
        }
        if (token.type === 'link') {
          const targetEntry = resolveCodexLink(token.target, allEntries);
          if (targetEntry) {
            return (
              <button
                key={idx}
                type="button"
                className="codex-inline-link font-ui"
                onClick={() => handleNavigateToEntry(targetEntry)}
                data-codex-target={targetEntry.id}
              >
                {token.label}
              </button>
            );
          }
          return (
            <span key={idx} className="codex-unresolved-link">
              {token.label}
            </span>
          );
        }
        return <span key={idx}>{token.text}</span>;
      }),
    [allEntries, handleNavigateToEntry]
  );

  const renderBlock = useCallback(
    (block: CodexBlock, idx: number) => {
      switch (block.type) {
        case 'epigraph':
          return (
            <blockquote key={idx} className="codex-epigraph" data-testid="codex-epigraph">
              <p className="codex-epigraph-quote">{block.quote}</p>
              {block.attribution && (
                <footer className="codex-epigraph-attribution font-ui">
                  — {block.attribution}
                </footer>
              )}
            </blockquote>
          );
        case 'heading':
          return block.level === 2 ? (
            <h3 key={idx} className="codex-heading-h2 font-display">
              {block.text}
            </h3>
          ) : (
            <h4 key={idx} className="codex-heading-h3 font-ui">
              {block.text}
            </h4>
          );
        case 'paragraph':
          return (
            <p key={idx} className="codex-paragraph font-ui">
              {renderInlineTokens(block.tokens)}
            </p>
          );
        case 'list':
          return (
            <ul key={idx} className="codex-list font-ui">
              {block.items.map((item, itemIdx) => (
                <li key={itemIdx} className="codex-list-item">
                  <span>{renderInlineTokens(item.tokens)}</span>
                  {item.children && item.children.length > 0 && (
                    <ul className="codex-sublist">
                      {item.children.map((child, childIdx) => (
                        <li key={childIdx} className="codex-sublist-item">
                          {renderInlineTokens(child.tokens)}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          );
        case 'code':
          return (
            <pre key={idx} className="codex-diagram font-mono" data-testid="codex-diagram">
              <code>{block.content}</code>
            </pre>
          );
        case 'divider':
          return <hr key={idx} className="codex-divider" />;
      }
    },
    [renderInlineTokens]
  );

  if (!isOpen) return null;

  return (
    <div
      className="codex-modal-overlay"
      onClick={onClose}
      data-testid="astral-codex-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Astral Codex"
    >
      <div
        className="codex-modal-panel"
        onClick={(e) => e.stopPropagation()}
        data-testid="astral-codex-panel"
      >
        <header className="codex-modal-header">
          <div className="codex-header-title-group">
            <span className="codex-header-emblem" aria-hidden="true">
              📖
            </span>
            <div className="codex-header-text">
              <h2 className="codex-modal-title font-display">Astral Codex</h2>
              <span className="codex-modal-subtitle font-mono">
                Lore &amp; Chronicles of The Firmament
              </span>
            </div>
          </div>
          <button
            type="button"
            className="codex-close-btn font-ui"
            onClick={onClose}
            aria-label="Close Astral Codex"
            data-testid="codex-close-btn"
          >
            ✖
          </button>
        </header>

        <nav className="codex-category-bar" aria-label="Lore categories">
          <button
            type="button"
            className={`codex-category-chip font-ui ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => handleSelectCategory('all')}
            aria-pressed={activeCategory === 'all'}
            data-testid="codex-category-all"
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`codex-category-chip font-ui ${activeCategory === category ? 'active' : ''}`}
              onClick={() => handleSelectCategory(category)}
              aria-pressed={activeCategory === category}
              data-testid={`codex-category-${category}`}
            >
              {formatCategoryLabel(category)}
            </button>
          ))}
        </nav>

        <div className="codex-modal-body">
          <aside className="codex-sidebar" aria-label="Codex entries" data-testid="codex-sidebar">
            {filteredEntries.map((entry) => {
              const isSelected = activeEntry?.id === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={`codex-sidebar-item font-ui ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectEntry(entry.id)}
                  aria-current={isSelected ? 'page' : undefined}
                  data-testid={`codex-entry-btn-${entry.id}`}
                >
                  <span className="codex-sidebar-item-title">{entry.title}</span>
                  <span className="codex-sidebar-item-cat font-mono">
                    {formatCategoryLabel(entry.category)}
                  </span>
                </button>
              );
            })}
          </aside>

          <article className="codex-reader" ref={readerRef} data-testid="codex-reader">
            {activeEntry ? (
              <>
                <header className="codex-article-header">
                  <span className="codex-article-category font-mono">
                    {formatCategoryLabel(activeEntry.category)}
                  </span>
                  <h2 className="codex-article-title font-display" data-testid="codex-article-title">
                    {activeEntry.title}
                  </h2>
                </header>

                <div className="codex-article-blocks">
                  {activeEntry.blocks.map((block, idx) => renderBlock(block, idx))}
                </div>

                {relatedEntries.length > 0 && (
                  <section
                    className="codex-related-section"
                    aria-label="Related Entries"
                    data-testid="codex-related-entries"
                  >
                    <h3 className="codex-related-title font-mono">Related Entries</h3>
                    <div className="codex-related-chips">
                      {relatedEntries.map((related) => (
                        <button
                          key={related.id}
                          type="button"
                          className="codex-related-chip font-ui"
                          onClick={() => handleNavigateToEntry(related)}
                          data-testid={`codex-related-chip-${related.id}`}
                        >
                          <span className="codex-related-chip-icon" aria-hidden="true">
                            ✦
                          </span>
                          <span>{related.title}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <p className="codex-empty-message font-ui">No lore entries available.</p>
            )}
          </article>
        </div>
      </div>
    </div>
  );
}
