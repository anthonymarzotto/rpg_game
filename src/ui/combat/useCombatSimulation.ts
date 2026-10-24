import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { HexCoord, HexDirection } from '../../core/grid/hex';
import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
import { UnitLoadout } from '../../core/types/loadout';
import { CombatState, InBattleXp } from '../../core/combat/types';
import { canMove, canExecuteAbility, getAbilityRangeCoords } from '../../core/combat/validator';
import { executeMove, executeSetFacing, executeAbility } from '../../core/combat/resolver';
import { endActiveTurn } from '../../core/combat/turnClock';
import {
  EncounterDefinition,
  buildEncounterState
} from '../../core/combat/encounter';
import { TargetPreview, computeTargetPreview } from '../../core/combat/targetPreview';
import { DiceMode, DevDiceRoller } from './devDice';
import { useFloatingCombatText, collectInitiativeFloatingTexts, FloatingText } from './useFloatingCombatText';
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

export interface MovePathPreview {
  readonly destination: HexCoord;
  readonly cost: number;
  readonly fallDamage: number;
  readonly path: readonly HexCoord[];
}

export interface UseCombatSimulationOptions {
  readonly encounter: EncounterDefinition;
  readonly initialActionMode?: ActionMode;
  readonly initialSelectedAbility?: Ability | null;
}

/**
 * Orchestrates combat interaction state, squad turn sequencing, action selection, and intent dispatch.
 */
