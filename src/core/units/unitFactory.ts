import { Unit, Faction } from '../types/unit';
import { BLANK_SLATE_ATTRIBUTES } from '../types/stats';
import { Ability } from '../types/ability';
import { createInitialProgression } from '../progression/pyramid';
import { computeDerivedVitals } from './vitals';
import { rollNoviceAbilityKit } from '../../data/abilities';

export interface CreateRecruitOptions {
  readonly abilities?: readonly Ability[];
  readonly rng?: () => number;
  readonly faction?: Faction;
}

/**
 * Creates a standard Level-0 recruit with uniform blank slate stats
 * and a tailored 3-archetype starter ability kit.
 */
export function createRecruit(
  id: string,
  name: string,
  options?: CreateRecruitOptions
): Unit {
  const progression = createInitialProgression(id);
  const baseAttributes = { ...BLANK_SLATE_ATTRIBUTES };
  const effectiveVitals = computeDerivedVitals(baseAttributes, progression.currentLevel);
  const abilities = options?.abilities ?? rollNoviceAbilityKit(options?.rng);

  return {
    id,
    name,
    faction: options?.faction,
    progression,
    baseAttributes,
    effectiveVitals,
    abilities
  };
}
