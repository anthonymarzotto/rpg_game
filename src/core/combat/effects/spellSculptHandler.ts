import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';

export const spellSculptHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { actorCu } = ctx;
    const bonusRange = effect.magnitude && effect.magnitude > 0 ? effect.magnitude : 1;
    actorCu.abilityModifiers = actorCu.abilityModifiers ?? [];
    actorCu.abilityModifiers.push({
      id: 'spell_sculpt',
      name: 'Spell Sculpt',
      targetArchetypes: ['MAGE'],
      deltas: {
        range: bonusRange,
        aoeRadius: 1
      },
      consumesOnUse: true,
      expiresAtTurnEnd: true
    });

    return {
      events: [],
      logDetail: ` ✨ [Spell Sculpt: +${bonusRange} Range & +1 AoE Radius on next Mage spell]`
    };
  }
};
