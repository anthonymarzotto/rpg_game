import { useState, useCallback, useEffect } from 'react';
import { CombatArena } from './ui/combat/CombatArena';
import { StartScreen } from './ui/start/StartScreen';
import { CampHub } from './ui/camp/CampHub';
import { createCampaign } from './core/campaign/campaignFactory';
import {
  resolveCampaignVictory,
  resolveCampaignDefeat,
  syncEncounterPlayerUnits,
  CampaignBattleResult
} from './core/campaign/transitions';
import { CampaignState } from './core/campaign/types';
import { CombatState, InBattleXp } from './core/combat/types';
import {
  saveCampaignSlot,
  loadCampaignSlot,
  deleteCampaignSlot,
  getSlotSummaries,
  getFirstOpenSlot
} from './core/storage/saveManager';
import {
  triggerSaveDownload,
  importCampaignJson
} from './core/storage/exportImport';
import { SaveSlotId, SlotSummary } from './core/storage/types';
import './App.css';

export type AppView = 'START' | 'CAMP' | 'ARENA' | 'DEV_SANDBOX';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('START');
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<SaveSlotId | null>(null);
  const [slotSummaries, setSlotSummaries] = useState<readonly SlotSummary[]>([]);
  const [isDevMenuOpen, setIsDevMenuOpen] = useState<boolean>(false);

  // Refresh slot metadata summaries from storage
  const refreshSlots = useCallback(async () => {
    try {
      const summaries = await getSlotSummaries();
      setSlotSummaries(summaries);
    } catch {
      // Storage unavailable or blocked
    }
  }, []);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  // Start Screen Actions
  const handleNewGame = useCallback(async () => {
    const targetSlot = await getFirstOpenSlot();
    if (!targetSlot) {
      return; // All slots full
    }

    const fresh = createCampaign();
    await saveCampaignSlot(targetSlot, fresh);
    setActiveSlotId(targetSlot);
    setCampaignState(fresh);
    setCurrentView('CAMP');
    await refreshSlots();
  }, [refreshSlots]);

  const handleStartNewSlot = useCallback(
    async (slotId: SaveSlotId) => {
      const fresh = createCampaign();
      await saveCampaignSlot(slotId, fresh);
      setActiveSlotId(slotId);
      setCampaignState(fresh);
      setCurrentView('CAMP');
      await refreshSlots();
    },
    [refreshSlots]
  );

  const handleResumeSlot = useCallback(
    async (slotId: SaveSlotId) => {
      const loaded = await loadCampaignSlot(slotId);
      if (loaded) {
        setActiveSlotId(slotId);
        setCampaignState(loaded);
        setCurrentView('CAMP');
      }
    },
    []
  );

  const handleDeleteSlot = useCallback(
    async (slotId: SaveSlotId) => {
      await deleteCampaignSlot(slotId);
      if (activeSlotId === slotId) {
        setActiveSlotId(null);
        setCampaignState(null);
      }
      await refreshSlots();
    },
    [activeSlotId, refreshSlots]
  );

  const handleExportSlot = useCallback(async (slotId: SaveSlotId) => {
    const campaign = await loadCampaignSlot(slotId);
    if (campaign) {
      triggerSaveDownload(slotId, campaign);
    }
  }, []);

  const handleImportJson = useCallback(
    async (slotId: SaveSlotId, jsonString: string): Promise<boolean | string> => {
      const result = importCampaignJson(jsonString, slotId);
      if (!result.success) {
        return result.error;
      }

      await saveCampaignSlot(slotId, result.envelope.campaign);
      await refreshSlots();
      return true;
    },
    [refreshSlots]
  );

  // Camp Hub Actions
  const handleDeploySquad = useCallback(() => {
    setCurrentView('ARENA');
  }, []);

  const handleExitToTitle = useCallback(async () => {
    setCurrentView('START');
    await refreshSlots();
  }, [refreshSlots]);

  const handleSaveCampaign = useCallback(async () => {
    if (!campaignState) return;
    const targetSlot = activeSlotId ?? (await getFirstOpenSlot()) ?? 'slot-1';
    await saveCampaignSlot(targetSlot, campaignState);
    if (!activeSlotId) {
      setActiveSlotId(targetSlot);
    }
    await refreshSlots();
  }, [activeSlotId, campaignState, refreshSlots]);

  // Combat Reconciliation Actions
  const handleCombatVictory = useCallback(
    (result: { state: CombatState }) => {
      if (!campaignState) {
        setCurrentView('CAMP');
        return;
      }
      const unitXpGains: Record<string, InBattleXp> = {};
      for (const [unitId, combatUnit] of result.state.units) {
        if (combatUnit.unit.faction === 'PLAYER') {
          unitXpGains[unitId] = combatUnit.inBattleXp;
        }
      }
      const battleResult: CampaignBattleResult = {
        encounterId: campaignState.currentEncounter?.id ?? `stage-${campaignState.stage}`,
        encounterName: campaignState.currentEncounter?.name ?? `Stage ${campaignState.stage}`,
        outcome: 'VICTORY',
        unitXpGains
      };
      const nextCampaign = resolveCampaignVictory(campaignState, battleResult);
      setCampaignState(nextCampaign);
      setCurrentView('CAMP');
    },
    [campaignState]
  );

  const handleCombatDefeat = useCallback(
    (result: { state: CombatState }) => {
      if (!campaignState) {
        setCurrentView('CAMP');
        return;
      }
      const unitXpGains: Record<string, InBattleXp> = {};
      for (const [unitId, combatUnit] of result.state.units) {
        if (combatUnit.unit.faction === 'PLAYER') {
          unitXpGains[unitId] = combatUnit.inBattleXp;
        }
      }
      const battleResult: CampaignBattleResult = {
        encounterId: campaignState.currentEncounter?.id ?? `stage-${campaignState.stage}`,
        encounterName: campaignState.currentEncounter?.name ?? `Stage ${campaignState.stage}`,
        outcome: 'DEFEAT',
        unitXpGains
      };
      const nextCampaign = resolveCampaignDefeat(campaignState, battleResult);
      setCampaignState(nextCampaign);
      setCurrentView('CAMP');
    },
    [campaignState]
  );

  const isAllSlotsFull =
    slotSummaries.length > 0 && slotSummaries.every((s) => !s.isEmpty);

  return (
    <div className="app-root">
      {/* Discreet floating developer controls */}
      <div className="app-dev-controls">
        <button
          type="button"
          className="app-dev-toggle-btn font-mono"
          onClick={() => setIsDevMenuOpen((prev) => !prev)}
          data-testid="app-dev-toggle-btn"
          title="Toggle Developer & Sandbox Modes"
        >
          🛠️ Dev Modes ▾
        </button>

        {isDevMenuOpen && (
          <div className="app-dev-menu" data-testid="app-dev-menu">
            <button
              type="button"
              className={`app-dev-menu-item ${currentView === 'START' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('START');
                setIsDevMenuOpen(false);
              }}
            >
              🏠 Portal
            </button>
            <button
              type="button"
              className={`app-dev-menu-item ${currentView === 'CAMP' ? 'active' : ''}`}
              onClick={() => {
                if (!campaignState) {
                  setCampaignState(createCampaign());
                }
                setCurrentView('CAMP');
                setIsDevMenuOpen(false);
              }}
            >
              ⛺ Astral Hub
            </button>
            <button
              type="button"
              className={`app-dev-menu-item ${currentView === 'DEV_SANDBOX' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('DEV_SANDBOX');
                setIsDevMenuOpen(false);
              }}
            >
              ⚔️ Astral Trial
            </button>
          </div>
        )}
      </div>

      {/* Dev Mode Banner when in isolated sandbox views */}
      {currentView === 'DEV_SANDBOX' && (
        <div className="app-dev-banner font-ui">
          <span>🛠️ Developer Mode: Standalone Astral Trial</span>
          <button
            type="button"
            className="app-dev-back-btn"
            onClick={() => setCurrentView(campaignState ? 'CAMP' : 'START')}
          >
            ← Exit Dev Mode
          </button>
        </div>
      )}

      {/* Main Viewport */}
      <div className="app-viewport">
        {currentView === 'START' && (
          <StartScreen
            onNewGame={handleNewGame}
            canContinue={Boolean(campaignState) || slotSummaries.some((s) => !s.isEmpty && !s.isCorrupted)}
            isFull={isAllSlotsFull}
            slotSummaries={slotSummaries}
            onResumeSlot={handleResumeSlot}
            onStartNewSlot={handleStartNewSlot}
            onDeleteSlot={handleDeleteSlot}
            onExportSlot={handleExportSlot}
            onImportJson={handleImportJson}
          />
        )}

        {currentView === 'CAMP' && campaignState && (
          <CampHub
            campaign={campaignState}
            onDeploySquad={handleDeploySquad}
            onUpdateCampaign={setCampaignState}
            onExitToTitle={handleExitToTitle}
            onSaveCampaign={handleSaveCampaign}
          />
        )}

        {currentView === 'ARENA' && campaignState && (
          <CombatArena
            key={`campaign-${campaignState.currentEncounter?.id ?? campaignState.stage}-${campaignState.updatedAt}`}
            encounter={
              campaignState.currentEncounter
                ? syncEncounterPlayerUnits(campaignState.currentEncounter, campaignState.roster)
                : undefined
            }
            onVictory={handleCombatVictory}
            onDefeat={handleCombatDefeat}
            onExit={() => setCurrentView('CAMP')}
          />
        )}

        {currentView === 'DEV_SANDBOX' && (
          <CombatArena
            key="dev-sandbox"
            onExit={() => setCurrentView(campaignState ? 'CAMP' : 'START')}
          />
        )}
      </div>
    </div>
  );
}
