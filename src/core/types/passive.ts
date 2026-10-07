import { DerivedCombatVitals } from './stats';
import { AbilityEffect, DamageType } from './ability';

/**
 * Trigger hook for passive traits. Kept minimal with 'ALWAYS' for now.
 * Can be expanded with conditional hooks (e.g. 'ON_HIT', 'ON_KILL') in future phases.
 */
export type PassiveTriggerHook = 'ALWAYS' | 'BATTLE_START' | 'ON_MOVE' | 'ON_CRIT' | 'ON_HIT';

/**
 * Tactical conditions that can trigger passive roll modifiers during combat.
 */
export type PassiveCondition =
  | { readonly type: 'MOVED_MIN_DISTANCE'; readonly minHexes: number };

/**
 * Modifications applied to d20 attack rolls when a passive condition is met.
 */
export interface PassiveRollEffect {
  readonly grantsAdvantage?: boolean;
  /** Whether the effect is consumed on the first attack roll or persists */
  readonly consumeOnTrigger?: boolean;
}

export interface PassiveRollModifier {
  readonly condition: PassiveCondition;
  readonly effect: PassiveRollEffect;
}

export interface HealthThresholdEffect {
  /** Maximum HP percentage (0..1) below which this threshold is active (e.g. 0.5 for <= 50% max HP) */
  readonly maxPercent: number;
  /** Flat bonus damage added to attacks when threshold is active */
  readonly flatDamageBonus?: number;
  /** Natural d20 critical hit threshold when active (e.g. 19 for crits on 19-20) */
  readonly critThreshold?: number;
  /** Optional filter constraint for damage type (e.g. only PHYSICAL attacks) */
  readonly damageTypeFilter?: DamageType;
}

export interface TargetArmorBonusEffect {
  /** Minimum target effective armor required to activate the bonus (e.g. 1) */
  readonly minArmor: number;
  /** Flat bonus damage added to attacks when target meets armor threshold */
  readonly flatDamageBonus: number;
  /** Optional filter constraint for damage type (e.g. only PHYSICAL attacks) */
  readonly damageTypeFilter?: DamageType;
}

export interface PassiveTrait {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hook: PassiveTriggerHook;
  /** Flat modifications to derived combat vitals */
  readonly statModifiers?: Partial<DerivedCombatVitals>;
  /** Conditional roll modifiers (e.g. Momentum granting Advantage) */
  readonly rollModifier?: PassiveRollModifier;
  /** Flat collision and wall-slam damage bonus applied when this unit causes a collision */
  readonly collisionDamageBonus?: number;
  /** Pluggable effect payload executed when the trigger hook fires */
  readonly effect?: AbilityEffect;
  /** Conditional modifiers active when unit HP is at or below a certain threshold */
  readonly healthThreshold?: HealthThresholdEffect;
  /** Conditional damage bonus active when target effective armor meets threshold */
  readonly targetArmorBonus?: TargetArmorBonusEffect;
  /** Optional filter constraint for trigger (e.g. only on MAGICAL critical hits) */
  readonly triggerFilter?: {
    readonly damageType?: DamageType;
  };
}
