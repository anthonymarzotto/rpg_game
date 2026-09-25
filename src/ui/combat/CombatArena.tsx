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
import { TokenAesthetic, preloadCombatUnitTokens } from './tokenAssets';
import { AISpeedMode } from './asyncTurnSequencer';
import './CombatArena.css';

export function CombatArena() {
  const [tokenAesthetic, setTokenAesthetic] = useState<TokenAesthetic>('stained-glass');

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
  } = useCombatSimulation({
    encounterFactory: createNoviceSandboxEncounter
  });

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
    preloadCombatUnitTokens(combatUnits, tokenAesthetic);
  }, [state.units, tokenAesthetic]);

  return (
    <div className="combat-arena-container">
      {/* Top Testbed Bar */}
      <div className="testbed-top-bar">
        <div className="testbed-title-block">
          <h2>⚔️ Tactical Arena Testbed</h2>
          <span className="testbed-badge">Phase 2 • Squad Tactics (3v4)</span>
        </div>

        {/* Dev Controls: Dice, Speed & Token Style */}
        <div className="testbed-center-controls">
          {/* Token Aesthetic Selector */}
          <div className="dev-aesthetic-controls">
            <span className="dev-label">🎨 Style:</span>
            {(
              [
                { id: 'stained-glass', label: 'Stained Glass' },
                { id: 'enamel', label: 'Enamel' },
                { id: 'pixel', label: 'Pixel' },
                { id: 'classic', label: 'Classic' }
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                className={`btn-aesthetic ${tokenAesthetic === opt.id ? 'active' : ''}`}
                onClick={() => setTokenAesthetic(opt.id)}
              >
                {opt.label}
              </button>
            ))}
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
            ↺ Reset Arena
          </button>
        </div>
      </div>

      {/* CTB Timeline Initiative Ribbon */}
      <div style={{ marginTop: '6px', marginBottom: '4px' }}>
        <InitiativeRibbon state={state} tokenAesthetic={tokenAesthetic} />
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
        <div className="arena-canvas-container">
          <HexGridSvg
            state={state}
            reachableCoords={reachableCoords}
            abilityRangeCoords={abilityRangeCoords}
            candidateTargetCoords={candidateTargetCoords}
            hoveredCoord={hoveredCoord}
            floatingTexts={floatingTexts}
            targetPreview={targetPreview}
            tokenAesthetic={tokenAesthetic}
            onTileClick={handleTileClick}
            onTileHover={setHoveredCoord}
          />
        </div>

        {/* Right Combat Log Sidebar */}
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
          tokenAesthetic={tokenAesthetic}
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
      />

      {/* Post-Battle Defeat Modal */}
      <BattleDefeatModal
        isOpen={isDefeatModalOpen}
        squadMembers={playerSquadUnits}
        tokenAesthetic={tokenAesthetic}
        onRetry={handleResetEncounter}
      />
    </div>
  );
}
