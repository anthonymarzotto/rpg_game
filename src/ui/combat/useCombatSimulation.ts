import { useState, useCallback, useMemo } from 'react';
import { HexCoord, getHexesInRange } from '../../core/grid/hex';
import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
import { UnitLoadout } from '../../core/types/loadout';
import { Archetype } from '../../core/types/class';
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
  PostBattleReconciliationResult,
  reconcilePostBattleProgression
} from '../../core/progression/postBattle';
import { ClassRegistry, createClassRegistry } from '../../core/progression/registry';
import { CLASS_CATALOG } from '../../data/classes';
import { NoviceSandboxOptions } from '../../data/encounters/noviceSandbox';

export type ActionMode = 'IDLE' | 'MOVE' | 'ABILITY';

export interface SquadMemberReconciliation {
  readonly unit: Unit;
  readonly result: PostBattleReconciliationResult;
}

export interface UseCombatSimulationOptions {
  readonly encounterFactory: (options?: NoviceSandboxOptions) => EncounterDefinition;
  readonly initialKit?: readonly Ability[];
  readonly onRerollKit?: () => readonly Ability[];
  readonly classRegistry?: ClassRegistry;
}

/**
 * Orchestrates combat interaction state, squad turn sequencing, action selection, and intent dispatch.
 */
