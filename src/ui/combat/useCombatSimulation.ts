import { useState, useCallback, useMemo } from 'react';
import { HexCoord, hexDistance } from '../../core/grid/hex';
import { createRadialArena } from '../../core/grid/templates';
import { Unit } from '../../core/types/unit';
import { Ability } from '../../core/types/ability';
import {
  CombatState,
  getEffectiveEvasion,
  getEffectiveResolve,
  getEffectiveArmor,
  getEffectiveWard
} from '../../core/combat/types';
import {
  createCombatState,
  canMove,
  executeMove,
  canExecuteAbility,
  executeAbility
} from '../../core/combat/resolver';
import { endActiveTurn } from '../../core/combat/turnClock';
import { DiceRoller } from '../../core/combat/dice';
import { createRecruit } from '../../core/units/unitFactory';
import {
  SHIELD_BASH,
  QUICK_THRUST,
  SPARK,
  UNIVERSAL_ACTIONS,
  rollNoviceAbilityKit
} from '../../data/abilities';

export type ActionMode = 'IDLE' | 'MOVE' | 'ABILITY';
export type DiceMode = 'NORMAL' | 'FORCE_CRIT' | 'FORCE_GRAZE' | 'FORCE_MISS';

export interface FloatingText {
  readonly id: string;
  readonly text: string;
  readonly type: 'damage' | 'crit' | 'graze' | 'miss' | 'xp' | 'buff' | 'slam';
  readonly coord: HexCoord;
}

export interface TargetPreview {
  readonly targetUnitId: string;
  readonly targetName: string;
  readonly toHitChance: number;
  readonly targetDefense: number;
  readonly defenseType: string;
  readonly diceDescription: string;
  readonly damageRange: string;
  readonly isBlockedLoS: boolean;
  readonly blockReason?: string;
}

class DevDiceRoller implements DiceRoller {
  constructor(private mode: DiceMode) {}

  public rollD20(): number {
    if (this.mode === 'FORCE_CRIT') return 20;
    if (this.mode === 'FORCE_MISS') return 2;
    if (this.mode === 'FORCE_GRAZE') return 7;
    return Math.floor(Math.random() * 20) + 1;
  }

  public rollDice(count: number, sides: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  }
}

function buildTestEncounter(abilitiesOverride?: readonly Ability[]): CombatState {
  const arena = createRadialArena(3);

  // Set (0, 2) as an unwalkable rock obstacle for LoS & Wall-Slam testing
  const rockTile = arena.getTile({ q: 0, r: 2 });
  if (rockTile) {
    arena.setTile({ ...rockTile, isWalkable: false });
  }

  const starterAbilities = abilitiesOverride ?? [
    SHIELD_BASH,
    QUICK_THRUST,
    SPARK,
    ...UNIVERSAL_ACTIONS
  ];

  // 1. Player Recruit (center)
  const player = createRecruit('player', 'Alden (Novice)', {
    abilities: starterAbilities
  });

  // 2. Training Dummy A (adjacent at 1, 0)
  const dummyA: Unit = {
    id: 'dummy-a',
    name: 'Training Dummy A',
    progression: {
      unitId: 'dummy-a',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 25,
      maxAp: 0,
      speed: 8,
      move: 0,
      evasion: 10,
      resolve: 10,
      armor: 2,
      ward: 0
    },
    abilities: []
  };

  // 3. Bystander Dummy B (at 2, 0 behind dummy A)
  const dummyB: Unit = {
    id: 'dummy-b',
    name: 'Bystander Dummy B',
    progression: {
      unitId: 'dummy-b',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 0,
      speed: 6,
      move: 0,
      evasion: 10,
      resolve: 10,
      armor: 1,
      ward: 0
    },
    abilities: []
  };

  // 4. Screened Dummy C (at 0, 3 behind rock obstacle at 0, 2)
  const dummyC: Unit = {
    id: 'dummy-c',
    name: 'Screened Dummy C',
    progression: {
      unitId: 'dummy-c',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 0,
      speed: 6,
      move: 0,
      evasion: 10,
      resolve: 12,
      armor: 0,
      ward: 2
    },
    abilities: []
  };

  // 5. Open Dummy D (at -2, 1 for unblocked ranged attack testing)
  const dummyD: Unit = {
    id: 'dummy-d',
    name: 'Distant Target D',
    progression: {
      unitId: 'dummy-d',
      currentLevel: 0,
      archetypePoints: { fighter: 0, rogue: 0, mage: 0 },
      constellation: []
    },
    baseAttributes: { force: 0, finesse: 0, focus: 0 },
    effectiveVitals: {
      maxHp: 20,
      maxAp: 0,
      speed: 6,
      move: 0,
      evasion: 10,
      resolve: 10,
      armor: 0,
      ward: 1
    },
    abilities: []
  };

  arena.setUnitPosition('player', { q: 0, r: 0 });
  arena.setUnitPosition('dummy-a', { q: 1, r: 0 });
  arena.setUnitPosition('dummy-b', { q: 2, r: 0 });
  arena.setUnitPosition('dummy-c', { q: 0, r: 3 });
  arena.setUnitPosition('dummy-d', { q: -2, r: 1 });

  return createCombatState(arena, [player, dummyA, dummyB, dummyC, dummyD], 'player');
}

