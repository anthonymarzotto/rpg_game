import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { HexCoord, HexDirection, HEX_DIRECTIONS, toHexKey } from '../../core/grid/hex';
import { Ability } from '../../core/types/ability';
import { Unit } from '../../core/types/unit';
import { UnitLoadout } from '../../core/types/loadout';
import { CombatState, InBattleXp, DiceRollBreakdown } from '../../core/combat/types';
import { canMove, canExecuteAbility, getAbilityRangeCoords } from '../../core/combat/validator';
import { executeMove, executeSetFacing, executeAbility } from '../../core/combat/resolver';
import { endActiveTurn, calculateTurnTransitionTicks } from '../../core/combat/turnClock';
import { getEffectiveSpeed, getEffectiveMove } from '../../core/combat/effectiveVitals';
import { getBastionZocHexKeys } from '../../core/combat/bastionStance';
import { getRoughTerrainHexKeys } from '../../core/combat/battlefieldZones';
import { hasZeroedInPassive, MAX_ZEROED_IN_STACKS } from '../../core/combat/zeroedIn';
import {
  EncounterDefinition,
  PlacedUnit,
  buildEncounterState
} from '../../core/combat/encounter';
import {
  getDeploymentZones,
  placeSquadTactically
} from '../../core/campaign/encounterGenerator';
import { TargetPreview, computeTargetPreview } from '../../core/combat/targetPreview';
import { SeededDiceRoller } from '../../core/combat/dice';
import { DiceMode, DevDiceRoller } from './devDice';
import {
  useFloatingCombatText,
  collectInitiativeFloatingTexts,
  resolveDamageFloatingText,
  FloatingText
} from './useFloatingCombatText';
import {
  AISpeedMode,
  PACING_PRESETS,
  CombatExecutionObserver,
  executeHostileTurnAsync,
  calculateClockPacing
} from './asyncTurnSequencer';

export type ActionMode = 'IDLE' | 'MOVE' | 'ABILITY';
export type CombatPhase = 'DEPLOYMENT' | 'PLAYER_ACTION' | 'HOSTILE_TURN' | 'VICTORY' | 'DEFEAT';
export type DiceTrayMode = 'ALL' | 'PLAYER_ONLY' | 'OFF';

export const STORAGE_KEY_SAVED_FORMATIONS = 'astral_tactics_saved_formations_v1';

export type SavedFormationsMap = Record<string, Record<string, HexCoord>>;

let inMemorySavedFormations: SavedFormationsMap = {};

export function loadSavedFormationForRadius(radius: number): Record<string, HexCoord> {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_FORMATIONS);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedFormationsMap;
        return parsed?.[String(radius)] ?? {};
      }
    }
  } catch {
    // fallback to in-memory store
  }
  return inMemorySavedFormations[String(radius)] ?? {};
}

export function saveFormationForRadius(radius: number, formation: Record<string, HexCoord>): void {
  inMemorySavedFormations = {
    ...inMemorySavedFormations,
    [String(radius)]: { ...formation }
  };
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_FORMATIONS);
      const parsed: SavedFormationsMap = raw ? JSON.parse(raw) : {};
      parsed[String(radius)] = formation;
      localStorage.setItem(STORAGE_KEY_SAVED_FORMATIONS, JSON.stringify(parsed));
    }
  } catch {
    // ignore storage errors in restricted contexts
  }
}

export function clearSavedFormations(): void {
  inMemorySavedFormations = {};
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_SAVED_FORMATIONS);
    }
  } catch {
    // ignore
  }
}

export function computeWalkableDeploymentCoords(encounter: EncounterDefinition): readonly HexCoord[] {
  const radius = encounter.arenaRadius ?? 3;
  const { playerCoords } = getDeploymentZones(radius);
  const blockedKeys = new Set<string>();
  const enemyKeys = new Set<string>();

  for (const ov of encounter.tileOverrides ?? []) {
    if (ov.isWalkable === false) {
      blockedKeys.add(toHexKey(ov.coord));
    }
  }
  for (const p of encounter.units) {
    if (p.unit.faction === 'ENEMY') {
      enemyKeys.add(toHexKey(p.coord));
    }
  }

  const validCoords: HexCoord[] = [];
  const seenKeys = new Set<string>();

  for (const c of playerCoords) {
    const k = toHexKey(c);
    if (!blockedKeys.has(k) && !enemyKeys.has(k) && !seenKeys.has(k)) {
      seenKeys.add(k);
      validCoords.push(c);
    }
  }

  // Also include any initial player unit coordinates in the encounter if they are valid and walkable
  for (const p of encounter.units) {
    if (p.unit.faction !== 'ENEMY') {
      const k = toHexKey(p.coord);
      if (!blockedKeys.has(k) && !enemyKeys.has(k) && !seenKeys.has(k)) {
        seenKeys.add(k);
        validCoords.push(p.coord);
      }
    }
  }

  return validCoords;
}

