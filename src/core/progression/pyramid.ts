import { Archetype, ArchetypePoints, ClassDefinition, UnitProgression } from '../types/class';
import { CLASSES_BY_COORD } from '../../data/classes';

export const MAX_LEVEL = 9;
export const MAX_ARCHETYPE_POINTS = 5;

/**
 * Returns the string coordinate key formatted as 'fighter,rogue,mage'.
 */
export function toCoordKey(points: ArchetypePoints): string {
  return `${points.fighter},${points.rogue},${points.mage}`;
}

/**
 * Retrieves the class located at the exact coordinate, or null if off-node.
 */
export function getClassAtCoord(points: ArchetypePoints): ClassDefinition | null {
  return CLASSES_BY_COORD.get(toCoordKey(points)) ?? null;
}

/**
 * Strict lockout check: A class is locked out if its total required points
 * are lower than the unit's current level.
 */
export function isClassLockedOut(classDef: ClassDefinition, currentLevel: number): boolean {
  return classDef.totalPoints < currentLevel;
}

/**
 * Returns the class qualifying at target level with the given points, or null if off-node.
 */
export function getEligibleClassAtLevel(points: ArchetypePoints, targetLevel: number): ClassDefinition | null {
  const cls = getClassAtCoord(points);
  if (!cls) {
    return null;
  }
  return cls.totalPoints === targetLevel ? cls : null;
}

/**
 * Creates a blank slate Level 0 Novice unit progression.
 */
export function createInitialProgression(unitId: string): UnitProgression {
  return {
    unitId,
    currentLevel: 0,
    archetypePoints: {
      fighter: 0,
      rogue: 0,
      mage: 0
    },
    constellation: []
  };
}

/**
 * Advances a unit by 1 level in the designated archetype.
 * Updates level, points, and appends the unlocked class ID to the constellation.
 */
export function advanceArchetypeLevel(
  progression: UnitProgression,
  archetype: Archetype
): UnitProgression {
  if (progression.currentLevel >= MAX_LEVEL) {
    throw new Error(`Unit ${progression.unitId} has reached the maximum level cap of ${MAX_LEVEL}.`);
  }

  const currentPoints = progression.archetypePoints;
  const newPoints: ArchetypePoints = {
    fighter: archetype === 'FIGHTER' ? currentPoints.fighter + 1 : currentPoints.fighter,
    rogue: archetype === 'ROGUE' ? currentPoints.rogue + 1 : currentPoints.rogue,
    mage: archetype === 'MAGE' ? currentPoints.mage + 1 : currentPoints.mage
  };

  const invested = archetype === 'FIGHTER' ? newPoints.fighter : archetype === 'ROGUE' ? newPoints.rogue : newPoints.mage;
  if (invested > MAX_ARCHETYPE_POINTS) {
    throw new Error(`Cannot exceed max archetype cap of ${MAX_ARCHETYPE_POINTS} for ${archetype}.`);
  }

  const nextLevel = progression.currentLevel + 1;
  const eligibleClass = getEligibleClassAtLevel(newPoints, nextLevel);

  const newConstellation = eligibleClass
    ? [...progression.constellation, eligibleClass.id]
    : progression.constellation;

  return {
    unitId: progression.unitId,
    currentLevel: nextLevel,
    archetypePoints: newPoints,
    constellation: newConstellation
  };
}

/**
 * Advances a unit across multiple levels in sequential order.
 */
export function advanceMultipleLevels(
  progression: UnitProgression,
  archetypesInOrder: readonly Archetype[]
): UnitProgression {
  return archetypesInOrder.reduce<UnitProgression>((current, archetype) => {
    return advanceArchetypeLevel(current, archetype);
  }, progression);
}
