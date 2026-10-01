import { useState, useCallback } from 'react';
import { SaveSlotId, SlotSummary } from '../../core/storage/types';
import { SaveSlotDrawer } from './SaveSlotDrawer';
import packageJson from '../../../package.json';
import './StartScreen.css';

export interface StartScreenProps {
  readonly onNewGame: () => void;
  readonly onContinue?: () => void;
  readonly canContinue?: boolean;
  readonly isFull?: boolean;
  readonly slotSummaries?: readonly SlotSummary[];
  readonly onResumeSlot?: (slotId: SaveSlotId) => void;
  readonly onStartNewSlot?: (slotId: SaveSlotId) => void;
  readonly onDeleteSlot?: (slotId: SaveSlotId) => void;
  readonly onExportSlot?: (slotId: SaveSlotId) => void;
  readonly onImportJson?: (slotId: SaveSlotId, jsonString: string) => Promise<boolean | string>;
}

export function StartScreen({
  onNewGame,
  onContinue,
  canContinue = false,
  isFull = false,
  slotSummaries,
  onResumeSlot,
  onStartNewSlot,
  onDeleteSlot,
  onExportSlot,
  onImportJson
}: StartScreenProps) {
  const [isArchivesOpen, setIsArchivesOpen] = useState(false);

  const hasOccupiedSlots = slotSummaries
    ? slotSummaries.some((s) => !s.isEmpty && !s.isCorrupted)
    : canContinue;

  const handleContinueClick = useCallback(() => {
    if (slotSummaries && slotSummaries.length > 0) {
      setIsArchivesOpen(true);
    } else if (onContinue) {
      onContinue();
    }
  }, [slotSummaries, onContinue]);

  const handleResumeSlotFromDrawer = useCallback(
    (slotId: SaveSlotId) => {
      setIsArchivesOpen(false);
      if (onResumeSlot) {
        onResumeSlot(slotId);
      } else if (onContinue) {
        onContinue();
      }
    },
    [onResumeSlot, onContinue]
  );

  const handleStartNewSlotFromDrawer = useCallback(
    (slotId: SaveSlotId) => {
      setIsArchivesOpen(false);
      if (onStartNewSlot) {
        onStartNewSlot(slotId);
      } else {
        onNewGame();
      }
    },
    [onStartNewSlot, onNewGame]
  );

  return (
    <div className="start-screen-container" data-testid="start-screen">
      <div className="start-screen-card glass-panel">
        <header className="start-screen-header">
          <div className="start-screen-emblem">✦</div>
          <h1 className="start-screen-title font-display">ASTRAL TACTICS</h1>
        </header>

        <div className="start-screen-actions">
          {isFull && (
            <div className="start-screen-full-warning font-ui" data-testid="start-screen-full-warning">
              ⚠️ All 3 Expedition Vessels Bound. Manage archives to clear a slot.
            </div>
          )}

          <button
            type="button"
            className="start-screen-btn primary-btn font-ui"
            onClick={onNewGame}
            disabled={isFull}
            aria-disabled={isFull}
            data-testid="start-new-game-btn"
          >
            ✦ New Astral Expedition
          </button>

          <div className="start-screen-continue-group">
            <button
              type="button"
              className="start-screen-btn secondary-btn font-ui"
              onClick={handleContinueClick}
              disabled={!hasOccupiedSlots}
              aria-disabled={!hasOccupiedSlots}
              data-testid="start-continue-btn"
            >
              ✦ Resume Expedition
            </button>
          </div>

          {slotSummaries && slotSummaries.length > 0 && (
            <button
              type="button"
              className="start-screen-archives-btn font-ui"
              onClick={() => setIsArchivesOpen(true)}
              data-testid="start-manage-archives-btn"
            >
              ✦ Manage Archives &amp; Slots
            </button>
          )}
        </div>

        <footer className="start-screen-footer">
          <span className="start-screen-version font-mono">v{packageJson.version}</span>
        </footer>
      </div>

      {slotSummaries && (
        <SaveSlotDrawer
          isOpen={isArchivesOpen}
          slotSummaries={slotSummaries}
          onClose={() => setIsArchivesOpen(false)}
          onResumeSlot={handleResumeSlotFromDrawer}
          onStartNewSlot={handleStartNewSlotFromDrawer}
          onDeleteSlot={onDeleteSlot ?? (() => {})}
          onExportSlot={onExportSlot ?? (() => {})}
          onImportJson={onImportJson ?? (async () => false)}
        />
      )}
    </div>
  );
}
