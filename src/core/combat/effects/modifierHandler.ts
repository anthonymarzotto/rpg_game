import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { ActiveModifier, CombatEvent, EffectOutcome } from '../types';

export const modifierHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { actorCu, targetCu, ability } = ctx;

    let targetUnitId: string | undefined;
    let modifier: ActiveModifier | undefined;
    const effects: EffectOutcome[] = [];

    if (effect.type === 'SLOW') {
      targetUnitId = targetCu?.unit.id;
      if (targetUnitId) {
        const mag = effect.magnitude ?? 1;
        const durationTurns = effect.durationTurns ?? 1;
        modifier = {
          stat: 'move',
          value: -mag,
          durationTurns
        };
        effects.push({
          kind: 'MODIFIER',
          label: 'Slow',
          entries: [{ stat: 'Move', value: -mag }],
          durationTurns
        });
      }
    } else if (effect.type === 'ARMOR_BUFF') {
      targetUnitId = effect.targetScope === 'SELF'
        ? actorCu.unit.id
        : (effect.targetScope === 'TARGET' && targetCu
          ? targetCu.unit.id
          : (ability.targetType === 'ALLY' && targetCu ? targetCu.unit.id : actorCu.unit.id));
      const mag = effect.magnitude ?? 1;
      const durationTurns = effect.durationTurns ?? 1;
      modifier = {
        stat: 'armor',
        value: mag,
        durationTurns
      };
      effects.push({
        kind: 'MODIFIER',
        label: 'Armor Buff',
        entries: [{ stat: 'Armor', value: mag }],
        durationTurns
      });
    } else if (effect.type === 'WARD_BUFF') {
      targetUnitId = targetCu?.unit.id ?? actorCu.unit.id;
      const mag = effect.magnitude ?? 1;
      const durationTurns = effect.durationTurns ?? 1;
      modifier = {
        stat: 'ward',
        value: mag,
        durationTurns
      };
      effects.push({
        kind: 'MODIFIER',
        label: 'Ward Buff',
        entries: [{ stat: 'Ward', value: mag }],
        durationTurns
      });
    } else if (effect.type === 'STAT_MODIFIER' && effect.statModifiers) {
      targetUnitId = effect.targetScope === 'SELF' ? actorCu.unit.id : (targetCu?.unit.id ?? actorCu.unit.id);
      const durationTurns = effect.durationTurns ?? 1;
      const events: CombatEvent[] = [];
      const entries: { stat: string; value: number }[] = [];
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
          entries.push({ stat: stat.toUpperCase(), value: val });
        }
      }
      return {
        events,
        ...(entries.length > 0
          ? {
              effects: [
                {
                  kind: 'MODIFIER',
                  label: 'Stat Modifier',
                  entries,
                  durationTurns
                }
              ]
            }
          : {})
      };
    } else if (effect.type === 'BASTION_STANCE') {
      targetUnitId = actorCu.unit.id;
      const durationTurns = effect.durationTurns ?? 1;
      modifier = {
        stat: 'bastionStance',
        value: 1,
        durationTurns
      };
      effects.push({
        kind: 'MODIFIER',
        label: 'Bastion Stance',
        entries: [],
        durationTurns,
        note: 'Zone of Control & Rear Cover active'
      });
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
      ...(effects.length > 0 ? { effects } : {})
    };
  }
};
