import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { CombatEvent } from '../types';

export const teleportHandler: EffectHandler = {
  apply(_effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCoord } = ctx;
    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);

    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    const event: CombatEvent = {
      type: 'DISPLACEMENT',
      unitId: actorCu.unit.id,
      fromCoord: actorCoord,
      toCoord: targetCoord,
      kind: 'TELEPORT'
    };

    return {
      events: [event],
      logDetail: ` 🌀 [Shadow Step to (${targetCoord.q}, ${targetCoord.r})]`
    };
  }
};
