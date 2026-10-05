import { Unit } from '../../core/types/unit';
import { Archetype } from '../../core/types/class';
import { LEVEL_XP_THRESHOLDS } from '../../core/config/balance';
import { MAX_LEVEL } from '../../core/progression/pyramid';
import { CLASSES_BY_ID } from '../../data/classes';

export interface LevelReadyStatus {
  readonly isReady: boolean;
  readonly qualifyingArchetypes: readonly Archetype[];
  readonly threshold: number;
  readonly isMaxLevel: boolean;
}

/**
 * Evaluates whether a hero currently has enough accumulated XP in any archetype to level up.
 */
export function checkHeroLevelReady(unit: Unit): LevelReadyStatus {
  const currentLevel = unit.progression.currentLevel;
  if (currentLevel >= MAX_LEVEL) {
    return {
      isReady: false,
      qualifyingArchetypes: [],
      threshold: 0,
      isMaxLevel: true
    };
  }

  const threshold = LEVEL_XP_THRESHOLDS[currentLevel] ?? 5;
  const xp = unit.progression.accumulatedXp ?? { fighter: 0, rogue: 0, mage: 0 };

  const qualifying: Archetype[] = [];
  if (xp.fighter >= threshold) qualifying.push('FIGHTER');
  if (xp.rogue >= threshold) qualifying.push('ROGUE');
  if (xp.mage >= threshold) qualifying.push('MAGE');

  return {
    isReady: qualifying.length > 0,
    qualifyingArchetypes: qualifying,
    threshold,
    isMaxLevel: false
  };
}

/**
 * Returns user-friendly archetype progress percentage.
 */
export function getArchetypeProgress(xp: number, threshold: number): number {
  if (threshold <= 0) return 0;
  return Math.min(100, Math.round((xp / threshold) * 100));
}

const ROMAN_NUMERALS: readonly string[] = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/**
 * Computes a dynamic hero display title appending their Wayfarer rank
 * (e.g. 'Warrior • Wayfarer I' through 'Wayfarer VI') when off-node milestones are reached.
 */
export function getHeroDisplayTitle(unit: Unit): string {
  const classId = unit.loadout.activeClassId;
  const classDef = CLASSES_BY_ID[classId.toLowerCase()];
  const className = classDef ? classDef.name : classId.charAt(0).toUpperCase() + classId.slice(1);
  const milestoneCount = unit.progression.offNodeMilestones?.length ?? 0;

  if (milestoneCount > 0) {
    const roman = ROMAN_NUMERALS[milestoneCount] ?? `${milestoneCount}`;
    return `${className} • Wayfarer ${roman}`;
  }

  return className;
}