export function prepareDeploymentEncounter(
  encounter: EncounterDefinition,
  useSavedFormation: boolean
): EncounterDefinition {
  const radius = encounter.arenaRadius ?? 3;
  const deploymentCoords = computeWalkableDeploymentCoords(encounter);
  const deploymentKeySet = new Set(deploymentCoords.map(toHexKey));

  const playerPlaced = encounter.units.filter((p) => p.unit.faction !== 'ENEMY');
  const enemyPlaced = encounter.units.filter((p) => p.unit.faction === 'ENEMY');

  if (playerPlaced.length === 0 || deploymentCoords.length === 0) {
    return encounter;
  }

  const savedByUnit = useSavedFormation ? loadSavedFormationForRadius(radius) : {};
  const claimedKeys = new Set<string>();
  const preAssigned = new Map<string, HexCoord>();
  const unplacedUnits: Unit[] = [];

  for (const p of playerPlaced) {
    const savedCoord = savedByUnit[p.unit.id];
    const savedKey = savedCoord ? toHexKey(savedCoord) : undefined;
    if (savedCoord && savedKey && deploymentKeySet.has(savedKey) && !claimedKeys.has(savedKey)) {
      claimedKeys.add(savedKey);
      preAssigned.set(p.unit.id, savedCoord);
    } else {
      unplacedUnits.push(p.unit);
    }
  }

  if (unplacedUnits.length > 0) {
    const remainingCoords = deploymentCoords.filter((c) => !claimedKeys.has(toHexKey(c)));
    const tacticallyPlaced = placeSquadTactically(
      unplacedUnits,
      remainingCoords.length > 0 ? remainingCoords : deploymentCoords,
      encounter.tileOverrides ?? [],
      'PLAYER'
    );
    for (const tp of tacticallyPlaced) {
      preAssigned.set(tp.unit.id, tp.coord);
    }
  }

  const updatedPlayers: PlacedUnit[] = playerPlaced.map((p) => ({
    unit: { ...p.unit, faction: 'PLAYER' as const },
    coord: preAssigned.get(p.unit.id) ?? p.coord,
    facing: HEX_DIRECTIONS.EAST
  }));

  return {
    ...encounter,
    units: [...updatedPlayers, ...enemyPlaced]
  };
}

export function createDeploymentPreviewState(encounter: EncounterDefinition): CombatState {
  const prepared = prepareDeploymentEncounter(encounter, true);
  const previewRoller = new SeededDiceRoller(1);
  const state = buildEncounterState(prepared, previewRoller);
  state.turnNumber = 0;
  state.combatLog.length = 0;
  for (const cu of state.units.values()) {
    if ((cu.faction ?? cu.unit.faction ?? 'PLAYER') === 'PLAYER') {
      cu.facing = HEX_DIRECTIONS.EAST;
    }
  }
  return state;
}

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
  readonly startInDeployment?: boolean;
}

/**
 * Orchestrates combat interaction state, squad turn sequencing, action selection, and intent dispatch.
 */
