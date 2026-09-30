import { useState, useCallback } from 'react';
import { ConstellationChart } from './ui/ConstellationChart';
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
import './App.css';

export type AppView = 'START' | 'CAMP' | 'ARENA' | 'DEV_SANDBOX' | 'DEV_CONSTELLATION';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('START');
  const [campaignState, setCampaignState] = useState<CampaignState | null>(null);
  const [isDevMenuOpen, setIsDevMenuOpen] = useState<boolean>(false);

  // Start Screen Actions
  const handleNewGame = useCallback(() => {
    const fresh = createCampaign();
    setCampaignState(fresh);
    setCurrentView('CAMP');
  }, []);

  const handleContinue = useCallback(() => {
    if (campaignState) {
      setCurrentView('CAMP');
    }
  }, [campaignState]);

  // Camp Hub Actions
  const handleDeploySquad = useCallback(() => {
    setCurrentView('ARENA');
  }, []);

  const handleExitToTitle = useCallback(() => {
    setCurrentView('START');
  }, []);

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
            <button
              type="button"
              className={`app-dev-menu-item ${currentView === 'DEV_CONSTELLATION' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('DEV_CONSTELLATION');
                setIsDevMenuOpen(false);
              }}
            >
              ✦ Stellar Constellation Chart
            </button>
          </div>
        )}
      </div>

      {/* Dev Mode Banner when in isolated sandbox views */}
      {(currentView === 'DEV_SANDBOX' || currentView === 'DEV_CONSTELLATION') && (
        <div className="app-dev-banner font-ui">
          <span>
            {currentView === 'DEV_SANDBOX'
              ? '🛠️ Developer Mode: Standalone Astral Trial'
              : '🛠️ Developer Mode: Standalone Constellation Lattice'}
          </span>
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
            onContinue={handleContinue}
            canContinue={Boolean(campaignState)}
          />
        )}

        {currentView === 'CAMP' && campaignState && (
          <CampHub
            campaign={campaignState}
            onDeploySquad={handleDeploySquad}
            onUpdateCampaign={setCampaignState}
            onExitToTitle={handleExitToTitle}
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

        {currentView === 'DEV_CONSTELLATION' && <ConstellationChart />}
      </div>
    </div>
  );
}
