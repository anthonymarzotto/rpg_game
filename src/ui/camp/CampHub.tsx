import { useState, useMemo, useCallback } from 'react';
import { CampaignState } from '../../core/campaign/types';
import { Unit } from '../../core/types/unit';
import { setCampActiveSquad, recruitNovice } from '../../core/campaign/transitions';
import { ActiveSquadDock } from './ActiveSquadDock';
import { ExpeditionWarRoom } from './ExpeditionWarRoom';
import { ReserveBarracksTray } from './ReserveBarracksTray';
import { HeroProgressionDrawer } from './HeroProgressionDrawer';
import './CampHub.css';

export interface CampHubProps {
  readonly campaign: CampaignState;
  readonly onDeploySquad: () => void;
  readonly onUpdateCampaign: (nextState: CampaignState) => void;
  readonly onExitToTitle?: () => void;
  readonly onSaveCampaign?: () => Promise<void> | void;
}

export function CampHub({
  campaign,
  onDeploySquad,
  onUpdateCampaign,
  onExitToTitle,
  onSaveCampaign
}: CampHubProps) {
  const [swappingHeroId, setSwappingHeroId] = useState<string | null>(null);
  const [inspectingHeroId, setInspectingHeroId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleSave = useCallback(async () => {
    if (!onSaveCampaign || saveStatus === 'saving') return;
    setSaveStatus('saving');
    try {
      await onSaveCampaign();
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch {
      setSaveStatus('idle');
    }
  }, [onSaveCampaign, saveStatus]);

  // Active squad units in deployment order
  const activeSquad = useMemo(() => {
    return campaign.activeSquadIds
      .map((id) => campaign.roster.find((u) => u.id === id))
      .filter((u): u is Unit => Boolean(u));
  }, [campaign.activeSquadIds, campaign.roster]);

  // Reserve units not in the active squad
  const reserveHeroes = useMemo(() => {
    return campaign.roster.filter((u) => !campaign.activeSquadIds.includes(u.id));
  }, [campaign.activeSquadIds, campaign.roster]);

  // Swapping hero name for guidance banner
  const swappingHeroName = swappingHeroId
    ? campaign.roster.find((u) => u.id === swappingHeroId)?.name ?? null
    : null;

  // The hero currently inspected in the progression drawer
  const inspectingHero = inspectingHeroId
    ? campaign.roster.find((u) => u.id === inspectingHeroId) ?? null
    : null;

  // Bench a hero from active squad to reserve
  const handleBenchHero = useCallback((unitId: string) => {
    if (campaign.activeSquadIds.length <= 1) return;
    const nextSquadIds = campaign.activeSquadIds.filter((id) => id !== unitId);
    const updated = setCampActiveSquad(campaign, nextSquadIds);
    onUpdateCampaign(updated);
    if (swappingHeroId === unitId) {
      setSwappingHeroId(null);
    }
  }, [campaign, swappingHeroId, onUpdateCampaign]);

  // Deploy a reserve hero into next empty active slot
  const handleDeployHero = useCallback((unitId: string) => {
    if (campaign.activeSquadIds.length >= 3) return;
    const nextSquadIds = [...campaign.activeSquadIds, unitId];
    const updated = setCampActiveSquad(campaign, nextSquadIds);
    onUpdateCampaign(updated);
  }, [campaign, onUpdateCampaign]);

  // Toggle swap mode on an active slot
  const handleToggleSwapHero = useCallback((unitId: string) => {
    setSwappingHeroId((prev) => (prev === unitId ? null : unitId));
  }, []);

  // Replace the swapping slot with the selected reserve hero
  const handleSelectForSwap = useCallback((incomingUnitId: string) => {
    if (!swappingHeroId) return;
    const nextSquadIds = campaign.activeSquadIds.map((id) =>
      id === swappingHeroId ? incomingUnitId : id
    );
    const updated = setCampActiveSquad(campaign, nextSquadIds);
    onUpdateCampaign(updated);
    setSwappingHeroId(null);
  }, [campaign, swappingHeroId, onUpdateCampaign]);

  // Recruit a new Level-0 Novice into the campaign
  const handleRecruitNovice = useCallback(() => {
    const updated = recruitNovice(campaign);
    onUpdateCampaign(updated);
  }, [campaign, onUpdateCampaign]);

  return (
    <div className="camp-hub-root" data-testid="camp-hub">
      {/* Header */}
      <header className="camp-hub-header">
        <div className="camp-header-left">
          <span className="camp-brand font-display">✦ THE NEXUS</span>
          <span className="camp-stage-badge font-mono">Sector {campaign.stage}</span>
        </div>
        <div className="camp-header-stats font-mono">
          <span className="camp-stat-win">Triumphs: {campaign.history.victories}</span>
          <span className="camp-stat-loss">Eclipses: {campaign.history.defeats}</span>
        </div>
        <div className="camp-header-actions">
          {onSaveCampaign && (
            <button
              type="button"
              className={`camp-save-btn font-ui ${saveStatus === 'saved' ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              title="Save expedition progress"
              data-testid="camp-save-btn"
            >
              {saveStatus === 'saving'
                ? '✦ Saving...'
                : saveStatus === 'saved'
                ? '✦ Saved!'
                : '✦ Save Expedition'}
            </button>
          )}
          {onExitToTitle && (
            <button
              type="button"
              className="camp-exit-btn font-ui"
              onClick={onExitToTitle}
              title="Return to Portal"
              data-testid="camp-exit-title-btn"
            >
              Return to Portal
            </button>
          )}
        </div>
      </header>

      {/* Main Camp Hub Content */}
      <main className="camp-hub-content">
        <div className="camp-upper-section">
          {/* Active Vanguard Dock */}
          <ActiveSquadDock
            activeSquad={activeSquad}
            onInspectHero={(unit) => setInspectingHeroId(unit.id)}
            onBenchHero={handleBenchHero}
            onSwapHero={handleToggleSwapHero}
            swappingHeroId={swappingHeroId}
          />

          {/* Expedition War Room */}
          <ExpeditionWarRoom
            stage={campaign.stage}
            encounter={campaign.currentEncounter}
            activeSquadCount={activeSquad.length}
            onDeploySquad={onDeploySquad}
          />
        </div>

        {/* Reserve Barracks Tray */}
        <div className="camp-reserve-section">
          <ReserveBarracksTray
            reserveHeroes={reserveHeroes}
            onInspectHero={(unit) => setInspectingHeroId(unit.id)}
            onDeployHero={handleDeployHero}
            onSelectForSwap={handleSelectForSwap}
            onRecruitNovice={handleRecruitNovice}
            onCancelSwap={() => setSwappingHeroId(null)}
            canDeploy={activeSquad.length < 3}
            swappingHeroName={swappingHeroName}
          />
        </div>
      </main>

      {/* Deep Progression Drawer (Tasks 4.1 - 4.3) */}
      {inspectingHero && (
        <HeroProgressionDrawer
          hero={inspectingHero}
          campaign={campaign}
          onClose={() => setInspectingHeroId(null)}
          onUpdateCampaign={onUpdateCampaign}
        />
      )}
    </div>
  );
}
