import { UnitProgression } from './class';
import { createInitialProgression } from '../progression/pyramid';
import {
  TriadAttributes,
  DerivedCombatVitals,
  BLANK_SLATE_ATTRIBUTES,
  computeDerivedVitals,
  BASE_VITAL_CONFIG
} from './stats';

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

/**
 * Creates a standard Level-0 recruit with uniform blank slate stats.
 */
export function createRecruit(id: string, name: string): Unit {
  const progression = createInitialProgression(id);
  const baseAttributes = { ...BLANK_SLATE_ATTRIBUTES };
  const effectiveVitals = computeDerivedVitals(baseAttributes, progression.currentLevel);

  return {
    id,
    name,
    progression,
    baseAttributes,
    effectiveVitals,
    currentHp: effectiveVitals.maxHp,
    currentAp: 0,
    initiativeGauge: 0,
    isDefeated: false
  };
}

/**
 * Calculates the new initiative gauge value when a unit ends their turn,
 * applying the 20 gauge points refund per unspent AP.
 */
export function calculateTurnResetGauge(unspentAp: number, overflow = 0): number {
  const safeUnspent = Math.max(0, Math.min(unspentAp, BASE_VITAL_CONFIG.STANDARD_AP));
  return Math.max(0, overflow + safeUnspent * BASE_VITAL_CONFIG.AP_RECOVERY_RATE);
}
