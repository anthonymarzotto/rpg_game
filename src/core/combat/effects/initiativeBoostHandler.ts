import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';

/**
 * Handles instantaneous CTB initiative gauge boost (e.g. Tactical Vanguard).
 */
export const initiativeBoostHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const targetCu = ctx.targetCu ?? ctx.actorCu;
    if (!targetCu) {
      return { events: [] };
    }

    const boost = effect.magnitude ?? 0;
    targetCu.initiativeGauge += boost;

    return {
      events: [],
      logDetail: ` ⏩ [Initiative Boost: +${boost} CTB Gauge]`
    };
  }
};
