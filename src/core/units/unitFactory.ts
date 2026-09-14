import { Unit } from '../types/unit';
import { BLANK_SLATE_ATTRIBUTES } from '../types/stats';
import { createInitialProgression } from '../progression/pyramid';
import { computeDerivedVitals } from './vitals';

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
