import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, resolveEffectShout } from '../../types/ability';
import { CombatEvent } from '../types';

export const ctbDelayHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { targetCu } = ctx;
    if (!targetCu) {
      return { events: [] };
    }

    const delayAmount = effect.magnitude ?? 0;
    targetCu.initiativeGauge = Math.max(0, targetCu.initiativeGauge - delayAmount);

    const label = resolveEffectShout(effect.shout, 'target');
    const event: CombatEvent = {
      type: 'CTB_DELAY',
      targetUnitId: targetCu.unit.id,
      amount: delayAmount,
      ...(label !== undefined ? { label } : {})
    };

    return {
      events: [event],
      logDetail: ` ⏳ [CTB Delay: -${delayAmount} Initiative]`
    };
  }
};
