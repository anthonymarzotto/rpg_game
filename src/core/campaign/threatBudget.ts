import { Unit } from '../types/unit';

/**
 * Base threat point value assigned to a Level-0 Novice recruit.
 */
export const BASE_RECRUIT_THREAT = 10;

/**
 * Additional threat points scaled per character level.
 */
export const THREAT_PER_LEVEL = 15;

/**
 * Stage multiplier increment (10% increase per stage beyond Stage 1).
 */
export const STAGE_THREAT_SCALING_RATE = 0.1;

/**
 * Computes an individual unit's threat value based on their level and progression.
 */
export function computeUnitThreat(unit: Unit): number {
  const level = unit.progression.currentLevel;
  if (level <= 0) {
    return BASE_RECRUIT_THREAT;
  }
  return BASE_RECRUIT_THREAT + level * THREAT_PER_LEVEL;
}

/**
 * Computes the aggregate threat rating for an active player combat squad.
 */
export function computeSquadThreat(squad: readonly Unit[]): number {
  return squad.reduce((total, unit) => total + computeUnitThreat(unit), 0);
}

/**
 * Computes the target encounter threat budget calibrated to squad strength and stage index.
 */
export function computeStageThreatBudget(squadThreat: number, stage: number): number {
  const safeStage = Math.max(1, stage);
  const multiplier = 1.0 + (safeStage - 1) * STAGE_THREAT_SCALING_RATE;
  return Math.round(squadThreat * multiplier);
}
