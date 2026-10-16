import React, { Component, ErrorInfo } from 'react';
import { CombatState } from '../../core/combat/types';
import { generateTrialMarkdownReport } from '../../core/combat/reportGenerator';
import { exportTrialJson } from '../../core/combat/stateSerializer';
import './TrialErrorBoundary.css';

export interface TrialErrorBoundaryProps {
  readonly children: React.ReactNode;
  readonly state?: CombatState;
  readonly encounterName?: string;
  readonly stage?: number;
  readonly onReset?: () => void;
}

export interface TrialErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
  readonly copyFeedback: string | null;
}

export class TrialErrorBoundary extends Component<
  TrialErrorBoundaryProps,
  TrialErrorBoundaryState
> {
  constructor(props: TrialErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      copyFeedback: null
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<TrialErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[TrialErrorBoundary] Uncaught combat error:', error, errorInfo);
  }

  private handleCopyCrashReport = async (): Promise<void> => {
    const { state, encounterName, stage } = this.props;
    const { error } = this.state;

    let report = '';
    if (state) {
      report = generateTrialMarkdownReport(state, {
        encounterName,
        stage,
        error: error ?? 'Unknown crash'
      });
    } else {
      report = `# Astral Tactics — Crash Report\n**Error:** ${error?.message}\n\`\`\`\n${error?.stack}\n\`\`\``;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(report);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = report;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      this.setState({ copyFeedback: 'Copied Crash Report!' });
      setTimeout(() => this.setState({ copyFeedback: null }), 2500);
    } catch {
      this.setState({ copyFeedback: 'Failed to copy' });
      setTimeout(() => this.setState({ copyFeedback: null }), 2500);
    }
  };

  private handleDownloadCrashJson = (): void => {
    const { state } = this.props;
    if (!state || typeof document === 'undefined' || typeof URL === 'undefined') return;

    try {
      const jsonPayload = exportTrialJson(state);
      const blob = new Blob([jsonPayload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crash_trial_state_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Failed to export crash json:', e);
    }
  };

  public render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, copyFeedback } = this.state;
    const { onReset, state } = this.props;

    return (
      <div className="trial-error-fallback" data-testid="trial-error-fallback">
        <div className="trial-error-card">
          <div className="trial-error-badge">🚨 Combat Exception</div>
          <h2>Trial Interrupted by Error</h2>
          <p className="trial-error-subtitle">
            An unexpected error occurred during combat simulation. You can export the state below
            and paste it into chat to diagnose and fix the cause.
          </p>

          <div className="trial-error-details">
            <span className="error-message font-mono">
              {error?.message ?? 'Unknown runtime error'}
            </span>
            {error?.stack && (
              <pre className="error-stack font-mono">
                {error.stack}
              </pre>
            )}
          </div>

          <div className="trial-error-actions">
            <button
              type="button"
              className="btn-error-action primary"
              onClick={this.handleCopyCrashReport}
              data-testid="btn-copy-crash-report"
            >
              📋 Copy Crash Report & State
            </button>

            {state && (
              <button
                type="button"
                className="btn-error-action secondary"
                onClick={this.handleDownloadCrashJson}
                data-testid="btn-download-crash-json"
              >
                💾 Download State JSON
              </button>
            )}

            {onReset && (
              <button
                type="button"
                className="btn-error-action retry"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  onReset();
                }}
                data-testid="btn-reset-crash"
              >
                ↺ Reset Trial
              </button>
            )}
          </div>

          {copyFeedback && (
            <div className="crash-copy-feedback" data-testid="crash-copy-feedback">
              ✅ {copyFeedback}
            </div>
          )}
        </div>
      </div>
    );
  }
}