export function useCombatSimulation() {
  const [currentKit, setCurrentKit] = useState<readonly Ability[]>([
    SHIELD_BASH,
    QUICK_THRUST,
    SPARK,
    ...UNIVERSAL_ACTIONS
  ]);
  const [state, setState] = useState<CombatState>(() => buildTestEncounter());
  const [actionMode, setActionMode] = useState<ActionMode>('IDLE');
  const [selectedAbility, setSelectedAbility] = useState<Ability | null>(null);
  const [hoveredCoord, setHoveredCoord] = useState<HexCoord | null>(null);
  const [diceMode, setDiceMode] = useState<DiceMode>('NORMAL');
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  // Trigger floating visual feedback
  const addFloatingText = useCallback(
    (text: string, type: FloatingText['type'], coord: HexCoord) => {
      const id = `${Date.now()}-${Math.random()}`;
      setFloatingTexts((prev) => [...prev, { id, text, type, coord }]);
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
      }, 1400);
    },
    []
  );

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

  // Computes candidate target tiles when an ability is selected
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

      if (selectedAbility.targetType === 'ALLY' && unitId === 'player') {
        results.push(coord);
      } else if (
        selectedAbility.targetType === 'SINGLE_TARGET' &&
        unitId !== 'player'
      ) {
        results.push(coord);
      }
    }
    return results;
  }, [actionMode, selectedAbility, playerCoord, playerCu, state.units, state.arena]);

  // Hover target preview calculations
  const targetPreview = useMemo<TargetPreview | null>(() => {
    if (
      actionMode !== 'ABILITY' ||
      !selectedAbility ||
      !hoveredCoord ||
      !playerCoord ||
      !playerCu
    ) {
      return null;
    }

    const targetUnitId = state.arena.getUnitAt(hoveredCoord);
    if (!targetUnitId) return null;

    const targetCu = state.units.get(targetUnitId);
    if (!targetCu || targetCu.isDefeated) return null;

    const dist = hexDistance(playerCoord, hoveredCoord);
    if (dist > selectedAbility.range && selectedAbility.targetType !== 'SELF') {
      return null;
    }

    const hasLoS = state.arena.hasLineOfSight(playerCoord, hoveredCoord);
    const defenseType = selectedAbility.defenseTarget === 'EVASION' ? 'Evasion' : 'Resolve';
    const targetDefense =
      selectedAbility.defenseTarget === 'EVASION'
        ? getEffectiveEvasion(targetCu)
        : getEffectiveResolve(targetCu);

    // Approximate to-hit chance on d20
    const attr = selectedAbility.damageProfile?.modifierAttribute;
    const modifier = attr ? playerCu.unit.baseAttributes[attr] : 0;
    // Score needed on d20: d20 + modifier >= targetDefense
    const needed = Math.max(1, Math.min(20, targetDefense - modifier));
    const toHitChance = Math.round(((21 - needed) / 20) * 100);

    const diceProfile = selectedAbility.damageProfile;
    const diceDesc = diceProfile
      ? `${diceProfile.count}d${diceProfile.sides} + ${attr ?? ''}`
      : 'Support';

    const mitigation =
      selectedAbility.damageType === 'PHYSICAL'
        ? getEffectiveArmor(targetCu)
        : getEffectiveWard(targetCu);

    const minDmg = diceProfile ? Math.max(1, diceProfile.count + modifier - mitigation) : 0;
    const maxDmg = diceProfile
      ? Math.max(1, diceProfile.count * diceProfile.sides + modifier - mitigation)
      : 0;

    return {
      targetUnitId,
      targetName: targetCu.unit.name,
      toHitChance: Math.max(5, Math.min(95, toHitChance)),
      targetDefense,
      defenseType,
      diceDescription: diceDesc,
      damageRange: diceProfile ? `${minDmg} – ${maxDmg} (Soak: ${mitigation})` : 'Buff',
      isBlockedLoS: !hasLoS,
      blockReason: !hasLoS ? 'Line-of-Sight is screened/blocked' : undefined
    };
  }, [
    actionMode,
    selectedAbility,
    hoveredCoord,
    playerCoord,
    playerCu,
    state.arena,
    state.units
  ]);

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

          if (resolution.type === 'ATTACK') {
            const hit = resolution.details.hitOutcome;
            const dmg = resolution.details.damageDealt;

            if (targetCoordBefore) {
              if (hit === 'CRITICAL_HIT') {
                addFloatingText(`CRITICAL! -${dmg}`, 'crit', targetCoordBefore);
              } else if (hit === 'SOLID_HIT') {
                addFloatingText(`-${dmg}`, 'damage', targetCoordBefore);
              } else if (hit === 'GRAZE') {
                addFloatingText(`GRAZE -${dmg}`, 'graze', targetCoordBefore);
              } else {
                addFloatingText('MISS', 'miss', targetCoordBefore);
              }
            }

            // Wall slam float
            if (resolution.details.wallSlamDamage && targetCoordBefore) {
              setTimeout(() => {
                addFloatingText(
                  `SLAM! -${resolution.details.wallSlamDamage}`,
                  'slam',
                  targetCoordBefore
                );
              }, 400);
            }
          } else if (resolution.type === 'BUFF') {
            addFloatingText(
              `+${resolution.modifierApplied.value} ${resolution.modifierApplied.stat.toUpperCase()}`,
              'buff',
              coord
            );
          }

          // XP Gain Float
          if (selectedAbility.archetypeTag && playerCoord) {
            setTimeout(() => {
              addFloatingText(
                `+1 ${selectedAbility.archetypeTag} XP`,
                'xp',
                playerCoord
              );
            }, 600);
          }

          setActionMode('IDLE');
          setSelectedAbility(null);
          setState({ ...state });
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
      addFloatingText
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
    const fresh = buildTestEncounter(currentKit);
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
    setHoveredCoord(null);
    setFloatingTexts([]);
  }, [currentKit]);

  // Re-roll ability kit
  const handleRerollKit = useCallback(() => {
    const newKit = rollNoviceAbilityKit();
    setCurrentKit(newKit);
    const fresh = buildTestEncounter(newKit);
    setState(fresh);
    setActionMode('IDLE');
    setSelectedAbility(null);
  }, []);

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
    candidateTargetCoords,
    targetPreview,
    selectAction,
    handleTileClick,
    handleEndTurn,
    handleResetEncounter,
    handleRerollKit
  };
}