export function useCombatSimulation({
  encounter,
  initialActionMode,
  initialSelectedAbility
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
  const [actionMode, setActionMode] = useState<ActionMode>(initialActionMode ?? 'IDLE');
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(initialSelectedAbility ?? null);
  const [facingCompassCoord, setFacingCompassCoord] = useState<HexCoord | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);
  const [diceMode, setDiceMode] = useState<DiceMode>('NORMAL');
  const isOpeningInitiativeActiveRef = useRef<boolean>(true);
  const [isOpeningInitiativeActive, setIsOpeningInitiativeActiveState] = useState<boolean>(true);

  const setIsOpeningInitiativeActive = useCallback((active: boolean) => {
    isOpeningInitiativeActiveRef.current = active;
    setIsOpeningInitiativeActiveState(active);
  }, []);

  const openingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pendingInitiativeItemsRef = useRef<Array<{ text: string; type: FloatingText['type']; coord: HexCoord }>>([]);

  const {
    floatingTexts,
    addFloatingText,
    clearFloatingTexts,
    dispatchResolutionFeedback
  } = useFloatingCombatText();

  const skipOpeningInitiative = useCallback(() => {
    for (const t of openingTimeoutsRef.current) {
      clearTimeout(t);
    }
    openingTimeoutsRef.current = [];
    for (const item of pendingInitiativeItemsRef.current) {
      addFloatingText(item.text, item.type, item.coord);
    }
    pendingInitiativeItemsRef.current = [];
    setIsOpeningInitiativeActive(false);
  }, [addFloatingText, setIsOpeningInitiativeActive]);

  // Active unit currently taking their turn
  const activeCu = useMemo(() => state.units.get(state.activeUnitId), [state]);
  const activeCoord = useMemo(
    () => (state.activeUnitId ? state.arena.getUnitPosition(state.activeUnitId) : undefined),
    [state]
  );

  // Clear facing compass whenever the active turn or unit changes
  useEffect(() => {
    setFacingCompassCoord(null);
  }, [state.activeUnitId, state.turnNumber]);

  // Spawn opening initiative floating text sequentially on mount / encounter reset
  useEffect(() => {
    for (const t of openingTimeoutsRef.current) {
      clearTimeout(t);
    }
    openingTimeoutsRef.current = [];

    const items = collectInitiativeFloatingTexts(state);
    if (items.length === 0) {
      setIsOpeningInitiativeActive(false);
      return;
    }

    setIsOpeningInitiativeActive(true);
    pendingInitiativeItemsRef.current = [...items];

    items.forEach((item) => {
      if (item.delay === 0) {
        addFloatingText(item.text, item.type, item.coord);
        pendingInitiativeItemsRef.current = pendingInitiativeItemsRef.current.filter((i) => i !== item);
      } else {
        const timer = setTimeout(() => {
          addFloatingText(item.text, item.type, item.coord);
          pendingInitiativeItemsRef.current = pendingInitiativeItemsRef.current.filter((i) => i !== item);
        }, item.delay);
        openingTimeoutsRef.current.push(timer);
      }
    });

    const maxDelay = Math.max(...items.map((i) => i.delay), 0);
    const finishTimer = setTimeout(() => {
      setIsOpeningInitiativeActive(false);
      openingTimeoutsRef.current = [];
      pendingInitiativeItemsRef.current = [];
    }, maxDelay + 250);
    openingTimeoutsRef.current.push(finishTimer);

    return () => {
      for (const t of openingTimeoutsRef.current) {
        clearTimeout(t);
      }
      openingTimeoutsRef.current = [];
    };
  }, [encounterSession, addFloatingText]);

  // Authoritative interaction phase
  const phase = useMemo<CombatPhase>(() => {
    if (state.outcome === 'VICTORY') return 'VICTORY';
    if (state.outcome === 'DEFEAT') return 'DEFEAT';
    if (activeCu?.faction !== 'PLAYER') return 'HOSTILE_TURN';
    return 'PLAYER_ACTION';
  }, [state.outcome, activeCu]);

  // Computes reachable tiles when in MOVE mode for currently active player unit
  const reachableCoords = useMemo<HexCoord[]>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'MOVE' || !activeCoord || !activeCu || activeCu.currentAp < 1) {
      return [];
    }
    return state.arena.getReachableHexes(activeCoord, activeCu.unit.effectiveVitals.move);
  }, [phase, actionMode, activeCoord, activeCu, state.arena]);

  // Computes candidate tiles in range when an ability is selected
  const abilityRangeCoords = useMemo<HexCoord[]>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'ABILITY' || !selectedAbility || !activeCoord || !activeCu) {
      return [];
    }
    return getAbilityRangeCoords(state.arena, activeCoord, selectedAbility, activeCu);
  }, [phase, actionMode, selectedAbility, activeCoord, activeCu, state.arena]);

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

  // Live move path & fall hazard preview on hovered reachable tile during MOVE mode
  const movePreview = useMemo<MovePathPreview | null>(() => {
    if (
      phase !== 'PLAYER_ACTION' ||
      actionMode !== 'MOVE' ||
      !activeCoord ||
      !hoveredCoord ||
      !activeCu ||
      activeCu.currentAp < 1
    ) {
      return null;
    }
    const info = state.arena.findPath(activeCoord, hoveredCoord, activeCu.unit.effectiveVitals.move);
    if (!info) {
      return null;
    }
    return {
      destination: info.coord,
      cost: info.cost,
      fallDamage: info.fallDamage,
      path: info.path
    };
  }, [phase, actionMode, activeCoord, hoveredCoord, activeCu, state.arena]);

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
    if (
      phase !== 'HOSTILE_TURN' ||
      !state.activeUnitId ||
      state.outcome !== 'IN_PROGRESS' ||
      isOpeningInitiativeActive
    ) {
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
        setState({
          ...state,
          combatLog: [...state.combatLog],
          aiDecisionLog: state.aiDecisionLog ? [...state.aiDecisionLog] : []
        });
        checkEncounterProgression(state);
      },
      onActionFault: (actor, _action, _reason) => {
        const actorCoord = state.arena.getUnitPosition(actor.unit.id);
        if (actorCoord) {
          addFloatingText('⚠️ Action Fault', 'miss', actorCoord);
        }
        setState({
          ...state,
          combatLog: [...state.combatLog],
          aiDecisionLog: state.aiDecisionLog ? [...state.aiDecisionLog] : []
        });
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
        setState({
          ...state,
          combatLog: [...state.combatLog],
          aiDecisionLog: state.aiDecisionLog ? [...state.aiDecisionLog] : []
        });
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
        setHostileActionStatus(null);
        if (state.outcome === 'IN_PROGRESS') {
          try {
            endActiveTurn(state);
            setState({ ...state, combatLog: [...state.combatLog] });
            checkEncounterProgression(state);
          } catch (recoveryErr) {
            console.error('Emergency turn recovery failed:', recoveryErr);
          }
        }
      }
    });

    return () => {
      controller.abort();
    };
  }, [
    phase,
    state.activeUnitId,
    state.turnNumber,
    state.outcome,
    aiSpeed,
    encounterSession,
    isOpeningInitiativeActive,
    addFloatingText,
    dispatchResolutionFeedback,
    checkEncounterProgression
  ]);

  // Dispatches tactical intent on tile click
  const handleTileClick = useCallback(
    (coord: HexCoord) => {
      if (isOpeningInitiativeActiveRef.current) {
        skipOpeningInitiative();
        if (actionMode === 'IDLE') {
          return;
        }
      }

      if (phase !== 'PLAYER_ACTION' || !activeCu || !activeCoord) return;

      if (actionMode === 'MOVE') {
        const validation = canMove(state, state.activeUnitId, coord);
        if (validation.valid) {
          executeMove(state, state.activeUnitId, coord);
          addFloatingText('Move', 'buff', coord);
          setActionMode('IDLE');
          setFacingCompassCoord(coord);
          setState({ ...state, combatLog: [...state.combatLog] });
          checkEncounterProgression(state);
        } else {
          addFloatingText(validation.reason, 'miss', coord);
        }
      } else if (actionMode === 'IDLE') {
        // Clicking an empty tile or outside when compass is active dismisses the compass
        if (facingCompassCoord) {
          setFacingCompassCoord(null);
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
            : coord;

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
        } else {
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
      isOpeningInitiativeActive,
      skipOpeningInitiative,
      addFloatingText,
      dispatchResolutionFeedback,
      checkEncounterProgression
    ]
  );

  // End Turn with unspent AP refund and hand off to next unit
  const handleEndTurn = useCallback(() => {
    if (isOpeningInitiativeActive) {
      skipOpeningInitiative();
    }
    if (phase !== 'PLAYER_ACTION' || !activeCu) return;
    const unspent = activeCu.currentAp;
    addFloatingText(`+${unspent * 20} Initiative`, 'buff', activeCoord ?? { q: 0, r: 0 });

    endActiveTurn(state);

    setActionMode('IDLE');
    setSelectedAbility(null);
    setFacingCompassCoord(null);
    setState({ ...state, combatLog: [...state.combatLog] });
    checkEncounterProgression(state);
  }, [
    phase,
    activeCu,
    activeCoord,
    state,
    isOpeningInitiativeActive,
    skipOpeningInitiative,
    addFloatingText,
    checkEncounterProgression
  ]);

  // Switches action mode from ActionBar
  const selectAction = useCallback(
    (action: Ability | 'MOVE' | null) => {
      if (isOpeningInitiativeActive) {
        skipOpeningInitiative();
      }
      setFacingCompassCoord(null);
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
    [isOpeningInitiativeActive, skipOpeningInitiative]
  );

  // Directly sets unit facing orientation (0 AP) and retains compass ring for continuous adjustments
  const handleSelectFacing = useCallback(
    (direction: HexDirection) => {
      if (phase !== 'PLAYER_ACTION' || !activeCu) return;
      executeSetFacing(state, state.activeUnitId, direction);
      setState({ ...state, combatLog: [...state.combatLog] });
    },
    [phase, activeCu, state]
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
      for (const t of openingTimeoutsRef.current) {
        clearTimeout(t);
      }
      openingTimeoutsRef.current = [];
      pendingInitiativeItemsRef.current = [];
      setIsOpeningInitiativeActive(true);

      setIsVictoryModalOpen(false);
      setIsDefeatModalOpen(false);
      setSquadSummaries([]);
      setHostileActionStatus(null);
      setEncounterSession((prev) => prev + 1);

      const fresh = buildEncounterState(encounter);
      setState(fresh);
      setActionMode('IDLE');
      setSelectedAbility(null);
      setFacingCompassCoord(null);
      setHoveredCoord(null);
      clearFloatingTexts();
    },
    [encounter, clearFloatingTexts]
  );

  // Full reset back to encounter start
  const handleResetEncounter = useCallback(() => {
    for (const t of openingTimeoutsRef.current) {
      clearTimeout(t);
    }
    openingTimeoutsRef.current = [];
    pendingInitiativeItemsRef.current = [];
    setIsOpeningInitiativeActive(true);

    setSquadSummaries([]);
    setIsVictoryModalOpen(false);
    setIsDefeatModalOpen(false);
    setHostileActionStatus(null);
    setEncounterSession((prev) => prev + 1);

    const fresh = buildEncounterState(encounter);
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
    setFacingCompassCoord(null);
    setHoveredCoord(null);
    clearFloatingTexts();
  }, [encounter, clearFloatingTexts]);

  return {
    state,
    activeCu,
    activeCoord,
    phase,
    aiSpeed,
    setAiSpeed,
    hostileActionStatus,
    get isOpeningInitiativeActive() {
      return isOpeningInitiativeActiveRef.current;
    },
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
