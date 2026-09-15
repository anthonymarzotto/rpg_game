import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { ActiveModifier, CombatEvent } from '../types';

export const modifierHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { actorCu, targetCu, ability } = ctx;

    let targetUnitId: string | undefined;
    let modifier: ActiveModifier | undefined;
    let logDetail = '';

    if (effect.type === 'SLOW') {
      targetUnitId = targetCu?.unit.id;
      if (targetUnitId) {
        modifier = {
          stat: 'move',
          value: -effect.magnitude,
          durationTurns: effect.durationTurns ?? 1
        };
        logDetail = ` ❄️ [Slow: -${effect.magnitude} Move for ${effect.durationTurns ?? 1} turn(s)]`;
      }
    } else if (effect.type === 'ARMOR_BUFF') {
      targetUnitId = ability.targetType === 'ALLY' && targetCu ? targetCu.unit.id : actorCu.unit.id;
      modifier = {
        stat: 'armor',
        value: effect.magnitude,
        durationTurns: effect.durationTurns ?? 1
      };
      logDetail = ` 🛡️ [Armor Buff: +${effect.magnitude} Armor for ${effect.durationTurns ?? 1} turn(s)]`;
    } else if (effect.type === 'WARD_BUFF') {
      targetUnitId = targetCu?.unit.id ?? actorCu.unit.id;
      modifier = {
        stat: 'ward',
        value: effect.magnitude,
        durationTurns: effect.durationTurns ?? 1
      };
      logDetail = ` 🔮 [Ward Buff: +${effect.magnitude} Ward for ${effect.durationTurns ?? 1} turn(s)]`;
    }

    if (!targetUnitId || !modifier) {
      return { events: [] };
    }

    const event: CombatEvent = {
      type: 'STATUS_APPLIED',
      targetUnitId,
      modifier
    };

    return {
      events: [event],
      logDetail
    };
  }
};
