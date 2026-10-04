import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';

export const spellSculptHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { actorCu } = ctx;
    actorCu.pendingAbilityModifier = {
      extraRange: effect.magnitude > 0 ? effect.magnitude : 1,
      extraAoeRadius: 1,
      allowedArchetypes: ['MAGE'],
      excludedEffectTypes: ['SPELL_SCULPT'],
      consumesOnUse: true,
      expiresAtTurnEnd: true
    };

    return {
      events: [],
      logDetail: ' ✨ [Spell Sculpt: +1 Range & +1 AoE Radius on next Mage spell]'
    };
  }
};
