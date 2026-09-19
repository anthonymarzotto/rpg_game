import { Unit, Faction } from '../types/unit';
import { BLANK_SLATE_ATTRIBUTES } from '../types/stats';
import { UnitLoadout } from '../types/loadout';
import { createInitialProgression } from '../progression/pyramid';
import { computeDerivedVitals } from './vitals';
import { NOVICE_CLASS_ID } from './loadout';
import { rollNoviceStarterKit } from '../../data/packages/novice';

export interface CreateRecruitOptions {
  readonly starterAbilityIds?: readonly string[];
  readonly rng?: () => number;
  readonly faction?: Faction;
  readonly loadout?: UnitLoadout;
}

/**
 * Creates a standard Level-0 recruit with uniform blank slate stats.
 * Assigns 3 rolled starter abilities (1 Fighter, 1 Rogue, 1 Mage) and initializes default Novice loadout.
 */
export function createRecruit(
  id: string,
  name: string,
  options?: CreateRecruitOptions
): Unit {
  const progression = createInitialProgression(id);
  const baseAttributes = { ...BLANK_SLATE_ATTRIBUTES };
  const effectiveVitals = computeDerivedVitals(baseAttributes, progression.currentLevel);

  const starterAbilityIds =
    options?.starterAbilityIds ??
    rollNoviceStarterKit(options?.rng).map((a) => a.id);

  const loadout: UnitLoadout = options?.loadout ?? {
    activeClassId: NOVICE_CLASS_ID,
    wildcardAbilityIds: [],
    wildcardPassiveIds: []
  };

  return {
    id,
    name,
    faction: options?.faction,
    progression,
    baseAttributes,
    effectiveVitals,
    loadout,
    starterAbilityIds
  };
}
