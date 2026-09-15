import { UnitProgression } from './class';
import { TriadAttributes, DerivedCombatVitals } from './stats';
import { Ability } from './ability';

/**
 * Complete character entity comprising progression, permanent attributes,
 * derived vitals, and equipped abilities.
 */
export interface Unit {
  /** Unique unit identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Progression record along the 100-class pyramid */
  readonly progression: UnitProgression;
  /** Permanent Triad attributes */
  readonly baseAttributes: TriadAttributes;
  /** Computed combat vitals derived from attributes, level, and gear */
  readonly effectiveVitals: DerivedCombatVitals;
  /** Equipped actions and abilities available in combat */
  readonly abilities: readonly Ability[];
}

