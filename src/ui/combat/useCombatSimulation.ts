import { useState, useCallback, useMemo } from 'react';
import { HexCoord, getHexesInRange } from '../../core/grid/hex';
import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
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

export interface UseCombatSimulationOptions {
  readonly encounterFactory: (options?: NoviceSandboxOptions | readonly Ability[]) => EncounterDefinition;
  readonly initialKit?: readonly Ability[];
  readonly onRerollKit?: () => readonly Ability[];
  readonly classRegistry?: ClassRegistry;
}

/**
 * Orchestrates combat interaction state, action selection, and player intent dispatch.
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
  const [activePlayerUnit, setActivePlayerUnit] = useState<Unit | undefined>(undefined);
  const [reconciliationResult, setReconciliationResult] = useState<PostBattleReconciliationResult | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

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

  // Computes candidate tiles in range when an ability is selected
  const abilityRangeCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !playerCoord) {
      return [];
    }
    return getHexesInRange(playerCoord, selectedAbility.range);
  }, [actionMode, selectedAbility, playerCoord]);

  // Candidate targets within ability range that pass validation
  const candidateTargetCoords = useMemo<HexCoord[]>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !playerCoord) {
      return [];
    }
    return abilityRangeCoords.filter((coord) => {
      const targetUnitId = state.arena.getUnitAt(coord);
      const validation = canExecuteAbility(state, 'player', selectedAbility, {
        coord,
        targetUnitId
      });
      return validation.valid;
    });
  }, [actionMode, selectedAbility, playerCoord, abilityRangeCoords, state]);

  // Live damage/hit preview on hovered target
  const targetPreview = useMemo<TargetPreview | null>(() => {
    if (actionMode !== 'ABILITY' || !selectedAbility || !hoveredCoord || !playerCu) {
      return null;
    }
    return computeTargetPreview(
      state,
      'player',
      selectedAbility,
      hoveredCoord
    );
  }, [actionMode, selectedAbility, hoveredCoord, playerCu, state]);

  // Check and trigger post-battle reconciliation if outcome becomes VICTORY
  const checkEncounterProgression = useCallback(
    (nextState: CombatState) => {
      if (nextState.outcome === 'VICTORY') {
        const pCu = nextState.units.get('player');
        if (pCu) {
          const currentUnit = activePlayerUnit ?? pCu.unit;
          const result = reconcilePostBattleProgression(
            currentUnit,
            pCu.inBattleXp,
            registry,
            { bankedXp }
          );
          setReconciliationResult(result);
          setIsVictoryModalOpen(true);
        }
      }
    },
    [activePlayerUnit, registry, bankedXp]
  );

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

  // Automatically steps passive dummy turns
  const autoAdvancePassiveDummies = useCallback(
    (currentState: CombatState) => {
      let loops = 0;
      while (
        currentState.activeUnitId &&
        currentState.activeUnitId !== 'player' &&
        loops < 10
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
      if (actionMode === 'MOVE') {
        const validation = canMove(state, 'player', coord);
        if (validation.valid) {
          executeMove(state, 'player', coord);
          addFloatingText('Move', 'buff', coord);
          setActionMode('IDLE');
          setState({ ...state });
          checkEncounterProgression(state);
        } else {
          addFloatingText(validation.reason, 'miss', coord);
        }
      } else if (actionMode === 'ABILITY' && selectedAbility) {
        const targetUnitId = state.arena.getUnitAt(coord);
        const validation = canExecuteAbility(state, 'player', selectedAbility, {
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
            'player',
            selectedAbility,
            { coord, targetUnitId },
            roller
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
          checkEncounterProgression(state);
        } else if (targetUnitId) {
          addFloatingText(validation.reason, 'miss', coord);
        }
      }
    },
    [
      actionMode,
      selectedAbility,
      state,
      playerCoord,
      diceMode,
      addFloatingText,
      dispatchResolutionFeedback,
      checkEncounterProgression
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
    checkEncounterProgression(state);
  }, [playerCu, playerCoord, state, addFloatingText, autoAdvancePassiveDummies, checkEncounterProgression]);

  // Resolves player choice when multiple archetypes qualified simultaneously
  const handleSelectArchetypeChoice = useCallback(
    (archetype: Archetype) => {
      const pCu = state.units.get('player');
      if (!pCu) return;
      const currentUnit = activePlayerUnit ?? pCu.unit;
      const result = reconcilePostBattleProgression(
        currentUnit,
        pCu.inBattleXp,
        registry,
        { bankedXp, selectedArchetypeChoice: archetype }
      );
      setReconciliationResult(result);
    },
    [state.units, activePlayerUnit, registry, bankedXp]
  );

  // Swaps an unlocked class ability into one of the 3 active loadout slots
  const handleSwapAbility = useCallback(
    (slotIndex: number, newAbility: Ability) => {
      const pCu = state.units.get('player');
      if (!pCu) return;
      const currentUnit = activePlayerUnit ?? pCu.unit;
      const wildcardAbilityIds = [...currentUnit.loadout.wildcardAbilityIds];
      wildcardAbilityIds[slotIndex] = newAbility.id;

      const updatedUnit: Unit = {
        ...currentUnit,
        loadout: {
          ...currentUnit.loadout,
          wildcardAbilityIds
        }
      };

      const currentAbilities = [...pCu.abilities];
      currentAbilities[slotIndex] = newAbility;
      Object.assign(pCu, { unit: updatedUnit, abilities: currentAbilities });
      setActivePlayerUnit(updatedUnit);
      setState({ ...state });
    },
    [state, activePlayerUnit]
  );

  // Resets the arena encounter while retaining the upgraded unit
  const handleRematch = useCallback(() => {
    if (!reconciliationResult) return;
    const pCu = state.units.get('player');
    const currentUnit = activePlayerUnit ?? pCu?.unit;
    if (!currentUnit) return;

    const newActiveClassId = reconciliationResult.unlockedClass
      ? reconciliationResult.unlockedClass.id
      : currentUnit.loadout.activeClassId;

    const upgradedUnit: Unit = {
      ...currentUnit,
      name: reconciliationResult.unlockedClass
        ? `Alden (${reconciliationResult.unlockedClass.name})`
        : currentUnit.name,
      progression: reconciliationResult.updatedProgression,
      baseAttributes: reconciliationResult.updatedAttributes,
      effectiveVitals: reconciliationResult.updatedVitals,
      loadout: {
        ...currentUnit.loadout,
        activeClassId: newActiveClassId
      }
    };

    setActivePlayerUnit(upgradedUnit);
    setBankedXp(reconciliationResult.carryoverXp);
    setReconciliationResult(null);
    setIsVictoryModalOpen(false);

    const fresh = buildEncounterState(
      encounterFactory({ playerUnitOverride: upgradedUnit })
    );
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
    setHoveredCoord(null);
    clearFloatingTexts();
  }, [reconciliationResult, state.units, activePlayerUnit, encounterFactory, clearFloatingTexts]);

  // Full reset back to blank slate Level 0 recruit
  const handleResetEncounter = useCallback(() => {
    setActivePlayerUnit(undefined);
    setBankedXp({ fighter: 0, rogue: 0, mage: 0 });
    setReconciliationResult(null);
    setIsVictoryModalOpen(false);

    const fresh = buildEncounterState(encounterFactory(currentKit));
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
    setActivePlayerUnit(undefined);
    setBankedXp({ fighter: 0, rogue: 0, mage: 0 });
    setReconciliationResult(null);
    setIsVictoryModalOpen(false);

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
    reconciliationResult,
    isVictoryModalOpen,
    setIsVictoryModalOpen,
    selectAction,
    handleTileClick,
    handleEndTurn,
    handleSelectArchetypeChoice,
    handleSwapAbility,
    handleRematch,
    handleResetEncounter,
    handleRerollKit
  };
}
