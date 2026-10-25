import { useEffect, useMemo, useState } from 'react';
import { useCombatSimulation } from './useCombatSimulation';
import { DiceMode } from './devDice';
import { createNoviceSandboxEncounter } from '../../data/encounters/noviceSandbox';
import { HexGridSvg } from './HexGridSvg';
import { ActionBar } from './ActionBar';
import { EnemyTurnBanner } from './EnemyTurnBanner';
import { UnitStatusCard } from './UnitStatusCard';
import { CombatLogPanel } from './CombatLogPanel';
import { BattleDefeatModal } from './BattleDefeatModal';
import { InitiativeRibbon } from './InitiativeRibbon';
import { preloadCombatUnitTokens } from './tokenAssets';
import { preloadObstacleTokens } from './obstacleAssets';
import { AISpeedMode } from './asyncTurnSequencer';
import { EncounterDefinition } from '../../core/combat/encounter';
import { CombatState, InBattleXp } from '../../core/combat/types';
import { SquadMemberVictorySummary } from './useCombatSimulation';
import { TrialExportModal } from './TrialExportModal';
import { TrialErrorBoundary } from './TrialErrorBoundary';
import { HarvestDistributionModal } from './HarvestDistributionModal';
import { resolveArenaBackground, computeBackgroundTransform } from './arenaBackground';
import { isLocalhost } from '../../core/config/environment';
import './CombatArena.css';

export interface CombatArenaProps {
  readonly encounter?: EncounterDefinition;
  readonly onVictory?: (result: { state: CombatState; unitXpGains?: Record<string, InBattleXp>; summaries?: readonly SquadMemberVictorySummary[] }) => void;
  readonly onDefeat?: (result: { state: CombatState; unitXpGains?: Record<string, InBattleXp> }) => void;
  readonly onExit?: () => void;
}

