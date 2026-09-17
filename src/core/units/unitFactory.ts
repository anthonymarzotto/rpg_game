import { Unit, Faction } from '../types/unit';
import { BLANK_SLATE_ATTRIBUTES } from '../types/stats';
import { Ability } from '../types/ability';
import { createInitialProgression } from '../progression/pyramid';
import { computeDerivedVitals } from './vitals';

export interface CreateRecruitOptions {
  readonly abilities?: readonly Ability[];
  readonly abilityKitGenerator?: (rng?: () => number) => readonly Ability[];
  readonly rng?: () => number;
  readonly faction?: Faction;
}

/**
 * Creates a standard Level-0 recruit with uniform blank slate stats.
 * Equipped abilities are passed directly or generated via an injected kit generator.
 */
export function createRecruit(
  id: string,
  name: string,
  options?: CreateRecruitOptions
): Unit {
  const progression = createInitialProgression(id);
  const baseAttributes = { ...BLANK_SLATE_ATTRIBUTES };
  const effectiveVitals = computeDerivedVitals(baseAttributes, progression.currentLevel);
  const abilities =
    options?.abilities ??
    options?.abilityKitGenerator?.(options?.rng) ??
    [];

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
