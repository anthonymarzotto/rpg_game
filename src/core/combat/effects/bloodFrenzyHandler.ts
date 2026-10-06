import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';

export const bloodFrenzyHandler: EffectHandler = {
  apply(_effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { actorCu } = ctx;
    actorCu.abilityModifiers = actorCu.abilityModifiers ?? [];
    actorCu.abilityModifiers.push({
      id: 'blood_frenzy',
      name: 'Blood Frenzy',
      targetDamageTypes: ['PHYSICAL'],
      deltas: {
        attackRoll: 2
      },
      effectPatches: {
        diceStep: 1
      },
      consumesOnUse: true,
      expiresAtTurnEnd: true
    });

    return {
      events: [],
      logDetail: ` 🩸 [Blood Frenzy: +1 Die Step & +2 Attack Roll on next physical attack]`
    };
  }
};
