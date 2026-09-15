import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { hexSubtract, hexAdd } from '../../grid/hex';
import { CombatEvent } from '../types';

export const retreatHandler: EffectHandler = {
  apply(_effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu } = ctx;
    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);
    const targetCoord = targetCu ? state.arena.getUnitPosition(targetCu.unit.id) : ctx.targetCoord;

    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    const retreatDir = hexSubtract(actorCoord, targetCoord);
    const retreatDest = hexAdd(actorCoord, retreatDir);
    const destTile = state.arena.getTile(retreatDest);

    if (destTile && destTile.isWalkable && !destTile.occupiedByUnitId) {
      const event: CombatEvent = {
        type: 'DISPLACEMENT',
        unitId: actorCu.unit.id,
        fromCoord: actorCoord,
        toCoord: retreatDest,
        kind: 'RETREAT'
      };

      return {
        events: [event],
        logDetail: ` 🏃 [Retreat Step to (${retreatDest.q}, ${retreatDest.r})]`
      };
    }

    return { events: [] };
  }
};
