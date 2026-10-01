import { useState, useRef, useCallback } from 'react';
import { SaveSlotId, SlotSummary } from '../../core/storage/types';
import './SaveSlotDrawer.css';

export interface SaveSlotDrawerProps {
  readonly isOpen: boolean;
  readonly slotSummaries: readonly SlotSummary[];
  readonly onClose: () => void;
  readonly onResumeSlot: (slotId: SaveSlotId) => void;
  readonly onStartNewSlot?: (slotId: SaveSlotId) => void;
  readonly onDeleteSlot: (slotId: SaveSlotId) => void;
  readonly onExportSlot: (slotId: SaveSlotId) => void;
  readonly onImportJson: (slotId: SaveSlotId, jsonString: string) => Promise<boolean | string>;
}

export function SaveSlotDrawer({
  isOpen,
  slotSummaries,
  onClose,
  onResumeSlot,
  onStartNewSlot,
  onDeleteSlot,
  onExportSlot,
  onImportJson
}: SaveSlotDrawerProps) {
  const [confirmDeleteSlotId, setConfirmDeleteSlotId] = useState<SaveSlotId | null>(null);
  const [importTargetSlotId, setImportTargetSlotId] = useState<SaveSlotId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleTriggerImport = useCallback((slotId: SaveSlotId) => {
    setErrorMessage(null);
    setImportTargetSlotId(slotId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !importTargetSlotId) return;

      try {
        const text = await file.text();
        const result = await onImportJson(importTargetSlotId, text);
        if (typeof result === 'string') {
          setErrorMessage(result);
        } else if (!result) {
          setErrorMessage('Failed to import save file.');
        } else {
          setErrorMessage(null);
        }
      } catch {
        setErrorMessage('Error reading save file.');
      }
    },
    [importTargetSlotId, onImportJson]
  );

  if (!isOpen) return null;

  return (
    <div className="save-drawer-overlay" data-testid="save-slot-drawer">
      <div className="save-drawer-panel glass-panel">
        <header className="save-drawer-header">
          <div className="save-drawer-title-group">
            <span className="save-drawer-emblem">✦</span>
            <h2 className="save-drawer-title font-display">EXPEDITION ARCHIVES</h2>
          </div>
          <button
            type="button"
            className="save-drawer-close-btn font-mono"
            onClick={onClose}
            aria-label="Close Archives"
            data-testid="save-drawer-close-btn"
          >
            ✕
          </button>
        </header>

        <p className="save-drawer-subtitle font-ui">
          Manage your journeys across the cosmos. Select an expedition to resume, or export/import backup archives.
        </p>

        {errorMessage && (
          <div className="save-drawer-error font-ui" data-testid="save-drawer-error">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Hidden file input for import */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json,application/json"
          onChange={handleFileChange}
          data-testid="save-import-input"
        />

        <div className="save-slot-list">
          {slotSummaries.map((slot) => {
            const isConfirmingDelete = confirmDeleteSlotId === slot.slotId;

            return (
              <div
                key={slot.slotId}
                className={`save-slot-card ${slot.isEmpty ? 'empty' : 'occupied'} ${slot.isCorrupted ? 'corrupted' : ''}`}
                data-testid={`save-slot-${slot.slotId}`}
              >
                <div className="save-slot-info">
                  <div className="save-slot-header-line">
                    <span className="save-slot-badge font-mono">{slot.label}</span>
                    {!slot.isEmpty && !slot.isCorrupted && slot.stage && (
                      <span className="save-slot-stage font-ui">Sector {slot.stage}</span>
                    )}
                  </div>

                  {slot.isEmpty ? (
                    <div className="save-slot-empty-label font-ui">
                      ✦ Empty Astral Void
                    </div>
                  ) : slot.isCorrupted ? (
                    <div className="save-slot-corrupted-label font-ui">
                      ⚠️ Incompatible Save Version
                      <span className="save-slot-subtext font-mono">
                        Clear slot to reclaim this vessel.
                      </span>
                    </div>
                  ) : (
                    <div className="save-slot-details">
                      <div className="save-slot-name font-display">{slot.campaignName}</div>
                      <div className="save-slot-meta font-mono">
                        <span>{slot.rosterCount} Heroes</span>
                        <span>•</span>
                        <span>{slot.victories} Triumphs / {slot.defeats} Eclipses</span>
                      </div>
                      {slot.savedAt && (
                        <div className="save-slot-timestamp font-mono">
                          Saved: {new Date(slot.savedAt).toLocaleDateString()} {new Date(slot.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="save-slot-actions">
                  {slot.isEmpty ? (
                    <>
                      {onStartNewSlot && (
                        <button
                          type="button"
                          className="save-slot-btn primary font-ui"
                          onClick={() => onStartNewSlot(slot.slotId)}
                          data-testid={`slot-new-btn-${slot.slotId}`}
                        >
                          ✦ Start New
                        </button>
                      )}
                      <button
                        type="button"
                        className="save-slot-btn secondary font-ui"
                        onClick={() => handleTriggerImport(slot.slotId)}
                        data-testid={`slot-import-btn-${slot.slotId}`}
                        title="Import JSON save into this slot"
                      >
                        📥 Import JSON
                      </button>
                    </>
                  ) : slot.isCorrupted ? (
                    <button
                      type="button"
                      className="save-slot-btn danger font-ui"
                      onClick={() => onDeleteSlot(slot.slotId)}
                      data-testid={`slot-clear-btn-${slot.slotId}`}
                    >
                      ✖ Reset Slot
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="save-slot-btn primary font-ui"
                        onClick={() => onResumeSlot(slot.slotId)}
                        data-testid={`slot-resume-btn-${slot.slotId}`}
                      >
                        ✦ Resume
                      </button>

                      <button
                        type="button"
                        className="save-slot-btn secondary font-ui"
                        onClick={() => onExportSlot(slot.slotId)}
                        data-testid={`slot-export-btn-${slot.slotId}`}
                        title="Download save as JSON file"
                      >
                        📤 Export
                      </button>

                      {isConfirmingDelete ? (
                        <div className="save-slot-delete-confirm">
                          <button
                            type="button"
                            className="save-slot-btn danger font-ui"
                            onClick={() => {
                              onDeleteSlot(slot.slotId);
                              setConfirmDeleteSlotId(null);
                            }}
                            data-testid={`slot-delete-confirm-btn-${slot.slotId}`}
                          >
                            Confirm?
                          </button>
                          <button
                            type="button"
                            className="save-slot-btn cancel font-ui"
                            onClick={() => setConfirmDeleteSlotId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="save-slot-btn icon-danger font-ui"
                          onClick={() => setConfirmDeleteSlotId(slot.slotId)}
                          data-testid={`slot-delete-btn-${slot.slotId}`}
                          title="Delete this expedition"
                        >
                          ✖
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
