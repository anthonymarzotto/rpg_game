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

    targetCu.initiativeGauge += effect.magnitude;

    return {
      events: [],
      logDetail: ` ⏩ [Initiative Boost: +${effect.magnitude} CTB Gauge]`
    };
  }
};
