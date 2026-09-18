/**
 * Balance configuration constants for recruit baselines, stat scaling, and action economy.
 * Separated from type definitions for maintainability and tuning.
 */

/**
 * Baseline vitals for a standard recruit.
 */
export const RECRUIT_BASE_VITALS = {
  hp: 20,
  speed: 10,
  move: 3,
  evasion: 10,
  resolve: 10
} as const;

/**
 * Scaling rates governing how attributes and levels enhance derived vitals.
 */
export const STAT_SCALING_RATES = {
  hpPerForce: 0,
  hpPerLevel: 5,
  speedPerFinesse: 2,
  moveFinesseDivisor: 3
} as const;

/**
 * Archetype XP required to unlock each progressive class tier.
 * Index 0 corresponds to Level 1 unlock (5 XP), index 1 to Level 2 (10 XP), etc.
 */
export const LEVEL_XP_THRESHOLDS: readonly number[] = [
  5, 10, 15, 20, 25, 30, 35, 40, 45
] as const;

/**
 * Parameters governing the Action Point (AP) economy and CTB clock.
 */
export const ACTION_ECONOMY_CONFIG = {
  standardApPerTurn: 3,
  gaugeRecoveryPerUnspentAp: 20,
  gaugeTurnThreshold: 100
} as const;

/**
 * Parameters governing grid displacement, elevation thresholds, and collision damage.
 */
export const DISPLACEMENT_CONFIG = {
  /** Base damage added to Attacker Force upon colliding with an obstacle or unit */
  wallSlamBaseDamage: 1,
  /** Colliding unit secondary impact damage */
  unitCollisionSecondaryDamage: 1,
  /** Maximum elevation difference traversable without climbing skills */
  maxJumpElevation: 1
} as const;

/**
 * Combat resolution thresholds, graze margin, and damage multipliers.
 */
export const COMBAT_RESOLUTION_CONFIG = {
  /** Beat target defense by 10+ points for a Critical Hit */
  critThresholdMargin: 10,
  /** Missing target defense within 5 points lands as a Graze */
  grazeMargin: 5,
  /** Damage percentage dealt on a Graze */
  grazeDamageMultiplier: 0.5,
  /** Minimum damage dealt on any hit or graze that connects */
  minimumDamage: 1,
  /** In-battle archetype XP awarded per executed tagged action */
  xpPerAction: 1
} as const;
