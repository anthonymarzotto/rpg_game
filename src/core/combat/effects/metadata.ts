import {
  AbilityEffect,
  AbilityEffectType,
  EffectApplyCondition,
  EffectTiming
} from '../../types/ability';

export type EffectExecutionRole =
  | 'PRIMARY_DAMAGE'
  | 'ROLL_MODIFIER'
  | 'PRE_ROLL_MOVE'
  | 'GEOMETRIC_SPECIAL'
  | 'ZONE_DEPLOY'
  | 'RESOLUTION';

export interface EffectTypeMetadata {
  readonly defaultTiming: EffectTiming;
  readonly role: EffectExecutionRole;
  /**
   * True when an effect moves/affects the actor relative to the primary target coordinate
   * (e.g. RETREAT_STEP), so it must execute once against the primary target rather than
   * as an independent self-buff or per splash hit.
   */
  readonly primaryTargetRelativeSelf?: boolean;
  /**
   * True when an effect acts relative to the primary target hex (targeting the actor or
   * bystander units, e.g. RETREAT_STEP, PENETRATE_STEP, CLEAVE, LINE_PIERCE) so it runs
   * at most once on the primary target (even if primary damage was lethal) and never repeats
   * per splash hit.
   */
  readonly primaryTargetOnly?: boolean;
  /**
   * False when an ability composed of this effect cannot deliver target-scoped ON_RESOLVE
   * hostile infusions (e.g. TELEPORT, SHRAPNEL_RUBBLE). Defaults to true when omitted.
   */
  readonly deliversTargetEffects?: boolean;
}

export const EFFECT_METADATA: Record<AbilityEffectType, EffectTypeMetadata> = {
  DAMAGE: { defaultTiming: 'ON_RESOLVE', role: 'PRIMARY_DAMAGE' },
  KNOCKBACK: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  PULL: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  RETREAT_STEP: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION', primaryTargetRelativeSelf: true, primaryTargetOnly: true },
  ARMOR_BUFF: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  WARD_BUFF: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  SLOW: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  CRIT_BOOST: { defaultTiming: 'ON_RESOLVE', role: 'ROLL_MODIFIER' },
  TELEPORT: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION', deliversTargetEffects: false },
  CLEAVE: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION', primaryTargetOnly: true },
  CTB_DELAY: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  INITIATIVE_BOOST: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  FORCE_FACING: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  FORCE_FACING_AWAY: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  CONDITION: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  CLEANSE: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  SPELL_SCULPT: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  WILD_SURGE: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  STAT_MODIFIER: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  RUSH_CHARGE: { defaultTiming: 'PRE_ACTION', role: 'PRE_ROLL_MOVE' },
  PENETRATE_STEP: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION', primaryTargetOnly: true },
  BLOOD_FRENZY: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  POSITION_SWAP: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  BASTION_STANCE: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION' },
  AERIAL_VAULT: { defaultTiming: 'PRE_ACTION', role: 'PRE_ROLL_MOVE' },
  LINE_PIERCE: { defaultTiming: 'ON_RESOLVE', role: 'RESOLUTION', primaryTargetOnly: true },
  DELAYED_BOMBARDMENT: { defaultTiming: 'ON_RESOLVE', role: 'ZONE_DEPLOY' },
  SHRAPNEL_RUBBLE: { defaultTiming: 'ON_RESOLVE', role: 'ZONE_DEPLOY', deliversTargetEffects: false },
  ALLY_REFRACTION: { defaultTiming: 'ON_RESOLVE', role: 'GEOMETRIC_SPECIAL' },
  DISTRIBUTIVE_PROOF: { defaultTiming: 'ON_RESOLVE', role: 'GEOMETRIC_SPECIAL' }
};

const DEFAULT_EFFECT_METADATA: EffectTypeMetadata = {
  defaultTiming: 'ON_RESOLVE',
  role: 'RESOLUTION'
};

/**
 * Looks up declarative metadata for an effect type, falling back to standard ON_RESOLVE
 * RESOLUTION semantics for dynamically registered custom effect types.
 */
export function getEffectMetadata(type: AbilityEffectType | string): EffectTypeMetadata {
  return (EFFECT_METADATA as Record<string, EffectTypeMetadata | undefined>)[type] ?? DEFAULT_EFFECT_METADATA;
}

/**
 * Resolves the execution lifecycle phase of an effect, honoring explicit `effect.timing`
 * before falling back to the effect type's declared default timing.
 */
export function getEffectTiming(effect: AbilityEffect): EffectTiming {
  return effect.timing ?? getEffectMetadata(effect.type).defaultTiming;
}

/**
 * Returns true if the effect targets the actor independently of enemy targets (so it runs
 * at most once per action with `targetCu: actorCu`). Excludes primary-target-relative
 * self displacements like `RETREAT_STEP`.
 */
export function isSelfScopedEffect(effect: AbilityEffect): boolean {
  return effect.targetScope === 'SELF' && !getEffectMetadata(effect.type).primaryTargetRelativeSelf;
}

/**
 * Returns true when the effect displaces or affects the actor relative to the primary
 * target coordinate (e.g. `RETREAT_STEP`), meaning it runs once for the primary target only.
 */
export function isPrimaryTargetRelativeSelfEffect(effect: AbilityEffect): boolean {
  return Boolean(getEffectMetadata(effect.type).primaryTargetRelativeSelf);
}

/**
 * Returns true when the effect acts relative to the primary target hex (actor movement or
 * primary-relative sweep/pierce) and therefore runs at most once on the primary target.
 */
export function isPrimaryTargetOnlyEffect(effect: AbilityEffect): boolean {
  return Boolean(getEffectMetadata(effect.type).primaryTargetOnly);
}

/**
 * Returns true when the effect is dispatched through the standard effect handler registry.
 */
export function isResolutionEffect(effect: AbilityEffect): boolean {
  return getEffectMetadata(effect.type).role === 'RESOLUTION';
}

/**
 * Single source of truth for resolving an effect's trigger condition (`applyOn`).
 */
export function resolveApplyOn(effect: AbilityEffect): EffectApplyCondition {
  if (effect.applyOn) {
    return effect.applyOn;
  }
  if (effect.type === 'DAMAGE') {
    return 'HIT_OR_CRIT';
  }
  return effect.targetScope === 'SELF' ? 'ALWAYS' : 'HIT_OR_CRIT';
}
