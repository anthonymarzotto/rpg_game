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
        const mag = effect.magnitude ?? 1;
        modifier = {
          stat: 'move',
          value: -mag,
          durationTurns: effect.durationTurns ?? 1
        };
        logDetail = ` ❄️ [Slow: -${mag} Move for ${effect.durationTurns ?? 1} turn(s)]`;
      }
    } else if (effect.type === 'ARMOR_BUFF') {
      targetUnitId = ability.targetType === 'ALLY' && targetCu ? targetCu.unit.id : actorCu.unit.id;
      const mag = effect.magnitude ?? 1;
      modifier = {
        stat: 'armor',
        value: mag,
        durationTurns: effect.durationTurns ?? 1
      };
      logDetail = ` 🛡️ [Armor Buff: +${mag} Armor for ${effect.durationTurns ?? 1} turn(s)]`;
    } else if (effect.type === 'WARD_BUFF') {
      targetUnitId = targetCu?.unit.id ?? actorCu.unit.id;
      const mag = effect.magnitude ?? 1;
      modifier = {
        stat: 'ward',
        value: mag,
        durationTurns: effect.durationTurns ?? 1
      };
      logDetail = ` 🔮 [Ward Buff: +${mag} Ward for ${effect.durationTurns ?? 1} turn(s)]`;
    } else if (effect.type === 'STAT_MODIFIER' && effect.statModifiers) {
      targetUnitId = effect.targetScope === 'SELF' ? actorCu.unit.id : (targetCu?.unit.id ?? actorCu.unit.id);
      const durationTurns = effect.durationTurns ?? 1;
      const events: CombatEvent[] = [];
      const parts: string[] = [];
      for (const [stat, val] of Object.entries(effect.statModifiers)) {
        if (typeof val === 'number') {
          const mod: ActiveModifier = {
            stat: stat as any,
            value: val,
            durationTurns
          };
          events.push({
            type: 'STATUS_APPLIED',
            targetUnitId,
            modifier: mod
          });
          parts.push(`${val > 0 ? '+' : ''}${val} ${stat.toUpperCase()}`);
        }
      }
      return {
        events,
        logDetail: ` 📊 [Stat Modifier: ${parts.join(', ')} for ${durationTurns} turn(s)]`
      };
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
