import { Archetype, ArchetypePoints, ClassDefinition, UnitProgression } from '../types/class';
import { ClassRegistry, toCoordKey } from './registry';

export { toCoordKey, type ClassRegistry };

export const MAX_LEVEL = 9;
export const MAX_ARCHETYPE_POINTS = 5;



/**
 * Strict lockout check: A class is locked out if:
 * 1. Its total required points are lower than the unit's current level (or equal if not unlocked and past level 0), OR
 * 2. Any of its archetype requirements are lower than the unit's currently accumulated points
 *    in that archetype (since archetype points are additive and cannot be refunded).
 */
export function isClassLockedOut(
  classDef: ClassDefinition,
  currentLevel: number,
  currentPoints?: ArchetypePoints,
  isUnlocked = false
): boolean {
  if (isUnlocked) {
    return false;
  }
  // Total points check: cannot reach classes of lower tier
  if (classDef.totalPoints < currentLevel) {
    return true;
  }
  // If current archetype points are provided:
  if (currentPoints) {
    // Current tier classes that were not selected/unlocked are locked out
    if (classDef.totalPoints === currentLevel && currentLevel > 0) {
      return true;
    }
    // Any class requiring fewer points in an archetype than already invested is unreachable
    if (
      classDef.requirements.fighter < currentPoints.fighter ||
      classDef.requirements.rogue < currentPoints.rogue ||
      classDef.requirements.mage < currentPoints.mage
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Checks whether a class can be unlocked at the immediate next level (currentLevel + 1)
 * from the unit's currently accumulated archetype points.
 */
export function isClassEligibleNextLevel(
  classDef: ClassDefinition,
  currentLevel: number,
  currentPoints: ArchetypePoints,
  isUnlocked = false
): boolean {
  if (isUnlocked) {
    return false;
  }
  if (classDef.totalPoints !== currentLevel + 1) {
    return false;
  }
  return (
    classDef.requirements.fighter >= currentPoints.fighter &&
    classDef.requirements.rogue >= currentPoints.rogue &&
    classDef.requirements.mage >= currentPoints.mage
  );
}

/**
 * Returns the class qualifying at target level with the given points, or null if off-node.
 */
export function getEligibleClassAtLevel(
  points: ArchetypePoints,
  targetLevel: number,
  registry: ClassRegistry
): ClassDefinition | null {
  const cls = registry.getClassAtCoord(points);
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
    constellation: [],
    accumulatedXp: {
      fighter: 0,
      rogue: 0,
      mage: 0
    }
  };
}

/**
 * Advances a unit by 1 level in the designated archetype.
 * Updates level, points, and appends the unlocked class ID to the constellation.
 */
export function advanceArchetypeLevel(
  progression: UnitProgression,
  archetype: Archetype,
  registry: ClassRegistry
): UnitProgression {
  if (progression.currentLevel >= MAX_LEVEL) {
    throw new Error(`Unit ${progression.unitId} has reached the maximum level cap of ${MAX_LEVEL}.`);
  }

  const currentPoints = progression.archetypePoints;
  const key = archetype.toLowerCase() as keyof ArchetypePoints;
  const newPoints: ArchetypePoints = {
    ...currentPoints,
    [key]: currentPoints[key] + 1
  };

  if (newPoints[key] > MAX_ARCHETYPE_POINTS) {
    throw new Error(`Cannot exceed max archetype cap of ${MAX_ARCHETYPE_POINTS} for ${archetype}.`);
  }

  const nextLevel = progression.currentLevel + 1;
  const eligibleClass = getEligibleClassAtLevel(newPoints, nextLevel, registry);

  const newConstellation = eligibleClass
    ? [...progression.constellation, eligibleClass.id]
    : progression.constellation;

  return {
    unitId: progression.unitId,
    currentLevel: nextLevel,
    archetypePoints: newPoints,
    constellation: newConstellation,
    accumulatedXp: progression.accumulatedXp
  };
}

/**
 * Advances a unit across multiple levels in sequential order.
 */
export function advanceMultipleLevels(
  progression: UnitProgression,
  archetypesInOrder: readonly Archetype[],
  registry: ClassRegistry
): UnitProgression {
  return archetypesInOrder.reduce<UnitProgression>((current, archetype) => {
    return advanceArchetypeLevel(current, archetype, registry);
  }, progression);
}
