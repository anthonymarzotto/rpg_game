import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect, ConditionType } from '../../types/ability';
import { getConditionDefinition } from '../conditions';
import { ActiveCondition, EffectOutcome } from '../types';

export const cleanseHandler: EffectHandler = {
  apply(_effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { actorCu, targetCu, ability, state } = ctx;
    const targetUnit =
      ability.targetType === 'SELF' ? actorCu : (targetCu ?? actorCu);

    if (!targetUnit || !targetUnit.activeConditions) {
      return { events: [] };
    }

    const purgedTypes: ConditionType[] = [];
    const removedEntries: { readonly cond: ActiveCondition; readonly onRemoved?: (c: ActiveCondition, u: typeof targetUnit, s?: typeof state) => void }[] = [];
    const remaining: ActiveCondition[] = [];

    for (const cond of targetUnit.activeConditions) {
      const def = getConditionDefinition(cond.type);
      if (def?.purgeableByCleanse) {
        purgedTypes.push(cond.type);
        removedEntries.push({ cond, onRemoved: def.onRemoved });
      } else {
        remaining.push(cond);
      }
    }

    targetUnit.activeConditions = remaining;

    for (const { cond, onRemoved } of removedEntries) {
      onRemoved?.(cond, targetUnit, state);
    }

    const effects: EffectOutcome[] = [];
    if (purgedTypes.length > 0) {
      const formattedList = purgedTypes
        .map((t) => t.charAt(0) + t.slice(1).toLowerCase())
        .join(', ');
      effects.push({
        kind: 'CONTEXT',
        context: 'CLEANSED',
        label: 'Purified',
        detail: `Purged ${formattedList}`
      });
    }

    return {
      events: [],
      ...(effects.length > 0 ? { effects } : {})
    };
  }
};
