import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { Ability, AbilityEffect } from '../../types/ability';
import { knockbackHandler } from './knockbackHandler';
import { retreatHandler } from './retreatHandler';
import { modifierHandler } from './modifierHandler';

class EffectRegistry {
  private handlers = new Map<AbilityEffect['type'], EffectHandler<any>>();

  constructor() {
    this.register('KNOCKBACK', knockbackHandler);
    this.register('RETREAT_STEP', retreatHandler);
    this.register('SLOW', modifierHandler);
    this.register('ARMOR_BUFF', modifierHandler);
    this.register('WARD_BUFF', modifierHandler);
  }

  public register<T extends AbilityEffect>(
    type: T['type'],
    handler: EffectHandler<T>
  ): void {
    this.handlers.set(type, handler);
  }

  public get(type: AbilityEffect['type']): EffectHandler | undefined {
    return this.handlers.get(type);
  }
}

export const defaultEffectRegistry = new EffectRegistry();

/**
 * Dispatches secondary and support effects for an ability using the effect registry.
 */
export function executeAbilityEffects(
  ability: Ability,
  ctx: EffectContext,
  registry: EffectRegistry = defaultEffectRegistry
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
