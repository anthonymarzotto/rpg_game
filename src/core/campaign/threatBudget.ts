import { Unit } from '../types/unit';
import { LEVEL_XP_THRESHOLDS } from '../config/balance';
import { MAX_LEVEL } from '../progression/pyramid';

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
 * Canonical Vanguard deployment point budgets by campaign stage.
 * Novice = 10 pts, Tier 1 = 25 pts, Tier 2 = 40 pts, Tier 3 = 55 pts, Tier 4 = 70 pts.
 */
export const STAGE_DEPLOYMENT_BUDGETS: Readonly<Record<number, number>> = {
  1: 30,
  2: 80,
  3: 120,
  4: 160,
  5: 200
};

/**
 * Returns the maximum deployment threat points allowed for the player's active vanguard for a given stage.
 */
export function getStageDeploymentBudget(stage: number): number {
  const safeStage = Math.max(1, stage);
  if (safeStage in STAGE_DEPLOYMENT_BUDGETS) {
    return STAGE_DEPLOYMENT_BUDGETS[safeStage];
  }
  return 200 + (safeStage - 5) * 20;
}


/**
 * Evaluates whether a unit qualifies for a single-step level ascension based on accumulated XP.
 */
export function computeProjectedLevel(unit: Unit): number {
  const currentLevel = unit.progression.currentLevel;
  if (currentLevel >= MAX_LEVEL) {
    return currentLevel;
  }
  const threshold = LEVEL_XP_THRESHOLDS[currentLevel] ?? 5;
  const xp = unit.progression.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };
  const canAscend =
    xp.fighter >= threshold || xp.rogue >= threshold || xp.mage >= threshold;
  return canAscend ? currentLevel + 1 : currentLevel;
}

/**
 * Computes an individual unit's threat value including pre-ascension projection (+1 level if threshold met).
 */
export function computeProjectedUnitThreat(unit: Unit): number {
  const projLevel = computeProjectedLevel(unit);
  if (projLevel <= 0) {
    return BASE_RECRUIT_THREAT;
  }
  return BASE_RECRUIT_THREAT + projLevel * THREAT_PER_LEVEL;
}

/**
 * Computes the aggregate threat rating for a squad using pre-ascension projected levels.
 */
export function computeProjectedSquadThreat(squad: readonly Unit[]): number {
  return squad.reduce((total, unit) => total + computeProjectedUnitThreat(unit), 0);
}

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

