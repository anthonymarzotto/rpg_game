import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { AbilityEffect } from '../../types/ability';
import { resolveDamage } from '../damageEngine';
import { CombatEvent } from '../types';
import { isFlankOrRear } from '../flanking';

export const damageHandler: EffectHandler = {
  apply(effect: AbilityEffect, ctx: EffectContext): EffectExecutionResult {
    const { state, actorCu, targetCu, ability, hitOutcome, diceRoller } = ctx;

    if (!targetCu) {
      return { events: [] };
    }

    if (hitOutcome === 'MISS') {
      return { events: [] };
    }

    let isFlanked = false;
    if (effect.condition === 'FLANK_OR_REAR') {
      isFlanked = isFlankOrRear(state, actorCu.unit.id, targetCu.unit.id);
      // If an effect requires flank and unit is not flanked, and has no base damageProfile, skip
      if (!isFlanked && !effect.damageProfile && !effect.flatDamage) {
        return { events: [] };
      }
    }

    const bonusDamage = isFlanked ? effect.bonusDamage : undefined;

    const damageResult = resolveDamage(
      hitOutcome,
      ability,
      actorCu,
      targetCu,
      diceRoller,
      bonusDamage,
      effect
    );

    const events: CombatEvent[] = [];
    if (damageResult.damageDealt > 0) {
      events.push({
        type: 'DAMAGE',
        targetUnitId: targetCu.unit.id,
        amount: damageResult.damageDealt,
        damageType: ability.damageType === 'PHYSICAL' ? 'PHYSICAL' : 'MAGICAL',
        reason: 'ATTACK',
        sourceUnitId: actorCu.unit.id,
        isCrit: hitOutcome === 'CRITICAL_HIT'
      });
    }

    return {
      events,
      logDetail: ` [${damageResult.damageBreakdown}]`
    };
  }
};
