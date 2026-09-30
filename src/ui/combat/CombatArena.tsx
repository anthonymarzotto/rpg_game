import { useEffect, useMemo, useState } from 'react';
import { useCombatSimulation } from './useCombatSimulation';
import { DiceMode } from './devDice';
import { createNoviceSandboxEncounter } from '../../data/encounters/noviceSandbox';
import { HexGridSvg } from './HexGridSvg';
import { ActionBar } from './ActionBar';
import { EnemyTurnBanner } from './EnemyTurnBanner';
import { UnitStatusCard } from './UnitStatusCard';
import { CombatLogPanel } from './CombatLogPanel';
import { BattleVictoryModal } from './BattleVictoryModal';
import { BattleDefeatModal } from './BattleDefeatModal';
import { InitiativeRibbon } from './InitiativeRibbon';
import { preloadCombatUnitTokens } from './tokenAssets';
import { AISpeedMode } from './asyncTurnSequencer';
import { EncounterDefinition } from '../../core/combat/encounter';
import { CombatState } from '../../core/combat/types';
import { SquadMemberReconciliation } from './useCombatSimulation';
import './CombatArena.css';

export interface CombatArenaProps {
  readonly encounter?: EncounterDefinition;
  readonly onVictory?: (result: { state: CombatState; reconciliations: readonly SquadMemberReconciliation[] }) => void;
  readonly onDefeat?: (result: { state: CombatState }) => void;
  readonly onExit?: () => void;
}

export function CombatArena({
  encounter,
  onVictory,
  onDefeat,
  onExit
}: CombatArenaProps = {}) {
  const [fieldZoom, setFieldZoom] = useState<number>(1.0);

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
    reconciliationResult,
    squadReconciliations,
    activeSquadUnitId,
    handleSelectSquadUnit,
    isVictoryModalOpen,
    setIsVictoryModalOpen,
    isDefeatModalOpen,
    selectAction,
    handleTileClick,
    handleEndTurn,
    handleSelectArchetypeChoice,
    handleRematch,
    handleResetEncounter
  } = useCombatSimulation({ encounter: activeEncounter });

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

  // Squad members for defeat modal display
  const playerSquadUnits = useMemo(() => {
    if (squadReconciliations.length > 0) {
      return squadReconciliations;
    }
    return Array.from(state.units.values())
      .filter((cu) => cu.faction === 'PLAYER')
      .map((cu) => ({ unit: cu.unit }));
  }, [squadReconciliations, state.units]);

  // Preload token sprites strictly for active combatants to eliminate rotation lag
  useEffect(() => {
    const combatUnits = Array.from(state.units.values()).map((cu) => cu.unit);
    preloadCombatUnitTokens(combatUnits);
  }, [state.units]);

  return (
    <div className="combat-arena-container">
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

          {/* Dev Dice Roll Overrides */}
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
        </div>

        {/* Global Controls */}
        <div className="testbed-actions">
          <button className="btn-testbed reset-btn" onClick={handleResetEncounter} title="Restores all units and HP to start">
            ↺ Reset Trial
          </button>
        </div>
      </div>

      {/* CTB Timeline Initiative Ribbon */}
      <div className="arena-ribbon-dock">
        <InitiativeRibbon state={state} />
      </div>

      {/* Main Arena Content Layout */}
      <div className="arena-main-layout">
        {/* Status Overlay HUD */}
        <UnitStatusCard
          activeCu={activeCu}
          targetPreview={targetPreview}
          hoveredUnitCu={hoveredUnitCu}
        />

        {/* Center SVG Hex Arena */}
        <div className="arena-canvas-container" onWheel={handleCanvasWheel}>
          <HexGridSvg
            state={state}
            reachableCoords={reachableCoords}
            abilityRangeCoords={abilityRangeCoords}
            candidateTargetCoords={candidateTargetCoords}
            hoveredCoord={hoveredCoord}
            floatingTexts={floatingTexts}
            targetPreview={targetPreview}
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
          actionDescription={hostileActionStatus}
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

      {/* Post-Battle Victory & Level Unlock Modal */}
      <BattleVictoryModal
        isOpen={isVictoryModalOpen}
        reconciliationResult={reconciliationResult}
        playerUnit={activeCu?.unit}
        squadMembers={squadReconciliations}
        activeSquadUnitId={activeSquadUnitId}
        onSelectSquadUnit={handleSelectSquadUnit}
        onSelectArchetypeChoice={handleSelectArchetypeChoice}
        onRematch={handleRematch}
        onDismiss={() => setIsVictoryModalOpen(false)}
        onProceedToCamp={
          onVictory
            ? () => onVictory({ state, reconciliations: squadReconciliations })
            : undefined
        }
      />

      {/* Post-Battle Defeat Modal */}
      <BattleDefeatModal
        isOpen={isDefeatModalOpen}
        squadMembers={playerSquadUnits}
        onRetry={handleResetEncounter}
        onRetreatToCamp={
          onDefeat
            ? () => onDefeat({ state })
            : undefined
        }
      />
    </div>
  );
}
