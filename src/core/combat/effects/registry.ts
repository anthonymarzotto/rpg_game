import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { Ability, AbilityEffect } from '../../types/ability';
import { damageHandler } from './damageHandler';
import { knockbackHandler } from './knockbackHandler';
import { retreatHandler } from './retreatHandler';
import { modifierHandler } from './modifierHandler';
import { teleportHandler } from './teleportHandler';
import { cleaveHandler } from './cleaveHandler';
import { ctbDelayHandler } from './ctbDelayHandler';
import { conditionHandler } from './conditionHandler';
import { spellSculptHandler } from './spellSculptHandler';
import { initiativeBoostHandler } from './initiativeBoostHandler';
import { wildSurgeHandler } from './wildSurgeHandler';
import { penetrateHandler } from './penetrateHandler';
import { CombatEvent } from '../types';

export const EFFECT_HANDLERS: Record<string, EffectHandler<any>> = {
  DAMAGE: damageHandler,
  KNOCKBACK: knockbackHandler,
  RETREAT_STEP: retreatHandler,
  PENETRATE_STEP: penetrateHandler,
  SLOW: modifierHandler,
  ARMOR_BUFF: modifierHandler,
  WARD_BUFF: modifierHandler,
  STAT_MODIFIER: modifierHandler,
  TELEPORT: teleportHandler,
  CLEAVE: cleaveHandler,
  CTB_DELAY: ctbDelayHandler,
  INITIATIVE_BOOST: initiativeBoostHandler,
  CONDITION: conditionHandler,
  CONDITION_APPLIED: conditionHandler,
  FORCE_FACING: conditionHandler,
  SPELL_SCULPT: spellSculptHandler,
  WILD_SURGE: wildSurgeHandler
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
 * Dispatches atomic composable effects for an ability using the effect registry.
 * Respects effect targetScope and applyOn execution conditions.
 */
export function executeAbilityEffects(
  ability: Ability,
  ctx: EffectContext,
  registry = defaultEffectRegistry,
  filter?: (effect: AbilityEffect) => boolean
): EffectExecutionResult {
  if (!ability.effects || ability.effects.length === 0) {
    return { events: [] };
  }

  const allEvents: CombatEvent[] = [];
  const logDetails: string[] = [];
  let knockbackResult: any = undefined;
  let wallSlamDamage: number | undefined = undefined;

  for (const effect of ability.effects) {
    if (filter && !filter(effect)) {
      continue;
    }
    const applyOn = effect.applyOn ?? (
      effect.type === 'DAMAGE' ? 'HIT_OR_CRIT' :
      effect.targetScope === 'SELF' ? 'ALWAYS' : 'HIT_OR_CRIT'
    );

    // Outcome check
    if (applyOn === 'CRIT_ONLY' && ctx.hitOutcome !== 'CRITICAL_HIT') {
      continue;
    }
    if (applyOn === 'HIT_OR_CRIT' && ctx.hitOutcome === 'MISS') {
      continue;
    }
    // Graze rule: damage resolves with x0.5; secondary non-damage effects are negated on Graze
    if (ctx.hitOutcome === 'GRAZE' && effect.type !== 'DAMAGE' && applyOn !== 'ALWAYS') {
      logDetails.push(' (Secondary effect negated on Graze)');
      continue;
    }

    const handler = registry.get(effect.type);
    if (!handler) {
      continue;
    }

    // Determine target based on targetScope
    let effectTargetCu = ctx.targetCu;
    if (effect.targetScope === 'SELF' && effect.type !== 'RETREAT_STEP') {
      effectTargetCu = ctx.actorCu;
    }

    const effectCtx: EffectContext = {
      ...ctx,
      targetCu: effectTargetCu
    };

    const res = handler.apply(effect, effectCtx);
    if (res.events && res.events.length > 0) {
      allEvents.push(...res.events);
    }
    if (res.logDetail) {
      logDetails.push(res.logDetail);
    }
    if (res.knockbackResult) {
      knockbackResult = res.knockbackResult;
    }
    if (res.wallSlamDamage !== undefined) {
      wallSlamDamage = res.wallSlamDamage;
    }
  }

  return {
    events: allEvents,
    logDetail: logDetails.join(''),
    knockbackResult,
    wallSlamDamage
  };
}