export function CombatArena({
  encounter,
  onVictory,
  onDefeat,
  onExit
}: CombatArenaProps = {}) {
  const [fieldZoom, setFieldZoom] = useState<number>(1.0);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [ribbonHoveredUnitId, setRibbonHoveredUnitId] = useState<string | null>(null);
  const [isHarvestModalOpen, setIsHarvestModalOpen] = useState<boolean>(false);
  const [harvestOutcome, setHarvestOutcome] = useState<'VICTORY' | 'DEFEAT'>('VICTORY');

  const activeEncounter = useMemo(
    () => encounter ?? createNoviceSandboxEncounter(),
    [encounter]
  );

  const {
    state,
    activeCu,
    phase,
    aiSpeed,
    setAiSpeed,
    hostileActionStatus,
    isOpeningInitiativeActive,
    skipOpeningInitiative,
    actionMode,
    selectedAbility,
    hoveredCoord,
    setHoveredCoord,
    diceMode,
    setDiceMode,
    floatingTexts,
    reachableCoords,
    abilityRangeCoords,
    candidateTargetCoords,
    targetPreview,
    movePreview,
    facingCompassCoord,
    handleSelectFacing,
    squadSummaries,
    isVictoryModalOpen,
    setIsVictoryModalOpen,
    isDefeatModalOpen,
    setIsDefeatModalOpen,
    selectAction,
    handleTileClick,
    handleEndTurn,
    handleRematch,
    handleResetEncounter
  } = useCombatSimulation({ encounter: activeEncounter });

  const isCampaignVictory = isVictoryModalOpen;
  const isCampaignDefeat = Boolean(onDefeat && isDefeatModalOpen);
  const effectiveHarvestModalOpen = isHarvestModalOpen || isCampaignVictory || isCampaignDefeat;
  const effectiveHarvestOutcome: 'VICTORY' | 'DEFEAT' = isCampaignDefeat
    ? 'DEFEAT'
    : isCampaignVictory
      ? 'VICTORY'
      : harvestOutcome;

  const handleCanvasWheel = (e: React.WheelEvent) => {
    // Smooth mouse-wheel field zoom
    if (e.deltaY < 0) {
      setFieldZoom((z) => Math.min(1.8, Math.round((z + 0.05) * 100) / 100));
    } else if (e.deltaY > 0) {
      setFieldZoom((z) => Math.max(0.6, Math.round((z - 0.05) * 100) / 100));
    }
  };

  const hoveredUnitCu = useMemo(() => {
    if (!hoveredCoord) return undefined;
    const unitId = state.arena.getUnitAt(hoveredCoord);
    return unitId ? state.units.get(unitId) : undefined;
  }, [hoveredCoord, state.arena, state.units]);

  // Two-way highlight: active if either the hex field unit or timeline ribbon chip is hovered
  const highlightedUnitId = ribbonHoveredUnitId ?? hoveredUnitCu?.unit.id ?? null;

  // Effective hovered unit for UnitStatusCard: priority to ribbon hover if active, else field hover
  const effectiveHoveredUnitCu = useMemo(() => {
    if (ribbonHoveredUnitId) {
      return state.units.get(ribbonHoveredUnitId);
    }
    return hoveredUnitCu;
  }, [ribbonHoveredUnitId, hoveredUnitCu, state.units]);

  // Squad members for defeat modal display
  const playerSquadUnits = useMemo(() => {
    if (squadSummaries.length > 0) {
      return squadSummaries;
    }
    return Array.from(state.units.values())
      .filter((cu) => cu.faction === 'PLAYER')
      .map((cu) => ({ unit: cu.unit, earnedXp: cu.inBattleXp }));
  }, [squadSummaries, state.units]);

  // Deployed squad units for harvest distribution
  const deployedSquadUnits = useMemo(() => {
    return Array.from(state.units.values())
      .filter((cu) => (cu.faction ?? cu.unit.faction ?? 'PLAYER') === 'PLAYER')
      .map((cu) => cu.unit);
  }, [state.units]);

  // Preload token sprites strictly for active combatants and obstacles to eliminate asset pop-in
  useEffect(() => {
    const combatUnits = Array.from(state.units.values()).map((cu) => cu.unit);
    preloadCombatUnitTokens(combatUnits);
    preloadObstacleTokens(['ruins']);
  }, [state.units]);

  // Deterministically resolved procedural astral background and parallax transform
  const bgConfig = useMemo(
    () => resolveArenaBackground(activeEncounter.id, activeEncounter.background),
    [activeEncounter.id, activeEncounter.background]
  );

  const backgroundTransform = useMemo(
    () => computeBackgroundTransform(bgConfig, fieldZoom),
    [bgConfig, fieldZoom]
  );

  return (
    <TrialErrorBoundary
      state={state}
      encounterName={activeEncounter.name}
      onReset={handleResetEncounter}
    >
      <div className="combat-arena-container">
        {/* Procedural Astral Background Layers */}
        <div
          className="arena-backdrop-layer"
          data-testid="arena-backdrop-layer"
          style={{
            backgroundImage: `url(${bgConfig.image})`,
            transform: backgroundTransform,
            filter: bgConfig.filter
          }}
          aria-hidden="true"
        />
        <div className="arena-backdrop-vignette" aria-hidden="true" />

        {/* Top Testbed Bar */}
        <div className="testbed-top-bar">
          <div className="testbed-title-block">
            <h2>✦ Astral Trial</h2>
            <span className="testbed-badge">{activeEncounter.name ?? 'Celestial Trial'}</span>
          </div>

          {/* Dev Controls: Dice, Speed, Zoom */}
          <div className="testbed-center-controls">
            {/* Arena Zoom Controls */}
            <div className="dev-zoom-controls" title="Scroll wheel over arena also zooms">
              <span className="dev-label">🔍 Zoom:</span>
              <button
                className="btn-zoom"
                onClick={() => setFieldZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
                title="Zoom out arena"
              >
                −
              </button>
              <span className="zoom-value">{Math.round(fieldZoom * 100)}%</span>
              <button
                className="btn-zoom"
                onClick={() => setFieldZoom((z) => Math.min(1.8, Math.round((z + 0.1) * 10) / 10))}
                title="Zoom in arena"
              >
                +
              </button>
              {fieldZoom !== 1.0 && (
                <button
                  className="btn-zoom-reset"
                  onClick={() => setFieldZoom(1.0)}
                  title="Reset zoom to 100%"
                >
                  ⟲
                </button>
              )}
              {onExit && (
                <button
                  type="button"
                  className="btn-arena-exit font-ui"
                  onClick={onExit}
                  title="Return to Camp Hub"
                >
                  ⛺ Camp
                </button>
              )}
            </div>

            {/* AI Speed Controls */}
            <div className="dev-speed-controls">
              <span className="dev-label">⚡ Speed:</span>
              {(
                [
                  { mode: 'NORMAL', label: '1x' },
                  { mode: 'FAST', label: '2x' },
                  { mode: 'INSTANT', label: 'Instant' }
                ] as const
              ).map(({ mode, label }) => (
                <button
                  key={mode}
                  className={`btn-speed ${aiSpeed === mode ? 'active' : ''}`}
                  onClick={() => setAiSpeed(mode as AISpeedMode)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Dev Dice Roll Overrides (Localhost only) */}
            {isLocalhost() && (
              <div className="dev-dice-controls">
                <span className="dev-label">🎲 Dice:</span>
                {(['NORMAL', 'FORCE_CRIT', 'FORCE_GRAZE', 'FORCE_MISS'] as DiceMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`btn-dice-mode ${diceMode === mode ? 'active' : ''}`}
                    onClick={() => setDiceMode(mode)}
                  >
                    {mode === 'NORMAL'
                      ? 'Random'
                      : mode === 'FORCE_CRIT'
                        ? 'Nat 20'
                        : mode === 'FORCE_GRAZE'
                          ? 'Graze'
                          : 'Miss'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Global Controls */}
          <div className="testbed-actions">
            {state.outcome !== 'IN_PROGRESS' && (onVictory || onDefeat) && !effectiveHarvestModalOpen && (
              <button
                type="button"
                className="btn-testbed harvest-reopen-btn font-ui"
                onClick={() => {
                  setHarvestOutcome(state.outcome === 'DEFEAT' ? 'DEFEAT' : 'VICTORY');
                  setIsHarvestModalOpen(true);
                }}
              >
                ✦ Harvest Spoils
              </button>
            )}
            <button
              type="button"
              className="btn-testbed export-btn font-ui"
              onClick={() => setIsExportModalOpen(true)}
              title="Export trial state and AI decision telemetry for debugging"
              data-testid="btn-open-trial-export"
            >
              📋 Export Trial
            </button>
            <button className="btn-testbed reset-btn" onClick={handleResetEncounter} title="Restores all units and HP to start">
              ↺ Reset Trial
            </button>
          </div>

        </div>

        {/* CTB Timeline Initiative Ribbon */}
        <div className="arena-ribbon-dock">
          <InitiativeRibbon
            state={state}
            highlightedUnitId={highlightedUnitId}
            onHoverUnit={setRibbonHoveredUnitId}
          />
        </div>

        {/* Main Arena Content Layout */}
        <div className="arena-main-layout">
          {/* Status Overlay HUD */}
          <UnitStatusCard
            activeCu={activeCu}
            targetPreview={targetPreview}
            hoveredUnitCu={effectiveHoveredUnitCu}
          />

          {/* Center SVG Hex Arena */}
          <div
            className="arena-canvas-container"
            onWheel={handleCanvasWheel}
            onClick={isOpeningInitiativeActive ? skipOpeningInitiative : undefined}
          >
            <HexGridSvg
              state={state}
              reachableCoords={reachableCoords}
              abilityRangeCoords={abilityRangeCoords}
              candidateTargetCoords={candidateTargetCoords}
              hoveredCoord={hoveredCoord}
              highlightedUnitId={highlightedUnitId}
              floatingTexts={floatingTexts}
              targetPreview={targetPreview}
              movePreview={movePreview}
              facingCompassCoord={facingCompassCoord}
              onSelectFacing={handleSelectFacing}
              zoom={fieldZoom}
              onTileClick={handleTileClick}
              onTileHover={setHoveredCoord}
            />
          </div>

          {/* Right Combat Log Panel */}
          <CombatLogPanel
            logEntries={state.combatLog}
            turnNumber={state.turnNumber}
          />
        </div>

        {/* Floating Tactical Action Bar or Hostile Turn Banner */}
        {phase === 'HOSTILE_TURN' ? (
          <EnemyTurnBanner
            activeCu={activeCu}
            actionDescription={isOpeningInitiativeActive ? 'Rolling initiative...' : hostileActionStatus}
          />
        ) : (
          <ActionBar
            activeCu={activeCu}
            actionMode={actionMode}
            selectedAbility={selectedAbility}
            onSelectAction={selectAction}
            onEndTurn={handleEndTurn}
          />
        )}

        {/* Post-Battle Defeat Modal (used in standalone dev sandbox when onDefeat callback is omitted) */}
        {!onDefeat && (
          <BattleDefeatModal
            isOpen={isDefeatModalOpen}
            squadMembers={playerSquadUnits}
            onRetry={handleResetEncounter}
          />
        )}

        {/* Post-Battle Party XP Harvest & Allocation Modal */}
        <HarvestDistributionModal
          isOpen={effectiveHarvestModalOpen}
          outcome={effectiveHarvestOutcome}
          squadUnits={deployedSquadUnits}
          earnedPool={state.partyXpPool ?? { fighter: 0, rogue: 0, mage: 0 }}
          onConfirm={(allocations) => {
            setIsHarvestModalOpen(false);
            setIsVictoryModalOpen(false);
            setIsDefeatModalOpen(false);
            if (effectiveHarvestOutcome === 'VICTORY') {
              if (onVictory) {
                onVictory({ state, unitXpGains: allocations, summaries: squadSummaries });
              } else {
                handleRematch();
              }
            } else {
              if (onDefeat) {
                onDefeat({ state, unitXpGains: allocations });
              } else {
                handleResetEncounter();
              }
            }
          }}
        />

        {/* Trial Export & Diagnostics Modal */}
        <TrialExportModal
          isOpen={isExportModalOpen}
          state={state}
          encounterName={activeEncounter.name}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    </TrialErrorBoundary>
  );
}

