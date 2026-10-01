import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { Ability, AbilityEffect } from '../../types/ability';
import { knockbackHandler } from './knockbackHandler';
import { retreatHandler } from './retreatHandler';
import { modifierHandler } from './modifierHandler';
import { teleportHandler } from './teleportHandler';
import { cleaveHandler } from './cleaveHandler';

export const EFFECT_HANDLERS: Record<string, EffectHandler<any>> = {
  KNOCKBACK: knockbackHandler,
  RETREAT_STEP: retreatHandler,
  SLOW: modifierHandler,
  ARMOR_BUFF: modifierHandler,
  WARD_BUFF: modifierHandler,
  TELEPORT: teleportHandler,
  CLEAVE: cleaveHandler
};

export const defaultEffectRegistry = {
  register<T extends AbilityEffect>(type: T['type'] | string, handler: EffectHandler<T>): void {
    EFFECT_HANDLERS[type] = handler;
  },
  get(type: string): EffectHandler | undefined {
    return EFFECT_HANDLERS[type];
  }
};

/**
 * Dispatches secondary and support effects for an ability using the effect registry.
 */
export function executeAbilityEffects(
  ability: Ability,
  ctx: EffectContext,
  registry = defaultEffectRegistry
): EffectExecutionResult {
  if (!ability.effect) {
    return { events: [] };
  }

  // Damaging attacks require a solid hit or crit to apply secondary effects
  if (ability.damageType !== 'NONE') {
    if (ctx.hitOutcome === 'MISS') {
      return { events: [] };
    }
    if (ctx.hitOutcome === 'GRAZE') {
      return {
        events: [],
        logDetail: ' (Secondary effect negated on Graze)'
      };
    }
  }

  const handler = registry.get(ability.effect.type);
  if (!handler) {
    return { events: [] };
  }

  return handler.apply(ability.effect, ctx);
}
