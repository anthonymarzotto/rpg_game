import { useState, useMemo } from 'react';
import { CombatState } from '../../core/combat/types';
import { generateTrialMarkdownReport } from '../../core/combat/reportGenerator';
import { exportTrialJson } from '../../core/combat/stateSerializer';
import './TrialExportModal.css';

export interface TrialExportModalProps {
  readonly isOpen: boolean;
  readonly state: CombatState;
  readonly encounterName?: string;
  readonly stage?: number;
  readonly error?: Error | string;
  readonly onClose: () => void;
}

type ExportTab = 'MARKDOWN' | 'JSON';

export function TrialExportModal({
  isOpen,
  state,
  encounterName,
  stage,
  error,
  onClose
}: TrialExportModalProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>('MARKDOWN');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const markdownReport = useMemo(() => {
    return generateTrialMarkdownReport(state, {
      encounterName,
      stage,
      error
    });
  }, [state, encounterName, stage, error]);

  const jsonPayload = useMemo(() => {
    try {
      return exportTrialJson(state);
    } catch {
      return JSON.stringify({ error: 'Failed to serialize state' });
    }
  }, [state]);

  if (!isOpen) return null;

  const handleCopy = async (text: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure / test environments
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopyFeedback(`Copied ${label}!`);
      setTimeout(() => setCopyFeedback(null), 2500);
    } catch (err) {
      console.warn('Failed to copy text:', err);
      setCopyFeedback('Failed to copy');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleDownloadJson = () => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;
    const blob = new Blob([jsonPayload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trial_export_turn${state.turnNumber}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const livingUnitsCount = Array.from(state.units.values()).filter((u) => !u.isDefeated).length;
  const faultCount = state.combatLog.filter(
    (e) => e.actionId === 'ai_fault' || e.message.includes('[AI Fault]')
  ).length;

  return (
    <div className="trial-export-backdrop" onClick={onClose} data-testid="trial-export-backdrop">
      <div
        className="trial-export-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-export-title"
      >
        {/* Header */}
        <div className="trial-export-header">
          <div className="trial-export-title-block">
            <span className="trial-export-badge">🛠️ Diagnostics</span>
            <h2 id="trial-export-title">Export Trial Telemetry</h2>
          </div>
          <button
            type="button"
            className="trial-export-close-btn"
            onClick={onClose}
            aria-label="Close export dialog"
            data-testid="trial-export-close-x"
          >
            ✕
          </button>
        </div>

        {/* Quick Stats Pills */}
        <div className="trial-export-stats-row">
          <span className="stat-pill">Turn: {state.turnNumber}</span>
          <span className="stat-pill">Units: {livingUnitsCount}/{state.units.size}</span>
          <span className="stat-pill">AI Decisions: {state.aiDecisionLog?.length ?? 0}</span>
          {faultCount > 0 ? (
            <span className="stat-pill fault-pill">⚠️ {faultCount} Action Faults</span>
          ) : (
            <span className="stat-pill clean-pill">✓ No Action Faults</span>
          )}
          {error && <span className="stat-pill crash-pill">🚨 Runtime Crash Captured</span>}
        </div>

        {/* Tab Controls */}
        <div className="trial-export-tabs">
          <button
            type="button"
            className={`trial-export-tab ${activeTab === 'MARKDOWN' ? 'active' : ''}`}
            onClick={() => setActiveTab('MARKDOWN')}
            data-testid="tab-markdown"
          >
            📋 Markdown Summary (For Chat)
          </button>
          <button
            type="button"
            className={`trial-export-tab ${activeTab === 'JSON' ? 'active' : ''}`}
            onClick={() => setActiveTab('JSON')}
            data-testid="tab-json"
          >
            💾 Raw State JSON
          </button>
        </div>

        {/* Tab Content & Action Bar */}
        <div className="trial-export-content">
          <div className="trial-export-actions-bar">
            {activeTab === 'MARKDOWN' ? (
              <button
                type="button"
                className="btn-export-action primary"
                onClick={() => handleCopy(markdownReport, 'Markdown Report')}
                data-testid="btn-copy-markdown"
              >
                📋 Copy Markdown Report
              </button>
            ) : (
              <div className="json-actions-group">
                <button
                  type="button"
                  className="btn-export-action primary"
                  onClick={handleDownloadJson}
                  data-testid="btn-download-json"
                >
                  💾 Download JSON File
                </button>
                <button
                  type="button"
                  className="btn-export-action secondary"
                  onClick={() => handleCopy(jsonPayload, 'JSON Payload')}
                  data-testid="btn-copy-json"
                >
                  📋 Copy JSON
                </button>
              </div>
            )}

            {copyFeedback && (
              <span className="copy-feedback-badge" data-testid="copy-feedback">
                ✅ {copyFeedback}
              </span>
            )}
          </div>

          <textarea
            className="trial-export-preview font-mono"
            readOnly
            value={activeTab === 'MARKDOWN' ? markdownReport : jsonPayload}
            data-testid="trial-export-textarea"
            aria-label="Export Preview"
          />
        </div>

        {/* Footer */}
        <div className="trial-export-footer">
          <span className="export-hint">
            Tip: Paste the Markdown report directly into chat with the AI assistant for immediate diagnosis.
          </span>
          <button
            type="button"
            className="btn-export-close"
            onClick={onClose}
            data-testid="btn-export-close"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
