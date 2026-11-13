import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, resolveEffectShout } from '../../types/ability';
import { CombatEvent } from '../types';
import { isDisplacementImmune } from '../displacementImmunity';

export const positionSwapHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu } = ctx;
    if (!targetCu || targetCu.unit.id === actorCu.unit.id) {
      return { events: [] };
    }

    if (actorCu.faction && targetCu.faction && actorCu.faction !== targetCu.faction && isDisplacementImmune(targetCu)) {
      return { events: [], logDetail: ` 🛡️ [${targetCu.unit.name} is immune to displacement!]` };
    }

    const actorCoord = state.arena.getUnitPosition(actorCu.unit.id);
    const targetCoord = state.arena.getUnitPosition(targetCu.unit.id);
    if (!actorCoord || !targetCoord) {
      return { events: [] };
    }

    const actorLabel = resolveEffectShout(effect.shout, 'actor');
    const targetLabel =
      typeof effect.shout === 'string'
        ? null
        : (resolveEffectShout(effect.shout, 'target') ?? null);

    const events: CombatEvent[] = [
      {
        type: 'DISPLACEMENT',
        unitId: actorCu.unit.id,
        fromCoord: actorCoord,
        toCoord: targetCoord,
        kind: 'SWAP',
        ...(actorLabel !== undefined ? { label: actorLabel } : {})
      },
      {
        type: 'DISPLACEMENT',
        unitId: targetCu.unit.id,
        fromCoord: targetCoord,
        toCoord: actorCoord,
        kind: 'SWAP',
        label: targetLabel
      }
    ];

    return {
      events,
      logDetail: `${actorCu.unit.name} swapped positions with ${targetCu.unit.name}`
    };
  }
};
