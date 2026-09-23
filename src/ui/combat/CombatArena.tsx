import { useMemo, useState } from 'react';
import { useCombatSimulation } from './useCombatSimulation';
import { DiceMode } from './devDice';
import { createNoviceSandboxEncounter } from '../../data/encounters/noviceSandbox';
import { rollNoviceStarterKit } from '../../data/packages';
import { HexGridSvg } from './HexGridSvg';
import { ActionBar } from './ActionBar';
import { UnitStatusCard } from './UnitStatusCard';
import { CombatLogPanel } from './CombatLogPanel';
import { BattleVictoryModal } from './BattleVictoryModal';
import { InitiativeRibbon } from './InitiativeRibbon';
import { TokenAesthetic } from './tokenAssets';
import './CombatArena.css';

export function CombatArena() {
  const [tokenAesthetic, setTokenAesthetic] = useState<TokenAesthetic>('stained-glass');

  const {
    state,
    activeCu,
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
    selectAction,
    handleTileClick,
    handleEndTurn,
    handleSelectArchetypeChoice,
    handleRematch,
    handleResetEncounter,
    handleRerollKit
  } = useCombatSimulation({
    encounterFactory: createNoviceSandboxEncounter,
    onRerollKit: rollNoviceStarterKit
  });

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
          <span className="testbed-badge">Phase 2 • Squad Tactics (3v4)</span>
        </div>

        {/* Dev Controls: Dice & Token Style */}
        <div className="testbed-center-controls">
          {/* Token Aesthetic Selector */}
          <div className="dev-aesthetic-controls">
            <span className="dev-label">🎨 Style:</span>
            {(
              [
                { id: 'stained-glass', label: 'Stained Glass' },
                { id: 'enamel', label: 'Enamel' },
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
          <button className="btn-testbed reroll-btn" onClick={handleRerollKit} title="Rolls a new 3-ability starter kit">
            🎲 Re-roll Kit
          </button>
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

      {/* Floating Tactical Action Bar */}
      <ActionBar
        activeCu={activeCu}
        actionMode={actionMode}
        selectedAbility={selectedAbility}
        onSelectAction={selectAction}
        onEndTurn={handleEndTurn}
      />

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
    </div>
  );
}
