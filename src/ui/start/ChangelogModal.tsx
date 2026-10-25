import { useEffect, useMemo } from 'react';
import { parseChangelog } from './changelogParser';
import defaultChangelogRaw from '../../../CHANGELOG.md?raw';
import './ChangelogModal.css';

export interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  changelogRaw?: string;
}

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="changelog-highlight">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function ChangelogModal({
  isOpen,
  onClose,
  changelogRaw = defaultChangelogRaw
}: ChangelogModalProps) {
  const releases = useMemo(() => parseChangelog(changelogRaw), [changelogRaw]);

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

  if (!isOpen) return null;

  return (
    <div
      className="changelog-modal-overlay"
      onClick={onClose}
      data-testid="changelog-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Release Notes"
    >
      <div
        className="changelog-modal-panel"
        onClick={(e) => e.stopPropagation()}
        data-testid="changelog-modal-panel"
      >
        <header className="changelog-modal-header">
          <div className="changelog-header-title-group">
            <span className="changelog-header-emblem">📜</span>
            <div className="changelog-header-text">
              <h2 className="changelog-modal-title font-ui">Release Notes</h2>
              <span className="changelog-modal-subtitle font-mono">Astral Tactics Updates &amp; Balance</span>
            </div>
          </div>
          <button
            type="button"
            className="changelog-close-btn font-ui"
            onClick={onClose}
            aria-label="Close Release Notes"
            data-testid="changelog-close-btn"
          >
            ✖
          </button>
        </header>

        <div className="changelog-modal-content">
          {releases.length === 0 ? (
            <p className="changelog-empty-message font-ui">No release notes available.</p>
          ) : (
            releases.map((release) => (
              <section key={release.version} className="changelog-release-block">
                <div className="changelog-release-header">
                  <span className="changelog-version-tag font-mono">v{release.version}</span>
                  {release.date && (
                    <span className="changelog-release-date font-mono">{release.date}</span>
                  )}
                </div>

                <div className="changelog-sections-list">
                  {release.sections.map((section, sIdx) => (
                    <div key={sIdx} className="changelog-section-card">
                      <h3 className="changelog-section-title font-ui">{section.title}</h3>
                      <ul className="changelog-items-list font-ui">
                        {section.items.map((item, iIdx) => (
                          <li key={iIdx} className="changelog-item">
                            {renderFormattedText(item)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="changelog-modal-footer">
          <button
            type="button"
            className="changelog-btn-primary font-ui"
            onClick={onClose}
            data-testid="changelog-footer-close-btn"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