export function useCombatSimulation({
  encounter,
  initialActionMode,
  initialSelectedAbility,
  startInDeployment
}: UseCombatSimulationOptions) {
  const defaultStartInDeployment = useMemo(() => {
    if (startInDeployment !== undefined) return startInDeployment;
    const playerCount = encounter.units.filter((p) => p.unit.faction !== 'ENEMY').length;
    return !Boolean(encounter.initialActiveUnitId) && playerCount >= 2;
  }, [startInDeployment, encounter]);

  const isDeploymentPhaseRef = useRef<boolean>(defaultStartInDeployment);
  const [isDeploymentPhase, setIsDeploymentPhaseState] = useState<boolean>(defaultStartInDeployment);

  const setIsDeploymentPhase = useCallback((val: boolean) => {
    isDeploymentPhaseRef.current = val;
    setIsDeploymentPhaseState(val);
  }, []);

  const selectedDeploymentUnitIdRef = useRef<string | null>(null);
  const [, setSelectedDeploymentUnitIdState] = useState<string | null>(null);

  const setSelectedDeploymentUnitId = useCallback(
    (action: string | null | ((prev: string | null) => string | null)) => {
      const next = typeof action === 'function' ? action(selectedDeploymentUnitIdRef.current) : action;
      selectedDeploymentUnitIdRef.current = next;
      setSelectedDeploymentUnitIdState(next);
    },
    []
  );

  const [squadSummaries, setSquadSummaries] = useState<readonly SquadMemberVictorySummary[]>([]);
  const [activeSquadUnitId, setActiveSquadUnitId] = useState<string>('player-warrior');
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [isDefeatModalOpen, setIsDefeatModalOpen] = useState(false);

  const [aiSpeed, setAiSpeed] = useState<AISpeedMode>('NORMAL');
  const [hostileActionStatus, setHostileActionStatus] = useState<string | null>(null);
  const [encounterSession, setEncounterSession] = useState(0);

  const trialRollerRef = useRef<SeededDiceRoller | null>(null);
  if (!trialRollerRef.current) {
    trialRollerRef.current = new SeededDiceRoller(Date.now());
  }

  const stateRef = useRef<CombatState>(
    defaultStartInDeployment
      ? createDeploymentPreviewState(encounter)
      : buildEncounterState(encounter, trialRollerRef.current!)
  );
  const [state, setStateInternal] = useState<CombatState>(() => stateRef.current);
  const setState = useCallback((next: CombatState | ((prev: CombatState) => CombatState)) => {
    const resolved = typeof next === 'function' ? next(stateRef.current) : next;
    stateRef.current = resolved;
    setStateInternal(resolved);
  }, []);
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

  const isOpeningInitiativeActiveRef = useRef<boolean>(!defaultStartInDeployment);
  const [isOpeningInitiativeActive, setIsOpeningInitiativeActiveState] = useState<boolean>(!defaultStartInDeployment);

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

  // Spawn opening initiative floating text sequentially on mount / encounter reset / deployment confirmation
  useEffect(() => {
    for (const t of openingTimeoutsRef.current) {
      clearTimeout(t);
    }
    openingTimeoutsRef.current = [];

    if (isDeploymentPhaseRef.current) {
      setIsOpeningInitiativeActive(false);
      return;
    }

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
  }, [encounterSession, isDeploymentPhase, addFloatingText]);

  const lastTurnStartEmittedRef = useRef<number>(-1);

  // Emit turn start floating text ("My Turn!" for players, unit name for hostiles) and any turn-start bombardment events
  useEffect(() => {
    if (
      isDeploymentPhaseRef.current ||
      !state.activeUnitId ||
      isOpeningInitiativeActiveRef.current ||
      lastTurnStartEmittedRef.current === state.turnNumber
    ) {
      return;
    }

    lastTurnStartEmittedRef.current = state.turnNumber;

    if (state.lastTurnStartEvents && state.lastTurnStartEvents.length > 0) {
      for (const event of state.lastTurnStartEvents) {
        if (event.type === 'DAMAGE') {
          const eventCoord = event.coord ?? state.arena.getUnitPosition(event.targetUnitId);
          if (eventCoord) {
            const { text, textType, tier } = resolveDamageFloatingText(
              event,
              event.isCrit ? 'CRITICAL_HIT' : 'SOLID_HIT'
            );
            addFloatingText(text, textType, eventCoord, tier);
          }
        } else if (event.type === 'MISS') {
          const eventCoord = event.coord ?? state.arena.getUnitPosition(event.targetUnitId);
          if (eventCoord) {
            addFloatingText('MISS', 'miss', eventCoord, 'standard');
          }
        }
      }
      state.lastTurnStartEvents = [];
    }

    if (state.outcome !== 'IN_PROGRESS') {
      return;
    }

    const cu = state.units.get(state.activeUnitId);
    const coord = state.arena.getUnitPosition(state.activeUnitId);
    if (cu && coord) {
      const isPlayer = (cu.faction ?? cu.unit.faction ?? 'PLAYER') === 'PLAYER';
      const text = isPlayer ? 'My Turn!' : cu.unit.name;
      addFloatingText(text, 'buff', coord);
    }
  }, [
    isDeploymentPhase,
    state.activeUnitId,
    state.turnNumber,
    isOpeningInitiativeActive,
    state.outcome,
    state.units,
    state.arena,
    state.lastTurnStartEvents,
    addFloatingText
  ]);

  // Authoritative interaction phase
  const phase = useMemo<CombatPhase>(() => {
    if (state.outcome === 'VICTORY') return 'VICTORY';
    if (state.outcome === 'DEFEAT') return 'DEFEAT';
    if (isDeploymentPhase) return 'DEPLOYMENT';
    if (activeCu?.faction !== 'PLAYER') return 'HOSTILE_TURN';
    return 'PLAYER_ACTION';
  }, [state.outcome, isDeploymentPhase, activeCu]);

  // Valid West deployment zone coordinates when in DEPLOYMENT phase
  const deploymentZoneCoords = useMemo<readonly HexCoord[]>(() => {
    if (!isDeploymentPhase) return [];
    return computeWalkableDeploymentCoords(encounter);
  }, [isDeploymentPhase, encounter]);

  // Computes reachable tiles when in MOVE mode for currently active player unit
  const reachableCoords = useMemo<HexCoord[]>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'MOVE' || !activeCoord || !activeCu || activeCu.currentAp < 1) {
      return [];
    }
    return state.arena.getReachableHexes(activeCoord, getEffectiveMove(activeCu), {
      terminalHexKeys: getBastionZocHexKeys(state, activeCu.unit.id),
      roughTerrainHexKeys: getRoughTerrainHexKeys(state)
    });
  }, [phase, actionMode, activeCoord, activeCu, state]);

  // Computes candidate tiles in range when an ability is selected
  const abilityRangeCoords = useMemo<HexCoord[]>(() => {
    if (phase !== 'PLAYER_ACTION' || actionMode !== 'ABILITY' || !selectedAbility || !activeCoord || !activeCu) {
      return [];
    }
    return getAbilityRangeCoords(state.arena, activeCoord, selectedAbility, activeCu, state);
  }, [phase, actionMode, selectedAbility, activeCoord, activeCu, state]);

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
    const info = state.arena.findPath(activeCoord, hoveredCoord, getEffectiveMove(activeCu), {
      terminalHexKeys: getBastionZocHexKeys(state, activeCu.unit.id),
      roughTerrainHexKeys: getRoughTerrainHexKeys(state)
    });
    if (!info) {
      return null;
    }
    return {
      destination: info.coord,
      cost: info.cost,
      fallDamage: info.fallDamage,
      path: info.path
    };
  }, [phase, actionMode, activeCoord, hoveredCoord, activeCu, state]);

  // Check and trigger post-battle reconciliation for all player squad members on VICTORY / DEFEAT
  const checkEncounterProgression = useCallback(
    (nextState: CombatState) => {
      if (nextState.outcome === 'VICTORY') {
        const playerUnits = Array.from(nextState.units.values()).filter(
          (cu) => (cu.originalFaction ?? cu.unit.faction ?? cu.faction) === 'PLAYER'
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
      controller.signal,
      trialRollerRef.current ?? undefined
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

  // Resets player unit placement in DEPLOYMENT phase to the role-aware tactical formation
  const handleAutoArrangeDeployment = useCallback(() => {
    if (!isDeploymentPhaseRef.current) return;
    const arranged = prepareDeploymentEncounter(encounter, false);
    for (const p of arranged.units) {
      if (p.unit.faction !== 'ENEMY') {
        state.arena.setUnitPosition(p.unit.id, p.coord);
        const cu = state.units.get(p.unit.id);
        if (cu) cu.facing = HEX_DIRECTIONS.EAST;
      }
    }
    setSelectedDeploymentUnitId(null);
    setState({ ...state });
  }, [encounter, state, setSelectedDeploymentUnitId]);

  // Confirms DEPLOYMENT positions, saves formation by radius, and launches Turn 1 with opening initiative rolls
  const handleConfirmDeployment = useCallback(() => {
    if (!isDeploymentPhaseRef.current) return;
    const radius = encounter.arenaRadius ?? 3;
    const savedMap: Record<string, HexCoord> = {};

    const finalizedUnits: PlacedUnit[] = encounter.units.map((p) => {
      const liveCoord = state.arena.getUnitPosition(p.unit.id) ?? p.coord;
      const isPlayer = p.unit.faction !== 'ENEMY';
      if (isPlayer) {
        savedMap[p.unit.id] = liveCoord;
      }
      return {
        ...p,
        coord: liveCoord,
        facing: isPlayer ? HEX_DIRECTIONS.EAST : (p.facing ?? HEX_DIRECTIONS.WEST)
      };
    });

    saveFormationForRadius(radius, savedMap);

    const finalizedEncounter: EncounterDefinition = {
      ...encounter,
      units: finalizedUnits
    };

    const nextRoller = trialRollerRef.current ?? new SeededDiceRoller(Date.now());
    trialRollerRef.current = nextRoller;
    const liveCombatState = buildEncounterState(finalizedEncounter, nextRoller);

    setSelectedDeploymentUnitId(null);
    setIsDeploymentPhase(false);
    setIsOpeningInitiativeActive(true);
    lastTurnStartEmittedRef.current = -1;
    setState(liveCombatState);
    setEncounterSession((prev) => prev + 1);
  }, [encounter, state, setSelectedDeploymentUnitId, setIsDeploymentPhase, setIsOpeningInitiativeActive]);

  // Dispatches tactical intent on tile click
  const handleTileClick = useCallback(
    (coord: HexCoord) => {
      if (activeDiceRollRef.current) {
        activeDiceRollRef.current.onComplete();
        return;
      }

      if (isDeploymentPhaseRef.current) {
        const clickedUnitId = state.arena.getUnitAt(coord);
        const clickedCu = clickedUnitId ? state.units.get(clickedUnitId) : undefined;
        const isClickedPlayer =
          clickedCu && (clickedCu.faction ?? clickedCu.unit.faction ?? 'PLAYER') === 'PLAYER';
        const isClickedEnemy =
          clickedCu && (clickedCu.faction ?? clickedCu.unit.faction) === 'ENEMY';

        const validDeployKeys = new Set(deploymentZoneCoords.map(toHexKey));
        const isDeployHex = validDeployKeys.has(toHexKey(coord));
        const currentSelectedId = selectedDeploymentUnitIdRef.current;

        if (isClickedPlayer && clickedUnitId) {
          if (!currentSelectedId) {
            setSelectedDeploymentUnitId(clickedUnitId);
            setPinnedUnitId(clickedUnitId);
          } else if (currentSelectedId === clickedUnitId) {
            setSelectedDeploymentUnitId(null);
            setPinnedUnitId(null);
          } else {
            // Swap Unit A (currentSelectedId) and Unit B (clickedUnitId)
            state.arena.swapUnits(currentSelectedId, clickedUnitId);
            const cuA = state.units.get(currentSelectedId);
            if (cuA) cuA.facing = HEX_DIRECTIONS.EAST;
            if (clickedCu) clickedCu.facing = HEX_DIRECTIONS.EAST;
            setSelectedDeploymentUnitId(null);
            setPinnedUnitId(null);
            setState({ ...state });
          }
          return;
        }

        if (!clickedUnitId && isDeployHex && currentSelectedId) {
          state.arena.setUnitPosition(currentSelectedId, coord);
          const cuA = state.units.get(currentSelectedId);
          if (cuA) cuA.facing = HEX_DIRECTIONS.EAST;
          setSelectedDeploymentUnitId(null);
          setState({ ...state });
          return;
        }

        if (isClickedEnemy && clickedUnitId) {
          setPinnedUnitId((prev) => (prev === clickedUnitId ? null : clickedUnitId));
          return;
        }

        if (!clickedUnitId) {
          setPinnedUnitId(null);
        }
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
          const roller = new DevDiceRoller(diceMode, trialRollerRef.current ?? undefined);
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
      deploymentZoneCoords,
      setSelectedDeploymentUnitId,
      setPinnedUnitId,
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
    const willArmCoiledApex =
      unspent > 0 &&
      (activeCu.virtualElevation ?? 0) < 1 &&
      Boolean(activeCu.passives?.some((p) => p.unspentApVirtualHeight));
    const currentZeroedIn = activeCu.zeroedInStacks ?? 0;
    const willGainZeroedIn =
      hasZeroedInPassive(activeCu) &&
      !activeCu.movedThisTurn &&
      (activeCu.hexesMovedThisTurn ?? 0) === 0 &&
      currentZeroedIn < MAX_ZEROED_IN_STACKS;
    if (unspent > 0) {
      addFloatingText(`+${unspent * 20} Initiative`, 'buff', activeCoord ?? { q: 0, r: 0 });
      if (willArmCoiledApex) {
        addFloatingText('Coiled Apex (+1 Height)', 'buff', activeCoord ?? { q: 0, r: 0 });
      }
    } else {
      addFloatingText('Turn End', 'buff', activeCoord ?? { q: 0, r: 0 });
    }
    if (willGainZeroedIn) {
      addFloatingText(
        `Zeroed In (${currentZeroedIn + 1}/${MAX_ZEROED_IN_STACKS})`,
        'buff',
        activeCoord ?? { q: 0, r: 0 }
      );
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
      setSelectedDeploymentUnitId(null);
      setIsDeploymentPhase(defaultStartInDeployment);
      setIsOpeningInitiativeActive(!defaultStartInDeployment);
      lastTurnStartEmittedRef.current = -1;

      setIsVictoryModalOpen(false);
      setIsDefeatModalOpen(false);
      setSquadSummaries([]);
      setHostileActionStatus(null);
      setEncounterSession((prev) => prev + 1);

      const nextRoller = new SeededDiceRoller(Date.now());
      trialRollerRef.current = nextRoller;
      const fresh = defaultStartInDeployment
        ? createDeploymentPreviewState(encounter)
        : buildEncounterState(encounter, nextRoller);
      setState(fresh);
      setActionMode('IDLE');
      setSelectedAbility(null);
      setFacingCompassCoord(null);
      setHoveredCoord(null);
      setPinnedUnitId(null);
      clearFloatingTexts();
    },
    [encounter, defaultStartInDeployment, clearFloatingTexts, setSelectedDeploymentUnitId, setIsDeploymentPhase, setIsOpeningInitiativeActive]
  );

  // Full reset back to encounter start
  const handleResetEncounter = useCallback(() => {
    for (const t of openingTimeoutsRef.current) {
      clearTimeout(t);
    }
    openingTimeoutsRef.current = [];
    pendingInitiativeItemsRef.current = [];
    setSelectedDeploymentUnitId(null);
    setIsDeploymentPhase(defaultStartInDeployment);
    setIsOpeningInitiativeActive(!defaultStartInDeployment);
    lastTurnStartEmittedRef.current = -1;

    setSquadSummaries([]);
    setIsVictoryModalOpen(false);
    setIsDefeatModalOpen(false);
    setHostileActionStatus(null);
    setEncounterSession((prev) => prev + 1);

    const nextRoller = new SeededDiceRoller(Date.now());
    trialRollerRef.current = nextRoller;
    const fresh = defaultStartInDeployment
      ? createDeploymentPreviewState(encounter)
      : buildEncounterState(encounter, nextRoller);
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
    setFacingCompassCoord(null);
    setHoveredCoord(null);
    setPinnedUnitId(null);
    clearFloatingTexts();
  }, [encounter, defaultStartInDeployment, clearFloatingTexts, setSelectedDeploymentUnitId, setIsDeploymentPhase, setIsOpeningInitiativeActive]);

  // Global keydown listener for Escape (dismiss ability targeting / unpin unit / clear deployment selection)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDeploymentPhaseRef.current && selectedDeploymentUnitIdRef.current) {
          setSelectedDeploymentUnitId(null);
        } else if (actionMode === 'ABILITY' || actionMode === 'MOVE') {
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
  }, [actionMode, pinnedUnitId, setSelectedDeploymentUnitId]);

  return {
    get state() {
      return stateRef.current;
    },
    get activeCu() {
      return stateRef.current.units.get(stateRef.current.activeUnitId);
    },
    get activeCoord() {
      return stateRef.current.activeUnitId
        ? stateRef.current.arena.getUnitPosition(stateRef.current.activeUnitId)
        : undefined;
    },
    get phase(): CombatPhase {
      const s = stateRef.current;
      if (s.outcome === 'VICTORY') return 'VICTORY';
      if (s.outcome === 'DEFEAT') return 'DEFEAT';
      if (isDeploymentPhaseRef.current) return 'DEPLOYMENT';
      const cu = s.units.get(s.activeUnitId);
      if (cu?.faction !== 'PLAYER') return 'HOSTILE_TURN';
      return 'PLAYER_ACTION';
    },
    get isDeploymentPhase() {
      return isDeploymentPhaseRef.current;
    },
    get selectedDeploymentUnitId() {
      return selectedDeploymentUnitIdRef.current;
    },
    setSelectedDeploymentUnitId,
    deploymentZoneCoords,
    handleAutoArrangeDeployment,
    handleConfirmDeployment,
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
