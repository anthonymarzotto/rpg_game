import { useState, useCallback } from 'react';
import { HexCoord } from '../../core/grid/hex';
import { CombatState, AbilityResolution, CombatEvent, HitOutcome } from '../../core/combat/types';
import { Ability } from '../../core/types/ability';
import { predictTurnOrder } from '../../core/combat/turnClock';
import { formatDisciplineName } from './combatXpUtils';

export interface FloatingText {
  readonly id: string;
  readonly text: string;
  readonly type: 'damage' | 'crit' | 'graze' | 'miss' | 'xp' | 'buff' | 'slam' | 'initiative';
  readonly coord: HexCoord;
}

/**
 * Evaluates the floating combat text string and visual style for a damage event.
 */
export function resolveDamageFloatingText(
  event: Extract<CombatEvent, { type: 'DAMAGE' }>,
  hitOutcome: HitOutcome
): { text: string; textType: FloatingText['type'] } {
  const textType: FloatingText['type'] =
    event.reason === 'COLLISION' || event.reason === 'COLLATERAL' || event.reason === 'SPLASH' || event.reason === 'FALL'
      ? 'slam'
      : event.isCrit
      ? 'crit'
      : hitOutcome === 'GRAZE'
      ? 'graze'
      : 'damage';
  const prefix =
    event.label
      ? `${event.label}! `
      : event.reason === 'COLLISION'
      ? 'SLAM! '
      : event.reason === 'COLLATERAL'
      ? 'COLLISION! '
      : event.reason === 'FALL'
      ? 'FALL! '
      : event.reason === 'SPLASH'
      ? 'SPLASH! '
      : event.isCrit
      ? 'CRITICAL! '
      : hitOutcome === 'GRAZE'
      ? 'GRAZE '
      : '';

  return {
    text: `${prefix}-${event.amount}`,
    textType
  };
}

/**
 * Emits opening floating combat text for all units with an initial initiative roll,
 * ordered sequentially by upcoming turn order and staggered by delay.
 */
export function collectInitiativeFloatingTexts(
  state: CombatState,
  staggerMs = 250
): Array<{ text: string; type: FloatingText['type']; coord: HexCoord; delay: number }> {
  const result: Array<{ text: string; type: FloatingText['type']; coord: HexCoord; delay: number }> = [];

  // Sort units according to turn order lookahead so initiative rolls pop in sequence of action
  const turnOrder = predictTurnOrder(state, state.units.size);
  const seenUnits = new Set<string>();
  const orderedUnitIds: string[] = [];

  for (const entry of turnOrder) {
    if (!seenUnits.has(entry.unitId)) {
      seenUnits.add(entry.unitId);
      orderedUnitIds.push(entry.unitId);
    }
  }

  // Fallback for any units not in the lookahead
  for (const unitId of state.units.keys()) {
    if (!seenUnits.has(unitId)) {
      seenUnits.add(unitId);
      orderedUnitIds.push(unitId);
    }
  }

  orderedUnitIds.forEach((unitId, index) => {
    const cu = state.units.get(unitId);
    if (cu && cu.initialInitiativeRoll !== undefined) {
      const coord = state.arena.getUnitPosition(unitId);
      if (coord) {
        result.push({
          text: `🎲 ${cu.initialInitiativeRoll}`,
          type: 'initiative',
          coord,
          delay: index * staggerMs
        });
      }
    }
  });

  return result;
}

/**
 * Pure evaluation function that calculates all floating combat text items,
 * coordinates, styles, and delays resulting from an ability resolution.
 */
