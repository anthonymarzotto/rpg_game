import { useState, useCallback, useMemo, useEffect } from 'react';
import { HexCoord, getHexesInRange } from '../../core/grid/hex';
import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
import { UnitLoadout } from '../../core/types/loadout';
import { CombatState, InBattleXp } from '../../core/combat/types';
import { canMove, canExecuteAbility } from '../../core/combat/validator';
import { executeMove, executeAbility } from '../../core/combat/resolver';
import { endActiveTurn } from '../../core/combat/turnClock';
import {
  EncounterDefinition,
  buildEncounterState
} from '../../core/combat/encounter';
import { TargetPreview, computeTargetPreview } from '../../core/combat/targetPreview';
import { DiceMode, DevDiceRoller } from './devDice';
import { useFloatingCombatText } from './useFloatingCombatText';
import {
  AISpeedMode,
  PACING_PRESETS,
  CombatExecutionObserver,
  executeHostileTurnAsync
} from './asyncTurnSequencer';

export type ActionMode = 'IDLE' | 'MOVE' | 'ABILITY';
export type CombatPhase = 'PLAYER_ACTION' | 'HOSTILE_TURN' | 'VICTORY' | 'DEFEAT';

export interface SquadMemberVictorySummary {
  readonly unit: Unit;
  readonly earnedXp: InBattleXp;
}

export interface UseCombatSimulationOptions {
  readonly encounter: EncounterDefinition;
}

/**
 * Orchestrates combat interaction state, squad turn sequencing, action selection, and intent dispatch.
 */
