import { EffectHandler, EffectContext, EffectExecutionResult } from './types';
import { Ability, AbilityEffect } from '../../types/ability';
import { damageHandler } from './damageHandler';
import { knockbackHandler } from './knockbackHandler';
import { pullHandler } from './pullHandler';
import { retreatHandler } from './retreatHandler';
import { modifierHandler } from './modifierHandler';
import { teleportHandler } from './teleportHandler';
import { cleaveHandler } from './cleaveHandler';
import { ctbDelayHandler } from './ctbDelayHandler';
import { conditionHandler } from './conditionHandler';
import { cleanseHandler } from './cleanseHandler';
import { spellSculptHandler } from './spellSculptHandler';
import { initiativeBoostHandler } from './initiativeBoostHandler';
import { wildSurgeHandler } from './wildSurgeHandler';
import { penetrateHandler } from './penetrateHandler';
import { bloodFrenzyHandler } from './bloodFrenzyHandler';
import { positionSwapHandler } from './positionSwapHandler';
import { linePierceHandler } from './linePierceHandler';
import { CombatEvent, EffectOutcome } from '../types';
import {
  EFFECT_METADATA,
  getEffectMetadata,
  getEffectTiming,
  isSelfScopedEffect,
  isPrimaryTargetRelativeSelfEffect,
  isPrimaryTargetOnlyEffect,
  isResolutionEffect,
  resolveApplyOn
} from './metadata';

export {
  EFFECT_METADATA,
  getEffectMetadata,
  getEffectTiming,
  isSelfScopedEffect,
  isPrimaryTargetRelativeSelfEffect,
  isPrimaryTargetOnlyEffect,
  isResolutionEffect,
  resolveApplyOn
};
export type { EffectExecutionRole, EffectTypeMetadata } from './metadata';

export const EFFECT_HANDLERS: Record<string, EffectHandler<any>> = {
  DAMAGE: damageHandler,
  KNOCKBACK: knockbackHandler,
  PULL: pullHandler,
  RETREAT_STEP: retreatHandler,
  PENETRATE_STEP: penetrateHandler,
  POSITION_SWAP: positionSwapHandler,
  BASTION_STANCE: modifierHandler,
  SLOW: modifierHandler,
  ARMOR_BUFF: modifierHandler,
  WARD_BUFF: modifierHandler,
  STAT_MODIFIER: modifierHandler,
  TELEPORT: teleportHandler,
  CLEAVE: cleaveHandler,
  LINE_PIERCE: linePierceHandler,
  CTB_DELAY: ctbDelayHandler,
  INITIATIVE_BOOST: initiativeBoostHandler,
  CONDITION: conditionHandler,
  CONDITION_APPLIED: conditionHandler,
  CLEANSE: cleanseHandler,
  FORCE_FACING: conditionHandler,
  FORCE_FACING_AWAY: conditionHandler,
  SPELL_SCULPT: spellSculptHandler,
  WILD_SURGE: wildSurgeHandler,
  BLOOD_FRENZY: bloodFrenzyHandler
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
 * Returns true when an effect should be dispatched through `executeAbilityEffects`:
 * either its metadata role is `'RESOLUTION'` or a custom handler was dynamically
 * registered for a `'ROLL_MODIFIER'` effect type.
 */
export function isDispatchableEffect(
  effect: AbilityEffect,
  registry = defaultEffectRegistry
): boolean {
  const role = getEffectMetadata(effect.type).role;
  return role === 'RESOLUTION' || (role === 'ROLL_MODIFIER' && Boolean(registry.get(effect.type)));
}

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
  const effects: EffectOutcome[] = [];
  let grazeNegatedRecorded = false;
  let knockbackResult: any = undefined;
  let wallSlamDamage: number | undefined = undefined;
  let fallDamage: number | undefined = undefined;

  for (const effect of ability.effects) {
    if (filter && !filter(effect)) {
      continue;
    }
    const applyOn = resolveApplyOn(effect);

    // Outcome check
    if (applyOn === 'CRIT_ONLY' && ctx.hitOutcome !== 'CRITICAL_HIT') {
      continue;
    }
    if (applyOn === 'HIT_ONLY' && ctx.hitOutcome !== 'SOLID_HIT') {
      continue;
    }
    if (applyOn === 'GRAZE_ONLY') {
      if (ctx.hitOutcome !== 'GRAZE') {
        continue;
      }
    } else {
      if (applyOn === 'HIT_OR_CRIT' && ctx.hitOutcome === 'MISS') {
        continue;
      }
      // Graze rule: damage resolves with x0.5; secondary non-damage effects are negated on Graze
      if (ctx.hitOutcome === 'GRAZE' && effect.type !== 'DAMAGE' && applyOn !== 'ALWAYS') {
        const hasDedicatedGrazeEffect = ability.effects.some((e) => e.applyOn === 'GRAZE_ONLY');
        if (!grazeNegatedRecorded && !hasDedicatedGrazeEffect) {
          effects.push({
            kind: 'CONTEXT',
            context: 'GRAZE_NEGATED',
            label: 'Graze: Secondary Negated',
            detail: 'Secondary effect(s) negated due to Graze hit outcome'
          });
          grazeNegatedRecorded = true;
        }
        continue;
      }
    }

    const handler = registry.get(effect.type);
    if (!handler) {
      continue;
    }

    // Determine target based on targetScope (preserving primary target for primaryTargetRelativeSelf effects)
    let effectTargetCu = ctx.targetCu;
    if (isSelfScopedEffect(effect)) {
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
    if (res.effects && res.effects.length > 0) {
      effects.push(...res.effects);
    }
    if (res.knockbackResult) {
      knockbackResult = res.knockbackResult;
    }
    if (res.wallSlamDamage !== undefined) {
      wallSlamDamage = res.wallSlamDamage;
    }
    if (res.fallDamage !== undefined) {
      fallDamage = res.fallDamage;
    }
  }

  return {
    events: allEvents,
    ...(effects.length > 0 ? { effects } : {}),
    knockbackResult,
    wallSlamDamage,
    fallDamage
  };
}
