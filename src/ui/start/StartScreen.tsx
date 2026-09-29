import packageJson from '../../../package.json';
import './StartScreen.css';

export interface StartScreenProps {
  readonly onNewGame: () => void;
  readonly onContinue?: () => void;
  readonly canContinue?: boolean;
}

export function StartScreen({
  onNewGame,
  onContinue,
  canContinue = false
}: StartScreenProps) {
  return (
    <div className="start-screen-container" data-testid="start-screen">
      <div className="start-screen-card glass-panel">
        <header className="start-screen-header">
          <div className="start-screen-emblem">✦</div>
          <h1 className="start-screen-title font-display">ASTRAL TACTICS</h1>
          <p className="start-screen-subtitle">Tactical RPG Campaign & Class Constellation</p>
        </header>

        <div className="start-screen-actions">
          <button
            type="button"
            className="start-screen-btn primary-btn font-ui"
            onClick={onNewGame}
            data-testid="start-new-game-btn"
          >
            ⚔️ New Expedition
          </button>

          <div className="start-screen-continue-group">
            <button
              type="button"
              className="start-screen-btn secondary-btn font-ui"
              onClick={onContinue}
              disabled={!canContinue}
              aria-disabled={!canContinue}
              data-testid="start-continue-btn"
            >
              ✦ Continue Run
            </button>
          </div>
        </div>

        <footer className="start-screen-footer">
          <span className="start-screen-version font-mono">v{packageJson.version}</span>
        </footer>
      </div>
    </div>
  );
}
