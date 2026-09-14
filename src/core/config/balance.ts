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
  hpPerForce: 5,
  hpPerLevel: 2,
  speedPerFinesse: 2,
  moveFinesseDivisor: 3
} as const;

/**
 * Parameters governing the Action Point (AP) economy and CTB clock.
 */
export const ACTION_ECONOMY_CONFIG = {
  standardApPerTurn: 3,
  gaugeRecoveryPerUnspentAp: 20,
  gaugeTurnThreshold: 100
} as const;
