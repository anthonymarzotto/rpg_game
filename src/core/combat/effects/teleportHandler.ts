import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, resolveEffectShout } from '../../types/ability';
import { CombatEvent } from '../types';

export const teleportHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCoord } = ctx;
    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);

    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    const label = resolveEffectShout(effect.shout, 'actor');
    const event: CombatEvent = {
      type: 'DISPLACEMENT',
      unitId: actorCu.unit.id,
      fromCoord: actorCoord,
      toCoord: targetCoord,
      kind: 'TELEPORT',
      ...(label !== undefined ? { label } : {})
    };

    const displayLabel =
      typeof label === 'string' ? label.replace(/!+$/, '') : ctx.ability.name;

    return {
      events: [event],
      effects: [
        {
          kind: 'DISPLACEMENT',
          displacement: 'TELEPORT',
          toCoord: targetCoord,
          label: displayLabel
        }
      ]
    };
  }
};
