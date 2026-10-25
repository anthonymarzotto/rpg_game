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

    let isConditionMet = true;
    let bonusDamage = undefined;

    if (effect.condition === 'FLANK_OR_REAR') {
      const isFlanked = isFlankOrRear(state, actorCu.unit.id, targetCu.unit.id);
      if (isFlanked) {
        bonusDamage = effect.bonusDamage;
      } else {
        isConditionMet = false;
      }
    } else if (effect.condition === 'TARGET_CHALLENGED') {
      const isChallenged = targetCu.activeConditions?.some((c) => c.type === 'CHALLENGED');
      if (isChallenged) {
        bonusDamage = effect.bonusDamage;
      } else {
        isConditionMet = false;
      }
    }

    // If an effect requires a condition and condition is not met, and has no base damageProfile, skip
    if (!isConditionMet && !effect.damageProfile && !effect.flatDamage) {
      return { events: [] };
    }

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