export function useCombatSimulation({
  encounter
}: UseCombatSimulationOptions) {
  const [squadSummaries, setSquadSummaries] = useState<readonly SquadMemberVictorySummary[]>([]);
  const [activeSquadUnitId, setActiveSquadUnitId] = useState<string>('player-warrior');
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [isDefeatModalOpen, setIsDefeatModalOpen] = useState(false);

  const [aiSpeed, setAiSpeed] = useState<AISpeedMode>('NORMAL');
  const [hostileActionStatus, setHostileActionStatus] = useState<string | null>(null);
  const [encounterSession, setEncounterSession] = useState(0);

  const [state, setState] = useState<CombatState>(() =>
    buildEncounterState(encounter)
  );
  const [actionMode, setActionMode] = useState<ActionMode>('IDLE');
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);
  const [diceMode, setDiceMode] = useState<DiceMode>('NORMAL');

  const {
    floatingTexts,
    addFloatingText,
    clearFloatingTexts,
    dispatchResolutionFeedback
  } = useFloatingCombatText();

  // Active unit currently taking their turn
  const activeCu = useMemo(() => state.units.get(state.activeUnitId), [state]);
  const activeCoord = useMemo(
    () => (state.activeUnitId ? state.arena.getUnitPosition(state.activeUnitId) : undefined),
    [state]
  );

  // Authoritative interaction phase
  const phase = useMemo<CombatPhase>(() => {
    if (state.outcome === 'VICTORY') return 'VICTORY';
    if (state.outcome === 'DEFEAT') return 'DEFEAT';
    if (activeCu?.faction !== 'PLAYER') return 'HOSTILE_TURN';
    return 'PLAYER_ACTION';
  }, [state.outcome, activeCu]);

  const isPlayerTurn = phase === 'PLAYER_ACTION';
  const isEnemyTurn = phase === 'HOSTILE_TURN';

  // Computes reachable tiles when in MOVE mode for currently active player unit
  const reachableCoords = useMemo<HexCoord[]>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'MOVE' || !activeCoord || !activeCu || activeCu.currentAp < 1) {
      return [];
    }
    return state.arena.getReachableHexes(activeCoord, activeCu.unit.effectiveVitals.move);
  }, [phase, actionMode, activeCoord, activeCu, state.arena]);

  // Computes candidate tiles in range when an ability is selected
  const abilityRangeCoords = useMemo<HexCoord[]>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'ABILITY' || !selectedAbility || !activeCoord) {
      return [];
    }
    return getHexesInRange(activeCoord, selectedAbility.range);
  }, [phase, actionMode, selectedAbility, activeCoord]);

  // Candidate targets within ability range that pass validation (enemies for attacks, allies for buffs)
  const candidateTargetCoords = useMemo<HexCoord[]>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'ABILITY' || !selectedAbility || !activeCoord) {
      return [];
    }
    return abilityRangeCoords.filter((coord) => {
      const targetUnitId = state.arena.getUnitAt(coord);
      const validation = canExecuteAbility(state, state.activeUnitId, selectedAbility, {
        coord,
        targetUnitId
      });
      return validation.valid;
    });
  }, [phase, actionMode, selectedAbility, activeCoord, abilityRangeCoords, state]);

  // Live damage/hit/buff preview on hovered target
  const targetPreview = useMemo<TargetPreview | null>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'ABILITY' || !selectedAbility || !hoveredCoord || !activeCu) {
      return null;
    }
    return computeTargetPreview(
      state,
      state.activeUnitId,
      selectedAbility,
      hoveredCoord
    );
  }, [phase, actionMode, selectedAbility, hoveredCoord, activeCu, state]);

  // Check and trigger post-battle reconciliation for all player squad members on VICTORY / DEFEAT
  const checkEncounterProgression = useCallback(
    (nextState: CombatState) => {
      if (nextState.outcome === 'VICTORY') {
        const playerUnits = Array.from(nextState.units.values()).filter(
          (cu) => cu.faction === 'PLAYER'
        );

        const summaries: SquadMemberVictorySummary[] = playerUnits.map((pCu) => ({
          unit: pCu.unit,
          earnedXp: { ...pCu.inBattleXp }
        }));

        setSquadSummaries(summaries);
        if (summaries.length > 0) {
          setActiveSquadUnitId(summaries[0].unit.id);
        }
        setIsVictoryModalOpen(true);
      } else if (nextState.outcome === 'DEFEAT') {
        setIsDefeatModalOpen(true);
      }
    },
    []
  );

  // Reactive asynchronous hostile turn sequencer
  useEffect(() => {
    if (phase !== 'HOSTILE_TURN' || !state.activeUnitId || state.outcome !== 'IN_PROGRESS') {
      setHostileActionStatus(null);
      return;
    }

    const controller = new AbortController();
    const pacing = PACING_PRESETS[aiSpeed];

    const observer: CombatExecutionObserver = {
      onTurnTransitionStart: () => {
        setHostileActionStatus('Preparing turn...');
      },
      onActionStart: (_actor, _action, description) => {
        setHostileActionStatus(description);
      },
      onActionResolved: (_actor, _action, result) => {
        if (result.type === 'MOVE') {
          addFloatingText('Move', 'buff', result.destination);
        } else if (result.type === 'ABILITY') {
          const targetCoordBefore = result.target.targetUnitId
            ? state.arena.getUnitPosition(result.target.targetUnitId)
            : result.target.coord;
          const actorCoord = state.arena.getUnitPosition(state.activeUnitId);
          dispatchResolutionFeedback(
            state,
            result.resolution,
            result.ability,
            targetCoordBefore,
            actorCoord,
            result.target.coord ?? targetCoordBefore ?? { q: 0, r: 0 },
            result.target.targetUnitId
          );
        }
        setState({ ...state, combatLog: [...state.combatLog] });
        checkEncounterProgression(state);
      },
      onTurnCompleted: (actor, unspentAp) => {
        if (unspentAp > 0) {
          const actorCoord = state.arena.getUnitPosition(actor.unit.id);
          addFloatingText(
            `+${unspentAp * 20} CTB Gauge`,
            'buff',
            actorCoord ?? { q: 0, r: 0 }
          );
        }
        setHostileActionStatus(null);
        setState({ ...state, combatLog: [...state.combatLog] });
        checkEncounterProgression(state);
      }
    };

    executeHostileTurnAsync(
      state,
      state.activeUnitId,
      pacing,
      observer,
      controller.signal
    ).catch((err: unknown) => {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error executing hostile turn:', err);
      }
    });

    return () => {
      controller.abort();
    };
  }, [
    phase,
    state.activeUnitId,
    state.outcome,
    aiSpeed,
    encounterSession,
    addFloatingText,
    dispatchResolutionFeedback,
    checkEncounterProgression
  ]);

  // Dispatches tactical intent on tile click
  const handleTileClick = useCallback(
    (coord: HexCoord) => {
      if (phase !== 'PLAYER_ACTION' || !activeCu || !activeCoord) return;

      if (actionMode === 'MOVE') {
        const validation = canMove(state, state.activeUnitId, coord);
        if (validation.valid) {
          executeMove(state, state.activeUnitId, coord);
          addFloatingText('Move', 'buff', coord);
          setActionMode('IDLE');
          setState({ ...state, combatLog: [...state.combatLog] });
          checkEncounterProgression(state);
        } else {
          addFloatingText(validation.reason, 'miss', coord);
        }
      } else if (actionMode === 'ABILITY' && selectedAbility) {
        const targetUnitId = state.arena.getUnitAt(coord);
        const validation = canExecuteAbility(state, state.activeUnitId, selectedAbility, {
          coord,
          targetUnitId
        });

        if (validation.valid) {
          const targetCoordBefore = targetUnitId
            ? state.arena.getUnitPosition(targetUnitId)
            : undefined;

          // Dev dice overrides apply only to player actions
          const roller = new DevDiceRoller(diceMode);
          const resolution = executeAbility(
            state,
            state.activeUnitId,
            selectedAbility,
            { coord, targetUnitId },
            roller
          );

          dispatchResolutionFeedback(
            state,
            resolution,
            selectedAbility,
            targetCoordBefore,
            activeCoord,
            coord,
            targetUnitId ?? undefined
          );

          setActionMode('IDLE');
          setSelectedAbility(null);
          setState({ ...state, combatLog: [...state.combatLog] });
          checkEncounterProgression(state);
        } else if (targetUnitId) {
          addFloatingText(validation.reason, 'miss', coord);
        }
      }
    },
    [
      phase,
      activeCu,
      activeCoord,
      actionMode,
      selectedAbility,
      state,
      diceMode,
      addFloatingText,
      dispatchResolutionFeedback,
      checkEncounterProgression
    ]
  );

  // End Turn with unspent AP refund and hand off to next unit
  const handleEndTurn = useCallback(() => {
    if (phase !== 'PLAYER_ACTION' || !activeCu) return;
    const unspent = activeCu.currentAp;
    addFloatingText(`+${unspent * 20} Initiative`, 'buff', activeCoord ?? { q: 0, r: 0 });

    endActiveTurn(state);

    setActionMode('IDLE');
    setSelectedAbility(null);
    setState({ ...state, combatLog: [...state.combatLog] });
    checkEncounterProgression(state);
  }, [phase, activeCu, activeCoord, state, addFloatingText, checkEncounterProgression]);

  // Switches action mode from ActionBar
  const selectAction = useCallback(
    (action: Ability | 'MOVE' | null) => {
      if (action === 'MOVE') {
        setActionMode('MOVE');
        setSelectedAbility(null);
      } else if (action && typeof action === 'object') {
        setActionMode('ABILITY');
        setSelectedAbility(action);
      } else {
        setActionMode('IDLE');
        setSelectedAbility(null);
      }
    },
    []
  );

  // Selects which squad member to inspect/customize in the victory modal
  const handleSelectSquadUnit = useCallback(
    (unitId: string) => {
      setActiveSquadUnitId(unitId);
    },
    []
  );

  // Resets the arena encounter
  const handleRematch = useCallback(
    (_configuredLoadout?: UnitLoadout) => {
      setIsVictoryModalOpen(false);
      setIsDefeatModalOpen(false);
      setSquadSummaries([]);
      setHostileActionStatus(null);
      setEncounterSession((prev) => prev + 1);

      const fresh = buildEncounterState(encounter);
      setState(fresh);
      setActionMode('IDLE');
      setSelectedAbility(null);
      setHoveredCoord(null);
      clearFloatingTexts();
    },
    [encounter, clearFloatingTexts]
  );

  // Full reset back to encounter start
  const handleResetEncounter = useCallback(() => {
    setSquadSummaries([]);
    setIsVictoryModalOpen(false);
    setIsDefeatModalOpen(false);
    setHostileActionStatus(null);
    setEncounterSession((prev) => prev + 1);

    const fresh = buildEncounterState(encounter);
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
    setHoveredCoord(null);
    clearFloatingTexts();
  }, [encounter, clearFloatingTexts]);

  return {
    state,
    activeCu,
    activeCoord,
    phase,
    isPlayerTurn,
    isEnemyTurn,
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
    squadSummaries,
    activeSquadUnitId,
    handleSelectSquadUnit,
    isVictoryModalOpen,
    setIsVictoryModalOpen,
    isDefeatModalOpen,
    setIsDefeatModalOpen,
    selectAction,
    handleTileClick,
    handleEndTurn,
    handleRematch,
    handleResetEncounter
  };
}
