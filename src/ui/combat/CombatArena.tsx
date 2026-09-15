import { useMemo } from 'react';
import { useCombatSimulation, DiceMode } from './useCombatSimulation';
import { HexGridSvg } from './HexGridSvg';
import { ActionBar } from './ActionBar';
import { UnitStatusCard } from './UnitStatusCard';
import { CombatLogPanel } from './CombatLogPanel';
import './CombatArena.css';

export function CombatArena() {
  const {
    state,
    playerCu,
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
    selectAction,
    handleTileClick,
    handleEndTurn,
    handleResetEncounter,
    handleRerollKit
  } = useCombatSimulation();

  const hoveredUnitCu = useMemo(() => {
    if (!hoveredCoord) return undefined;
    const unitId = state.arena.getUnitAt(hoveredCoord);
    return unitId ? state.units.get(unitId) : undefined;
  }, [hoveredCoord, state.arena, state.units]);

  return (
    <div className="combat-arena-container">
      {/* Top Testbed Bar */}
      <div className="testbed-top-bar">
        <div className="testbed-title-block">
          <h2>⚔️ Tactical Arena Testbed</h2>
          <span className="testbed-badge">Milestone 5 • Level-0 Sandbox</span>
        </div>

        {/* Dev Dice Roll Overrides */}
        <div className="dev-dice-controls">
          <span className="dev-label">🎲 Dice Mode:</span>
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

        {/* Global Controls */}
        <div className="testbed-actions">
          <button className="btn-testbed reroll-btn" onClick={handleRerollKit} title="Rolls a new 3-ability starter kit">
            🎲 Re-roll Kit
          </button>
          <button className="btn-testbed reset-btn" onClick={handleResetEncounter} title="Restores all units and HP to start">
            ↺ Reset Arena
          </button>
        </div>
      </div>

      {/* Main Arena Content Layout */}
      <div className="arena-main-layout">
        {/* Status Overlay HUD */}
        <UnitStatusCard
          playerCu={playerCu}
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

      {/* Floating Tactical Action Bar */}
      <ActionBar
        playerCu={playerCu}
        actionMode={actionMode}
        selectedAbility={selectedAbility}
        onSelectAction={selectAction}
        onEndTurn={handleEndTurn}
      />
    </div>
  );
}
