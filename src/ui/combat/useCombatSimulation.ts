import { useState, useCallback, useMemo } from 'react';
import { HexCoord, hexDistance, getHexesInRange } from '../../core/grid/hex';
import { Ability } from '../../core/types/ability';
import { CombatState } from '../../core/combat/types';
import {
  canMove,
  executeMove,
  canExecuteAbility,
  executeAbility
} from '../../core/combat/resolver';
import { endActiveTurn } from '../../core/combat/turnClock';
import {
  EncounterDefinition,
  buildEncounterState
} from '../../core/combat/encounter';
import { TargetPreview, computeTargetPreview } from '../../core/combat/targetPreview';
import { DiceMode, DevDiceRoller } from './devDice';
import { useFloatingCombatText } from './useFloatingCombatText';

export type ActionMode = 'IDLE' | 'MOVE' | 'ABILITY';

export interface UseCombatSimulationOptions {
  readonly encounterFactory: (abilitiesOverride?: readonly Ability[]) => EncounterDefinition;
  readonly initialKit?: readonly Ability[];
  readonly onRerollKit?: () => readonly Ability[];
}

/**
 * Orchestrates combat interaction state, action selection, and player intent dispatch.
 */
export function useCombatSimulation({
  encounterFactory,
  initialKit,
  onRerollKit
}: UseCombatSimulationOptions) {
  const [currentKit, setCurrentKit] = useState<readonly Ability[] | undefined>(initialKit);
  const [state, setState] = useState<CombatState>(() =>
    buildEncounterState(encounterFactory(initialKit))
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

  const playerCu = useMemo(() => state.units.get('player'), [state]);
  const playerCoord = useMemo(
    () => state.arena.getUnitPosition('player'),
    [state]
  );

  // Computes reachable tiles when in MOVE mode
  const reachableCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'MOVE' || !playerCoord || !playerCu || playerCu.currentAp < 1) {
      return [];
    }
    return state.arena.getReachableHexes(playerCoord, playerCu.unit.effectiveVitals.move);
  }, [actionMode, playerCoord, playerCu, state.arena]);

  // Computes effect range footprint hexes when an ability is selected
  const abilityRangeCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !playerCoord || !playerCu) {
      return [];
    }
    if (selectedAbility.targetType === 'SELF') {
      return [playerCoord];
    }
    const hexes = getHexesInRange(playerCoord, selectedAbility.range);
    const validHexes = hexes.filter((coord) => state.arena.getTile(coord) !== undefined);
    if (selectedAbility.targetType === 'SINGLE_TARGET') {
      return validHexes.filter((coord) => coord.q !== playerCoord.q || coord.r !== playerCoord.r);
    }
    return validHexes;
  }, [actionMode, selectedAbility, playerCoord, playerCu, state.arena]);

  // Computes candidate target tiles with valid targets within range
  const candidateTargetCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !playerCoord || !playerCu) {
      return [];
    }

    if (selectedAbility.targetType === 'SELF') {
      return [playerCoord];
    }

    const results: HexCoord[] = [];
    for (const [unitId, cu] of state.units) {
      if (cu.isDefeated) continue;
      const coord = state.arena.getUnitPosition(unitId);
      if (!coord) continue;

      if (hexDistance(playerCoord, coord) > selectedAbility.range) {
        continue;
      }

      const validation = canExecuteAbility(state, 'player', selectedAbility, {
        coord,
        targetUnitId: unitId
      });

      if (validation.valid) {
        results.push(coord);
      }
    }
    return results;
  }, [actionMode, selectedAbility, playerCoord, playerCu, state]);

  // Target preview projected against hovered coordinate
  const targetPreview = useMemo<TargetPreview | null>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !hoveredCoord) {
      return null;
    }
    return computeTargetPreview(state, 'player', selectedAbility, hoveredCoord);
  }, [actionMode, selectedAbility, hoveredCoord, state]);

  // Turn auto-advancement past passive dummies
  const autoAdvancePassiveDummies = useCallback((currentState: CombatState) => {
    while (currentState.activeUnitId !== 'player') {
      const activeDummy = currentState.units.get(currentState.activeUnitId);
      currentState.combatLog.push({
        turnNumber: currentState.turnNumber,
        actorUnitId: currentState.activeUnitId,
        actionId: 'wait',
        message: `${activeDummy?.unit.name ?? 'Dummy'} passed turn.`
      });
      endActiveTurn(currentState);
    }
  }, []);

  // Action Mode Selection
  const selectAction = useCallback(
    (action: Ability | 'MOVE' | null) => {
      if (action === 'MOVE') {
        setActionMode('MOVE');
        setSelectedAbility(null);
      } else if (action === null) {
        setActionMode('IDLE');
        setSelectedAbility(null);
      } else {
        setActionMode('ABILITY');
        setSelectedAbility(action);
      }
    },
    []
  );

  // Click handler for arena tiles
  const handleTileClick = useCallback(
    (coord: HexCoord) => {
      if (!playerCu || playerCu.isDefeated) return;

      // 1. Move Execution
      if (actionMode === 'MOVE') {
        const canDoMove = canMove(state, 'player', coord);
        if (canDoMove.valid) {
          executeMove(state, 'player', coord);
          addFloatingText('Move (1 AP)', 'buff', coord);
          setActionMode('IDLE');
          setState({ ...state });
        }
        return;
      }

      // 2. Ability Execution
      if (actionMode === 'ABILITY' && selectedAbility) {
        const targetUnitId = state.arena.getUnitAt(coord);
        const targetOption =
          selectedAbility.targetType === 'SELF'
            ? undefined
            : { coord, targetUnitId: targetUnitId ?? undefined };

        const validation = canExecuteAbility(
          state,
          'player',
          selectedAbility,
          targetOption
        );

        if (validation.valid) {
          const diceRoller = new DevDiceRoller(diceMode);
          const targetCoordBefore = targetUnitId
            ? state.arena.getUnitPosition(targetUnitId)
            : coord;

          const resolution = executeAbility(
            state,
            'player',
            selectedAbility,
            targetOption,
            diceRoller
          );

          dispatchResolutionFeedback(
            state,
            resolution,
            selectedAbility,
            targetCoordBefore,
            playerCoord,
            coord,
            targetUnitId ?? undefined
          );

          setActionMode('IDLE');
          setSelectedAbility(null);
          setState({ ...state });
        } else if (targetUnitId) {
          addFloatingText(validation.reason, 'miss', coord);
        }
      }
    },
    [
      actionMode,
      selectedAbility,
      state,
      playerCu,
      playerCoord,
      diceMode,
      addFloatingText,
      dispatchResolutionFeedback
    ]
  );

  // End Turn with unspent AP refund
  const handleEndTurn = useCallback(() => {
    if (!playerCu) return;
    const unspent = playerCu.currentAp;
    addFloatingText(`+${unspent * 20} CTB Gauge`, 'buff', playerCoord ?? { q: 0, r: 0 });

    endActiveTurn(state);
    autoAdvancePassiveDummies(state);

    setActionMode('IDLE');
    setSelectedAbility(null);
    setState({ ...state });
  }, [playerCu, playerCoord, state, addFloatingText, autoAdvancePassiveDummies]);

  // Reset encounter
  const handleResetEncounter = useCallback(() => {
    const fresh = buildEncounterState(encounterFactory(currentKit));
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
    setHoveredCoord(null);
    clearFloatingTexts();
  }, [currentKit, encounterFactory, clearFloatingTexts]);

  // Re-roll ability kit
  const handleRerollKit = useCallback(() => {
    if (!onRerollKit) return;
    const newKit = onRerollKit();
    setCurrentKit(newKit);
    const fresh = buildEncounterState(encounterFactory(newKit));
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
  }, [encounterFactory, onRerollKit]);


  return {
    state,
    playerCu,
    playerCoord,
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
  };
}