export function collectResolutionFloatingTexts(
  state: CombatState,
  resolution: AbilityResolution,
  selectedAbility: Ability,
  targetCoordBefore: HexCoord | undefined,
  playerCoord: HexCoord | undefined,
  clickedCoord: HexCoord,
  targetUnitId?: string
): Array<{ text: string; type: FloatingText['type']; coord: HexCoord; delay: number }> {
  const result: Array<{ text: string; type: FloatingText['type']; coord: HexCoord; delay: number }> = [];

  const hitOutcome = resolution.type === 'ATTACK' ? resolution.details.hitOutcome : 'SOLID_HIT';
  if (resolution.type === 'ATTACK' && hitOutcome === 'MISS' && targetCoordBefore) {
    result.push({ text: 'MISS', type: 'miss', coord: targetCoordBefore, delay: 0 });
  }

  const events: readonly CombatEvent[] =
    resolution.type === 'ATTACK'
      ? resolution.details.events
      : (resolution.events ?? []);

  for (const event of events) {
    if (event.type === 'DAMAGE') {
      const unitPos =
        event.targetUnitId === targetUnitId && targetCoordBefore
          ? targetCoordBefore
          : state.arena.getUnitPosition(event.targetUnitId);
      if (unitPos) {
        const delay = event.reason === 'ATTACK' ? 0 : 350;
        const { text, textType } = resolveDamageFloatingText(event, hitOutcome);
        result.push({ text, type: textType, coord: unitPos, delay });
      }
    } else if (event.type === 'MISS') {
      const unitPos = state.arena.getUnitPosition(event.targetUnitId);
      if (unitPos) {
        result.push({ text: 'RESIST!', type: 'miss', coord: unitPos, delay: 350 });
      }
    } else if (event.type === 'DISPLACEMENT') {
      const text =
        event.kind === 'TELEPORT'
          ? 'TELEPORT!'
          : event.kind === 'RETREAT'
            ? 'RETREAT!'
            : 'KNOCKBACK!';
      result.push({ text, type: 'buff', coord: event.toCoord, delay: 250 });
    } else if (event.type === 'STATUS_APPLIED') {
      const unitPos = state.arena.getUnitPosition(event.targetUnitId) ?? clickedCoord;
      if (event.modifier) {
        result.push({
          text: `+${event.modifier.value} ${event.modifier.stat.toUpperCase()}`,
          type: 'buff',
          coord: unitPos,
          delay: 200
        });
      } else if (event.condition) {
        result.push({
          text: event.condition.type,
          type: event.condition.type === 'POISON' || event.condition.type === 'BURN' ? 'damage' : 'buff',
          coord: unitPos,
          delay: 200
        });
      }
    } else if (event.type === 'CONDITION_APPLIED') {
      const unitPos = state.arena.getUnitPosition(event.targetUnitId) ?? clickedCoord;
      result.push({
        text: event.condition.type,
        type: event.condition.type === 'POISON' || event.condition.type === 'BURN' ? 'damage' : 'buff',
        coord: unitPos,
        delay: 200
      });
    }
  }

  // Fallback for legacy BUFF resolutions without explicit STATUS_APPLIED event
  if (
    resolution.type === 'BUFF' &&
    resolution.modifierApplied &&
    resolution.modifierApplied.value !== 0 &&
    !events.some((e) => e.type === 'STATUS_APPLIED')
  ) {
    result.push({
      text: `+${resolution.modifierApplied.value} ${resolution.modifierApplied.stat.toUpperCase()}`,
      type: 'buff',
      coord: clickedCoord,
      delay: 0
    });
  }

  // XP Gain Float (awarded to shared party pool on player ability execution)
  if (selectedAbility.archetypeTag && playerCoord) {
    const actorCu = state.units.get(state.activeUnitId);
    const isPlayer = !actorCu || (actorCu.unit.faction ?? actorCu.faction ?? 'PLAYER') === 'PLAYER';
    if (isPlayer) {
      const xpAmount = Math.max(1, selectedAbility.apCost ?? 1);
      const discipline = formatDisciplineName(selectedAbility.archetypeTag);
      result.push({
        text: `+${xpAmount} ${discipline} XP`,
        type: 'xp',
        coord: playerCoord,
        delay: 300
      });
    }
  }

  return result;
}

/**
 * Manages floating combat text lifecycle, animation queue, and event dispatch.
 */
export function useFloatingCombatText() {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

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

  const clearFloatingTexts = useCallback(() => {
    setFloatingTexts([]);
  }, []);

  const dispatchResolutionFeedback = useCallback(
    (
      state: CombatState,
      resolution: AbilityResolution,
      selectedAbility: Ability,
      targetCoordBefore: HexCoord | undefined,
      playerCoord: HexCoord | undefined,
      clickedCoord: HexCoord,
      targetUnitId?: string
    ) => {
      const items = collectResolutionFloatingTexts(
        state,
        resolution,
        selectedAbility,
        targetCoordBefore,
        playerCoord,
        clickedCoord,
        targetUnitId
      );

      for (const item of items) {
        if (item.delay === 0) {
          addFloatingText(item.text, item.type, item.coord);
        } else {
          setTimeout(() => {
            addFloatingText(item.text, item.type, item.coord);
          }, item.delay);
        }
      }
    },
    [addFloatingText]
  );

  return {
    floatingTexts,
    addFloatingText,
    clearFloatingTexts,
    dispatchResolutionFeedback
  };
}
