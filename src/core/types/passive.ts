import { DerivedCombatVitals } from './stats';

/**
 * Trigger hook for passive traits. Kept minimal with 'ALWAYS' for now.
 * Can be expanded with conditional hooks (e.g. 'ON_HIT', 'ON_KILL') in future phases.
 */
export type PassiveTriggerHook = 'ALWAYS';

export interface PassiveTrait {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hook: PassiveTriggerHook;
  /** Flat modifications to derived combat vitals */
  readonly statModifiers?: Partial<DerivedCombatVitals>;
}
