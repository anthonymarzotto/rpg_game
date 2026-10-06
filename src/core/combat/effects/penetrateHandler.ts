import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { hexSubtract, hexAdd, getDirectionBetween } from '../../grid/hex';
import { CombatEvent } from '../types';

export const penetrateHandler: EffectHandler = {
  apply(_effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu } = ctx;
    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);
    const targetCoord = targetCu ? state.arena.getUnitPosition(targetCu.unit.id) : ctx.targetCoord;

    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    // Direction vector continuing past the target
    const stepDir = hexSubtract(targetCoord, actorCoord);
    const penetrateDest = hexAdd(targetCoord, stepDir);
    const destTile = state.arena.getTile(penetrateDest);

    if (destTile && destTile.isWalkable && !destTile.occupiedByUnitId) {
      actorCu.facing = getDirectionBetween(targetCoord, penetrateDest);
      actorCu.hexesMovedThisTurn = (actorCu.hexesMovedThisTurn ?? 0) + 2;

      const event: CombatEvent = {
        type: 'DISPLACEMENT',
        unitId: actorCu.unit.id,
        fromCoord: actorCoord,
        toCoord: penetrateDest,
        kind: 'CHARGE'
      };

      return {
        events: [event],
        logDetail: ` 🏇 [Ride-Through to (${penetrateDest.q}, ${penetrateDest.r})]`
      };
    }

    return { events: [] };
  }
};
