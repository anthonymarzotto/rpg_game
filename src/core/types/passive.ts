import { DerivedCombatVitals } from './stats';

/**
 * Trigger hook for passive traits. Kept minimal with 'ALWAYS' for now.
 * Can be expanded with conditional hooks (e.g. 'ON_HIT', 'ON_KILL') in future phases.
 */
export type PassiveTriggerHook = 'ALWAYS';

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

export interface PassiveTrait {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hook: PassiveTriggerHook;
  /** Flat modifications to derived combat vitals */
  readonly statModifiers?: Partial<DerivedCombatVitals>;
  /** Conditional roll modifiers (e.g. Momentum granting Advantage) */
  readonly rollModifier?: PassiveRollModifier;
}
