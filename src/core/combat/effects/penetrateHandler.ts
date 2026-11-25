import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, resolveEffectShout } from '../../types/ability';
import { hexAdd, hexEquals, hexDistance, getDirectionBetween, POINTY_HEX_DIRECTIONS } from '../../grid/hex';
import { CombatEvent } from '../types';

export const penetrateHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu } = ctx;
    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);
    const targetCoord = (targetCu ? state.arena.getUnitPosition(targetCu.unit.id) : undefined) ?? ctx.targetCoord;

    if (!actorCoord || !targetCoord || hexEquals(actorCoord, targetCoord)) {
      return { events: [] };
    }

    // Normalized 1-hex direction vector continuing past the target
    const dir = getDirectionBetween(actorCoord, targetCoord);
    const stepDir = POINTY_HEX_DIRECTIONS[dir];
    const penetrateDest = hexAdd(targetCoord, stepDir);
    const destTile = state.arena.getTile(penetrateDest);

    if (destTile && destTile.isWalkable && !destTile.occupiedByUnitId) {
      actorCu.facing = getDirectionBetween(targetCoord, penetrateDest);
      actorCu.hexesMovedThisTurn = (actorCu.hexesMovedThisTurn ?? 0) + hexDistance(actorCoord, penetrateDest);

      const label = resolveEffectShout(effect.shout, 'actor');
      const event: CombatEvent = {
        type: 'DISPLACEMENT',
        unitId: actorCu.unit.id,
        fromCoord: actorCoord,
        toCoord: penetrateDest,
        kind: 'CHARGE',
        ...(label !== undefined ? { label } : {})
      };

      return {
        events: [event],
        effects: [
          {
            kind: 'DISPLACEMENT',
            displacement: 'CHARGE',
            toCoord: penetrateDest,
            label: 'Ride-Through'
          }
        ]
      };
    }

    return { events: [] };
  }
};
