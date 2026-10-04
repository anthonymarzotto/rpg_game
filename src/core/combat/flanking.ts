import { getCombatArc, getHexNeighbors } from '../grid/hex';
import { CombatState } from './types';

/**
 * Evaluates whether a target is flanked by the actor.
 * Flanking is achieved if:
 * 1. The attacker is in the target's FLANK or REAR combat arc, OR
 * 2. An ally of the actor is also adjacent to the target (Allied Pincer).
 */
export function isFlankOrRear(
  state: CombatState,
  actorUnitId: string,
  targetUnitId: string
): boolean {
  const actorCu = state.units.get(actorUnitId);
  const targetCu = state.units.get(targetUnitId);
  const targetCoord = state.arena.getUnitPosition(targetUnitId);
  const actorCoord = state.arena.getUnitPosition(actorUnitId);
  if (!actorCu || !targetCu || !targetCoord || !actorCoord) return false;

  // 1. Check if attacker is in target's Flank or Rear combat arc
  const arc = getCombatArc(targetCu.facing, targetCoord, actorCoord);
  if (arc === 'FLANK' || arc === 'REAR') {
    return true;
  }

  // 2. Check if any other ally of actor is adjacent to target (Allied Pincer)
  const targetNeighbors = getHexNeighbors(targetCoord);
  const hasAlliedFlanker = targetNeighbors.some((coord) => {
    const occupantId = state.arena.getUnitAt(coord);
    if (!occupantId || occupantId === actorUnitId) return false;
    const cu = state.units.get(occupantId);
    return cu && !cu.isDefeated && cu.currentHp > 0 && cu.faction === actorCu.faction;
  });
  if (hasAlliedFlanker) return true;

  return false;
}