export function useCombatSimulation({
  encounterFactory,
  initialKit,
  onRerollKit,
  classRegistry: injectedRegistry
}: UseCombatSimulationOptions) {
  const defaultRegistry = useMemo(() => createClassRegistry(CLASS_CATALOG), []);
  const registry = injectedRegistry ?? defaultRegistry;

  const [currentKit, setCurrentKit] = useState<readonly Ability[] | undefined>(initialKit);
  const [bankedXp, setBankedXp] = useState<InBattleXp>({ fighter: 0, rogue: 0, mage: 0 });
  const [reconciliationResult, setReconciliationResult] = useState<PostBattleReconciliationResult | null>(null);
  const [squadReconciliations, setSquadReconciliations] = useState<readonly SquadMemberReconciliation[]>([]);
  const [activeSquadUnitId, setActiveSquadUnitId] = useState<string>('player-warrior');
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  const [state, setState] = useState<CombatState>(() =>
    buildEncounterState(encounterFactory())
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
  const isPlayerTurn = useMemo(
    () => activeCu?.faction === 'PLAYER',
    [activeCu]
  );

  // Computes reachable tiles when in MOVE mode for currently active player unit
  const reachableCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'MOVE' || !activeCoord || !activeCu || !isPlayerTurn || activeCu.currentAp < 1) {
      return [];
    }
    return state.arena.getReachableHexes(activeCoord, activeCu.unit.effectiveVitals.move);
  }, [actionMode, activeCoord, activeCu, isPlayerTurn, state.arena]);

  // Computes candidate tiles in range when an ability is selected
  const abilityRangeCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !activeCoord || !isPlayerTurn) {
      return [];
    }
    return getHexesInRange(activeCoord, selectedAbility.range);
  }, [actionMode, selectedAbility, activeCoord, isPlayerTurn]);

  // Candidate targets within ability range that pass validation (enemies for attacks, allies for buffs)
  const candidateTargetCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !activeCoord || !isPlayerTurn) {
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
  }, [actionMode, selectedAbility, activeCoord, isPlayerTurn, abilityRangeCoords, state]);

  // Live damage/hit/buff preview on hovered target
  const targetPreview = useMemo<TargetPreview | null>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !hoveredCoord || !activeCu || !isPlayerTurn) {
      return null;
    }
    return computeTargetPreview(
      state,
      state.activeUnitId,
      selectedAbility,
      hoveredCoord
    );
  }, [actionMode, selectedAbility, hoveredCoord, activeCu, isPlayerTurn, state]);

  // Check and trigger post-battle reconciliation for all player squad members on VICTORY
  const checkEncounterProgression = useCallback(
    (nextState: CombatState) => {
      if (nextState.outcome === 'VICTORY') {
        const playerUnits = Array.from(nextState.units.values()).filter(
          (cu) => cu.faction === 'PLAYER'
        );

        const reconciliations: SquadMemberReconciliation[] = playerUnits.map((pCu) => {
          const currentUnit = pCu.unit;
          const result = reconcilePostBattleProgression(
            currentUnit,
            pCu.inBattleXp,
            registry,
            { bankedXp }
          );
          return { unit: currentUnit, result };
        });

        setSquadReconciliations(reconciliations);
        if (reconciliations.length > 0) {
          setReconciliationResult(reconciliations[0].result);
          setActiveSquadUnitId(reconciliations[0].unit.id);
        }
        setIsVictoryModalOpen(true);
      }
    },
    [registry, bankedXp]
  );

  // Automatically steps non-player turns until a player unit is active or combat concludes
  // This will be replaced/extended by the Headless AI runner in Phase 2.1
  const advanceNonPlayerTurns = useCallback(
    (currentState: CombatState) => {
      let loops = 0;
      while (
        currentState.activeUnitId &&
        currentState.units.get(currentState.activeUnitId)?.faction !== 'PLAYER' &&
        currentState.outcome === 'IN_PROGRESS' &&
        loops < 20
      ) {
        loops++;
        endActiveTurn(currentState, 0);
      }
    },
    []
  );

  // Dispatches tactical intent on tile click
  const handleTileClick = useCallback(
    (coord: HexCoord) => {
      if (!isPlayerTurn || !activeCu || !activeCoord) return;

      if (actionMode === 'MOVE') {
        const validation = canMove(state, state.activeUnitId, coord);
        if (validation.valid) {
          executeMove(state, state.activeUnitId, coord);
          addFloatingText('Move', 'buff', coord);
          setActionMode('IDLE');
          setState({ ...state });
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
          setState({ ...state });
          checkEncounterProgression(state);
        } else if (targetUnitId) {
          addFloatingText(validation.reason, 'miss', coord);
        }
      }
    },
    [
      isPlayerTurn,
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
    if (!activeCu || !isPlayerTurn) return;
    const unspent = activeCu.currentAp;
    addFloatingText(`+${unspent * 20} CTB Gauge`, 'buff', activeCoord ?? { q: 0, r: 0 });

    endActiveTurn(state);
    advanceNonPlayerTurns(state);

    setActionMode('IDLE');
    setSelectedAbility(null);
    setState({ ...state });
    checkEncounterProgression(state);
  }, [activeCu, isPlayerTurn, activeCoord, state, addFloatingText, advanceNonPlayerTurns, checkEncounterProgression]);

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
      const match = squadReconciliations.find((s) => s.unit.id === unitId);
      if (match) {
        setReconciliationResult(match.result);
      }
    },
    [squadReconciliations]
  );

  // Resolves player choice when multiple archetypes qualified simultaneously for the selected squad unit
  const handleSelectArchetypeChoice = useCallback(
    (archetype: Archetype) => {
      const match = squadReconciliations.find((s) => s.unit.id === activeSquadUnitId);
      if (!match) return;
      const cu = state.units.get(activeSquadUnitId);
      if (!cu) return;

      const updatedResult = reconcilePostBattleProgression(
        match.unit,
        cu.inBattleXp,
        registry,
        { bankedXp, selectedArchetypeChoice: archetype }
      );

      setSquadReconciliations((prev) =>
        prev.map((s) => (s.unit.id === activeSquadUnitId ? { ...s, result: updatedResult } : s))
      );
      setReconciliationResult(updatedResult);
    },
    [squadReconciliations, activeSquadUnitId, state.units, registry, bankedXp]
  );

  // Resets the arena encounter
  const handleRematch = useCallback(
    (_configuredLoadout?: UnitLoadout) => {
      setIsVictoryModalOpen(false);
      setReconciliationResult(null);
      setSquadReconciliations([]);

      const fresh = buildEncounterState(encounterFactory());
      setState(fresh);
      setActionMode('IDLE');
      setSelectedAbility(null);
      setHoveredCoord(null);
      clearFloatingTexts();
    },
    [encounterFactory, clearFloatingTexts]
  );

  // Full reset back to encounter start
  const handleResetEncounter = useCallback(() => {
    setBankedXp({ fighter: 0, rogue: 0, mage: 0 });
    setReconciliationResult(null);
    setSquadReconciliations([]);
    setIsVictoryModalOpen(false);

    const fresh = buildEncounterState(encounterFactory());
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
    setHoveredCoord(null);
    clearFloatingTexts();
  }, [currentKit, encounterFactory, clearFloatingTexts]);

  // Re-roll starter ability kit
  const handleRerollKit = useCallback(() => {
    if (!onRerollKit) return;
    const newKit = onRerollKit();
    setCurrentKit(newKit);
    setBankedXp({ fighter: 0, rogue: 0, mage: 0 });
    setReconciliationResult(null);
    setSquadReconciliations([]);
    setIsVictoryModalOpen(false);

    const fresh = buildEncounterState(encounterFactory());
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
  }, [encounterFactory, onRerollKit]);

  return {
    state,
    activeCu,
    activeCoord,
    isPlayerTurn,
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
  };
}
