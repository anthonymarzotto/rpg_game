import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { HexCoord, HexDirection } from '../../core/grid/hex';
import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
import { UnitLoadout } from '../../core/types/loadout';
import { CombatState, InBattleXp, DiceRollBreakdown } from '../../core/combat/types';
import { canMove, canExecuteAbility, getAbilityRangeCoords } from '../../core/combat/validator';
import { executeMove, executeSetFacing, executeAbility } from '../../core/combat/resolver';
import { endActiveTurn, calculateTurnTransitionTicks } from '../../core/combat/turnClock';
import { getEffectiveSpeed } from '../../core/combat/effectiveVitals';
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
  executeHostileTurnAsync,
  calculateClockPacing
} from './asyncTurnSequencer';

export type ActionMode = 'IDLE' | 'MOVE' | 'ABILITY';
export type CombatPhase = 'PLAYER_ACTION' | 'HOSTILE_TURN' | 'VICTORY' | 'DEFEAT';
export type DiceTrayMode = 'ALL' | 'PLAYER_ONLY' | 'OFF';

export interface ActiveDiceRollState {
  readonly attackerName: string;
  readonly targetName: string;
  readonly abilityName: string;
  readonly diceBreakdown: DiceRollBreakdown;
  readonly attackerUnit?: Unit;
  readonly targetUnit?: Unit;
  readonly targetHpBefore?: number;
  readonly targetHpAfter?: number;
  readonly targetMaxHp?: number;
  readonly onComplete: () => void;
}

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
  const pinnedUnitIdRef = useRef<string | null>(null);
  const [pinnedUnitId, setPinnedUnitIdState] = useState<string | null>(null);

  const setPinnedUnitId = useCallback(
    (action: string | null | ((prev: string | null) => string | null)) => {
      const next = typeof action === 'function' ? action(pinnedUnitIdRef.current) : action;
      pinnedUnitIdRef.current = next;
      setPinnedUnitIdState(next);
    },
    []
  );

  const [diceMode, setDiceMode] = useState<DiceMode>('NORMAL');

  const STORAGE_KEY_DICE_TRAY = 'astral_tactics_dice_tray_enabled';
  const STORAGE_KEY_DICE_TRAY_MODE = 'astral_tactics_dice_tray_mode';
  const diceTrayModeRef = useRef<DiceTrayMode>('ALL');
  const [diceTrayMode, setDiceTrayModeState] = useState<DiceTrayMode>(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY_DICE_TRAY_MODE);
      if (savedMode === 'ALL' || savedMode === 'PLAYER_ONLY' || savedMode === 'OFF') {
        diceTrayModeRef.current = savedMode;
        return savedMode;
      }
      const legacySaved = localStorage.getItem(STORAGE_KEY_DICE_TRAY);
      if (legacySaved !== null) {
        const migrated: DiceTrayMode = legacySaved === 'false' ? 'OFF' : 'ALL';
        diceTrayModeRef.current = migrated;
        return migrated;
      }
      diceTrayModeRef.current = 'ALL';
      return 'ALL';
    } catch {
      return 'ALL';
    }
  });

  const setDiceTrayMode = useCallback(
    (action: DiceTrayMode | ((prev: DiceTrayMode) => DiceTrayMode)) => {
      const next = typeof action === 'function' ? action(diceTrayModeRef.current) : action;
      diceTrayModeRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEY_DICE_TRAY_MODE, next);
        localStorage.setItem(STORAGE_KEY_DICE_TRAY, String(next !== 'OFF'));
      } catch {
        // ignore storage error in restricted contexts
      }
      setDiceTrayModeState(next);
    },
    []
  );

  const cycleDiceTrayMode = useCallback(() => {
    setDiceTrayMode((prev) =>
      prev === 'ALL' ? 'PLAYER_ONLY' : prev === 'PLAYER_ONLY' ? 'OFF' : 'ALL'
    );
  }, [setDiceTrayMode]);

  const isDiceTrayEnabled = diceTrayMode !== 'OFF';
  const setIsDiceTrayEnabled = useCallback(
    (action: boolean | ((prev: boolean) => boolean)) => {
      const prevBool = diceTrayModeRef.current !== 'OFF';
      const nextBool = typeof action === 'function' ? action(prevBool) : action;
      setDiceTrayMode(nextBool ? 'ALL' : 'OFF');
    },
    [setDiceTrayMode]
  );

  const activeDiceRollRef = useRef<ActiveDiceRollState | null>(null);
  const [activeDiceRoll, setActiveDiceRollState] = useState<ActiveDiceRollState | null>(null);

  const setActiveDiceRoll = useCallback((val: ActiveDiceRollState | null) => {
    activeDiceRollRef.current = val;
    setActiveDiceRollState(val);
  }, []);

  const isOpeningInitiativeActiveRef = useRef<boolean>(true);
  const [isOpeningInitiativeActive, setIsOpeningInitiativeActiveState] = useState<boolean>(true);

  const setIsOpeningInitiativeActive = useCallback((active: boolean) => {
    isOpeningInitiativeActiveRef.current = active;
    setIsOpeningInitiativeActiveState(active);
  }, []);

  const openingTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clockIntervalRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const pendingInitiativeItemsRef = useRef<Array<{ text: string; type: FloatingText['type']; coord: HexCoord }>>([]);

  useEffect(() => {
    return () => {
      for (const t of clockIntervalRef.current) {
        clearInterval(t);
      }
      clockIntervalRef.current = [];
    };
  }, []);

  const {
    floatingTextsRef,
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

  const lastTurnStartEmittedRef = useRef<number>(-1);

  // Emit turn start floating text ("My Turn!" for players, unit name for hostiles)
  useEffect(() => {
    if (
      !state.activeUnitId ||
      state.outcome !== 'IN_PROGRESS' ||
      isOpeningInitiativeActiveRef.current ||
      lastTurnStartEmittedRef.current === state.turnNumber
    ) {
      return;
    }

    lastTurnStartEmittedRef.current = state.turnNumber;
    const cu = state.units.get(state.activeUnitId);
    const coord = state.arena.getUnitPosition(state.activeUnitId);
    if (cu && coord) {
      const isPlayer = (cu.faction ?? cu.unit.faction ?? 'PLAYER') === 'PLAYER';
      const text = isPlayer ? 'My Turn!' : cu.unit.name;
      addFloatingText(text, 'buff', coord);
    }
  }, [
    state.activeUnitId,
    state.turnNumber,
    isOpeningInitiativeActive,
    state.outcome,
    state.units,
    state.arena,
    addFloatingText
  ]);

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
    let preActionTargetId: string | undefined;
    let preActionTargetCoord: HexCoord | undefined;
    let preActionTargetHp: number | undefined;

    const observer: CombatExecutionObserver = {
      onTurnTransitionStart: () => {
        setHostileActionStatus('Preparing turn...');
      },
      onClockAdvancing: () => {
        setHostileActionStatus('Advancing initiative...');
      },
      onActionStart: (_actor, action, description) => {
        if (action.type === 'ABILITY' && action.target.targetUnitId) {
          preActionTargetId = action.target.targetUnitId;
          preActionTargetCoord = state.arena.getUnitPosition(preActionTargetId);
          preActionTargetHp = state.units.get(preActionTargetId)?.currentHp;
        } else {
          preActionTargetId = undefined;
          preActionTargetCoord = undefined;
          preActionTargetHp = undefined;
        }
        setHostileActionStatus(description);
      },
      onActionResolved: (actor, _action, result) => {
        if (result.type === 'MOVE') {
          addFloatingText('Move', 'buff', result.destination);
          setState({
            ...state,
            combatLog: [...state.combatLog],
            aiDecisionLog: state.aiDecisionLog ? [...state.aiDecisionLog] : []
          });
          checkEncounterProgression(state);
          return;
        }

        if (result.type === 'ABILITY') {
          const targetUnitId = result.target.targetUnitId;
          const targetCoordBefore =
            preActionTargetCoord ??
            (targetUnitId ? state.arena.getUnitPosition(targetUnitId) : result.target.coord);
          const actorCoord = state.arena.getUnitPosition(state.activeUnitId);
          const targetCu = targetUnitId ? state.units.get(targetUnitId) : undefined;
          const targetHpBefore = preActionTargetHp ?? targetCu?.currentHp;
          const targetHpAfter = targetCu?.currentHp;
          const targetMaxHp = targetCu?.unit.effectiveVitals.maxHp;

          const shouldShowHostileTray =
            diceTrayModeRef.current === 'ALL' &&
            aiSpeed !== 'INSTANT' &&
            result.resolution.type === 'ATTACK' &&
            Boolean(result.resolution.details.diceBreakdown);

          if (shouldShowHostileTray && result.resolution.type === 'ATTACK' && result.resolution.details.diceBreakdown) {
            const hostileDiceBreakdown = result.resolution.details.diceBreakdown;
            const wasDefeated = Boolean(targetCu?.isDefeated);
            const outcomeAfter = state.outcome;

            // Preserve pre-attack target HP and hex presence on the board while the Clash Tray is open (UX.20)
            if (targetCu && targetHpBefore !== undefined) {
              targetCu.currentHp = targetHpBefore;
              if (wasDefeated) {
                targetCu.isDefeated = false;
                if (targetCoordBefore && !state.arena.getUnitAt(targetCoordBefore)) {
                  state.arena.setUnitPosition(targetCu.unit.id, targetCoordBefore);
                }
              }
            }
            if (outcomeAfter !== 'IN_PROGRESS') {
              state.outcome = 'IN_PROGRESS';
            }

            return new Promise<void>((resolve) => {
              let settled = false;
              const finalizeHostileAttack = () => {
                if (settled) return;
                settled = true;
                controller.signal.removeEventListener('abort', onAbort);

                if (targetCu && targetHpAfter !== undefined) {
                  targetCu.currentHp = targetHpAfter;
                  if (wasDefeated) {
                    targetCu.isDefeated = true;
                    if (
                      targetCoordBefore &&
                      state.arena.getUnitAt(targetCoordBefore) === targetCu.unit.id
                    ) {
                      state.arena.removeUnit(targetCu.unit.id);
                    }
                  }
                }
                state.outcome = outcomeAfter;

                dispatchResolutionFeedback(
                  state,
                  result.resolution,
                  result.ability,
                  targetCoordBefore,
                  actorCoord,
                  result.target.coord ?? targetCoordBefore ?? { q: 0, r: 0 },
                  targetUnitId
                );
                setActiveDiceRoll(null);
                setState({
                  ...state,
                  combatLog: [...state.combatLog],
                  aiDecisionLog: state.aiDecisionLog ? [...state.aiDecisionLog] : []
                });
                checkEncounterProgression(state);
                resolve();
              };

              const onAbort = () => {
                if (settled) return;
                settled = true;
                if (targetCu && targetHpAfter !== undefined) {
                  targetCu.currentHp = targetHpAfter;
                  if (wasDefeated) {
                    targetCu.isDefeated = true;
                    if (
                      targetCoordBefore &&
                      state.arena.getUnitAt(targetCoordBefore) === targetCu.unit.id
                    ) {
                      state.arena.removeUnit(targetCu.unit.id);
                    }
                  }
                }
                state.outcome = outcomeAfter;
                setActiveDiceRoll(null);
                resolve();
              };

              controller.signal.addEventListener('abort', onAbort, { once: true });

              setActiveDiceRoll({
                attackerName: actor.unit.name,
                targetName: targetCu?.unit.name ?? 'Target Hex',
                abilityName: result.ability.name,
                diceBreakdown: hostileDiceBreakdown,
                attackerUnit: actor.unit,
                targetUnit: targetCu?.unit,
                targetHpBefore,
                targetHpAfter,
                targetMaxHp,
                onComplete: finalizeHostileAttack
              });
            });
          }

          dispatchResolutionFeedback(
            state,
            result.resolution,
            result.ability,
            targetCoordBefore,
            actorCoord,
            result.target.coord ?? targetCoordBefore ?? { q: 0, r: 0 },
            targetUnitId
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
        const actorCoord = state.arena.getUnitPosition(actor.unit.id);
        if (unspentAp > 0) {
          addFloatingText(
            `+${unspentAp * 20} Initiative`,
            'buff',
            actorCoord ?? { q: 0, r: 0 }
          );
        } else {
          addFloatingText(
            'Turn End',
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
      if (activeDiceRollRef.current) {
        activeDiceRollRef.current.onComplete();
        return;
      }

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
        const clickedUnitId = state.arena.getUnitAt(coord);
        if (clickedUnitId) {
          setPinnedUnitId((prev) => (prev === clickedUnitId ? null : clickedUnitId));
        } else {
          setPinnedUnitId(null);
        }
      } else if (actionMode === 'ABILITY' && selectedAbility) {
        const targetUnitId = state.arena.getUnitAt(coord);
        const validation = canExecuteAbility(state, state.activeUnitId, selectedAbility, {
          coord,
          targetUnitId
        });

        if (validation.valid) {
          const targetCu = targetUnitId ? state.units.get(targetUnitId) : undefined;
          const targetHpBefore = targetCu?.currentHp;
          const targetMaxHp = targetCu?.unit.effectiveVitals.maxHp;
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

          const targetHpAfter = targetCu?.currentHp;
          const wasDefeated = Boolean(targetCu?.isDefeated);
          const outcomeAfter = state.outcome;
          const shouldShowPlayerTray =
            diceTrayModeRef.current !== 'OFF' &&
            resolution.type === 'ATTACK' &&
            Boolean(resolution.details.diceBreakdown);

          if (shouldShowPlayerTray) {
            if (targetCu && targetHpBefore !== undefined) {
              targetCu.currentHp = targetHpBefore;
              if (wasDefeated) {
                targetCu.isDefeated = false;
                if (targetCoordBefore && !state.arena.getUnitAt(targetCoordBefore)) {
                  state.arena.setUnitPosition(targetCu.unit.id, targetCoordBefore);
                }
              }
            }
            if (outcomeAfter !== 'IN_PROGRESS') {
              state.outcome = 'IN_PROGRESS';
            }
          }

          const applyFeedbackAndProgress = () => {
            if (shouldShowPlayerTray) {
              if (targetCu && targetHpAfter !== undefined) {
                targetCu.currentHp = targetHpAfter;
                if (wasDefeated) {
                  targetCu.isDefeated = true;
                  if (
                    targetCoordBefore &&
                    state.arena.getUnitAt(targetCoordBefore) === targetCu.unit.id
                  ) {
                    state.arena.removeUnit(targetCu.unit.id);
                  }
                }
              }
              state.outcome = outcomeAfter;
            }

            dispatchResolutionFeedback(
              state,
              resolution,
              selectedAbility,
              targetCoordBefore,
              activeCoord,
              coord,
              targetUnitId ?? undefined
            );
            setActiveDiceRoll(null);
            setState({ ...state, combatLog: [...state.combatLog] });
            checkEncounterProgression(state);
          };

          setActionMode('IDLE');
          setSelectedAbility(null);

          if (shouldShowPlayerTray && resolution.type === 'ATTACK' && resolution.details.diceBreakdown) {
            const attackerName = activeCu.unit.name;
            const targetName = targetCu?.unit.name ?? 'Target Hex';

            setActiveDiceRoll({
              attackerName,
              targetName,
              abilityName: selectedAbility.name,
              diceBreakdown: resolution.details.diceBreakdown,
              attackerUnit: activeCu.unit,
              targetUnit: targetCu?.unit,
              targetHpBefore,
              targetHpAfter,
              targetMaxHp,
              onComplete: applyFeedbackAndProgress
            });
          } else {
            applyFeedbackAndProgress();
          }
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
      activeDiceRoll,
      isDiceTrayEnabled,
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
    if (unspent > 0) {
      addFloatingText(`+${unspent * 20} Initiative`, 'buff', activeCoord ?? { q: 0, r: 0 });
    } else {
      addFloatingText('Turn End', 'buff', activeCoord ?? { q: 0, r: 0 });
    }

    setActionMode('IDLE');
    setSelectedAbility(null);
    setFacingCompassCoord(null);

    const ticks = calculateTurnTransitionTicks(state, activeCu.unit.id, unspent);
    const clockPacing = calculateClockPacing(ticks, aiSpeed);

    if (clockPacing.totalDurationMs === 0) {
      endActiveTurn(state);
      setState({ ...state, combatLog: [...state.combatLog] });
      checkEncounterProgression(state);
    } else {
      setHostileActionStatus('Advancing initiative...');
      let elapsedTicks = 0;
      for (const t of clockIntervalRef.current) {
        clearInterval(t);
      }
      clockIntervalRef.current = [];

      const timer = setInterval(() => {
        elapsedTicks++;
        if (elapsedTicks >= ticks) {
          clearInterval(timer);
          clockIntervalRef.current = clockIntervalRef.current.filter((t) => t !== timer);
          endActiveTurn(state);
          setHostileActionStatus(null);
          setState({ ...state, combatLog: [...state.combatLog] });
          checkEncounterProgression(state);
        } else {
          for (const cu of state.units.values()) {
            if (!cu.isDefeated) {
              cu.initiativeGauge = Math.min(100, cu.initiativeGauge + getEffectiveSpeed(cu));
            }
          }
          setState({ ...state });
        }
      }, clockPacing.stepIntervalMs);
      clockIntervalRef.current.push(timer);
    }
  }, [
    phase,
    activeCu,
    activeCoord,
    state,
    aiSpeed,
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
      setPinnedUnitId(null);
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
    setPinnedUnitId(null);
    clearFloatingTexts();
  }, [encounter, clearFloatingTexts]);

  // Global keydown listener for Escape (dismiss ability targeting / unpin unit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (actionMode === 'ABILITY' || actionMode === 'MOVE') {
          setActionMode('IDLE');
          setSelectedAbility(null);
        } else if (pinnedUnitId) {
          setPinnedUnitId(null);
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [actionMode, pinnedUnitId]);

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
    get pinnedUnitId() {
      return pinnedUnitIdRef.current;
    },
    setPinnedUnitId,
    diceMode,
    setDiceMode,
    get diceTrayMode() {
      return diceTrayModeRef.current;
    },
    setDiceTrayMode,
    cycleDiceTrayMode,
    get isDiceTrayEnabled() {
      return diceTrayModeRef.current !== 'OFF';
    },
    setIsDiceTrayEnabled,
    get activeDiceRoll() {
      return activeDiceRollRef.current;
    },
    get floatingTexts() {
      return floatingTextsRef.current;
    },
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
