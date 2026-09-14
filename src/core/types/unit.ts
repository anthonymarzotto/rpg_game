import { UnitProgression } from './class';
import { TriadAttributes, DerivedCombatVitals } from './stats';

/**
 * Represents a complete combat unit under the two-tier architecture:
 * Tier 1: Immutable base progression and identity.
 * Tier 2: Dynamic in-battle combat state.
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

  // Dynamic In-Battle State
  /** Current health points */
  currentHp: number;
  /** Action points available this turn */
  currentAp: number;
  /** Real-time CTB clock gauge (0 to 100+) */
  initiativeGauge: number;
  /** Whether the unit has fallen in combat */
  isDefeated: boolean;
}
